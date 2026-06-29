import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "./calendar-service";
import { syncContestsForPlatforms, syncContestsToDatabase } from "./contest-fetcher";
import { logger } from "./logger";
import { CalendarEvent } from "@/models/CalendarEvent";
import { Contest } from "@/models/Contest";
import { User, type UserDocument } from "@/models/User";
import type { Platform } from "@/types";

export interface SyncResult {
  synced: number;
  removed: number;
  updated: number;
  failed: number;
}

async function createCalendarEventsForPlatforms(
  user: UserDocument,
  platforms: Platform[],
): Promise<Pick<SyncResult, "synced" | "failed">> {
  const now = new Date();
  const contests = await Contest.find({
    platform: { $in: platforms },
    startTime: { $gt: now },
  });

  const results = await Promise.allSettled(
    contests.map(async (contest) => {
      const existing = await CalendarEvent.findOne({
        userId: user._id,
        contestId: contest.contestId,
      });
      if (existing) return "skipped" as const;

      const googleEventId = await createCalendarEvent(user, contest);
      await CalendarEvent.create({
        userId: user._id,
        contestId: contest.contestId,
        googleEventId,
        status: "synced",
      });
      return "synced" as const;
    }),
  );

  const synced = results.filter((r) => r.status === "fulfilled" && r.value === "synced").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return { synced, failed };
}

async function removeCalendarEventsForPlatforms(
  user: UserDocument,
  platforms: Platform[],
): Promise<Pick<SyncResult, "removed" | "failed">> {
  const now = new Date();
  const calendarEvents = await CalendarEvent.find({ userId: user._id });
  if (calendarEvents.length === 0) {
    return { removed: 0, failed: 0 };
  }

  const contests = await Contest.find({
    contestId: { $in: calendarEvents.map((e) => e.contestId) },
    platform: { $in: platforms },
    startTime: { $gt: now },
  });

  const contestsById = new Map(contests.map((c) => [c.contestId, c]));
  const eventsToRemove = calendarEvents.filter((e) => contestsById.has(e.contestId));

  const results = await Promise.allSettled(
    eventsToRemove.map(async (entry) => {
      await deleteCalendarEvent(user, entry.googleEventId);
      await CalendarEvent.deleteOne({ _id: entry._id });
      return "removed" as const;
    }),
  );

  const removed = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return { removed, failed };
}

async function cleanupCalendarEvents(
  user: UserDocument,
): Promise<Pick<SyncResult, "removed" | "failed">> {
  const now = new Date();
  const calendarEvents = await CalendarEvent.find({ userId: user._id });
  if (calendarEvents.length === 0) {
    return { removed: 0, failed: 0 };
  }

  // Find future contests for the user's enabled platforms
  const futureContests = await Contest.find({
    platform: { $in: user.selectedPlatforms },
    startTime: { $gt: now },
  });
  const futureContestIds = new Set(futureContests.map((c) => c.contestId));

  // Any event that doesn't correspond to a future contest gets removed
  const eventsToRemove = calendarEvents.filter((e) => !futureContestIds.has(e.contestId));

  const results = await Promise.allSettled(
    eventsToRemove.map(async (entry) => {
      try {
        await deleteCalendarEvent(user, entry.googleEventId);
      } catch (err) {
        // Ignore errors if already deleted externally
      }
      await CalendarEvent.deleteOne({ _id: entry._id });
      return "removed" as const;
    }),
  );

  const removed = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return { removed, failed };
}


async function updateCalendarEventsForPlatforms(
  user: UserDocument,
  platforms: Platform[],
): Promise<Pick<SyncResult, "updated" | "failed">> {
  const now = new Date();
  const contests = await Contest.find({
    platform: { $in: platforms },
    startTime: { $gt: now },
  });

  const results = await Promise.allSettled(
    contests.map(async (contest) => {
      const existing = await CalendarEvent.findOne({
        userId: user._id,
        contestId: contest.contestId,
      });
      if (!existing) return "skipped" as const;

      await updateCalendarEvent(user, contest, existing.googleEventId);
      existing.status = "updated";
      await existing.save();
      return "updated" as const;
    }),
  );

  const updated = results.filter((r) => r.status === "fulfilled" && r.value === "updated").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return { updated, failed };
}

export async function handlePlatformChanges(
  user: UserDocument,
  previousPlatforms: Platform[],
  nextPlatforms: Platform[],
): Promise<SyncResult> {
  const added = nextPlatforms.filter((p) => !previousPlatforms.includes(p));
  const removed = previousPlatforms.filter((p) => !nextPlatforms.includes(p));

  const result: SyncResult = { synced: 0, removed: 0, updated: 0, failed: 0 };

  if (added.length > 0) {
    await syncContestsForPlatforms(added);
    const created = await createCalendarEventsForPlatforms(user, added);
    result.synced += created.synced;
    result.failed += created.failed;
  }

  if (removed.length > 0) {
    const removedEvents = await removeCalendarEventsForPlatforms(user, removed);
    result.removed += removedEvents.removed;
    result.failed += removedEvents.failed;
  }

  logger.info({
    event: "platform_change_sync_completed",
    userId: user._id.toString(),
    added,
    removed,
    ...result,
  });

  return result;
}

export async function handleReminderChange(user: UserDocument): Promise<SyncResult> {
  if (user.selectedPlatforms.length === 0) {
    return { synced: 0, removed: 0, updated: 0, failed: 0 };
  }

  const updated = await updateCalendarEventsForPlatforms(user, user.selectedPlatforms);

  logger.info({
    event: "reminder_change_sync_completed",
    userId: user._id.toString(),
    ...updated,
  });

  return { synced: 0, removed: 0, updated: updated.updated, failed: updated.failed };
}

export async function syncUserCalendar(userId: string, options?: { fetchContests?: boolean }) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (options?.fetchContests) {
    await syncContestsToDatabase();
  }

  if (user.selectedPlatforms.length === 0) {
    return { synced: 0, updated: 0, failed: 0, removed: 0 };
  }

  await syncContestsForPlatforms(user.selectedPlatforms);
  const created = await createCalendarEventsForPlatforms(user, user.selectedPlatforms);
  const cleaned = await cleanupCalendarEvents(user);

  return {
    synced: created.synced,
    updated: 0,
    failed: created.failed + cleaned.failed,
    removed: cleaned.removed,
  };
}

export async function syncAllUsersCalendars() {
  logger.info({ event: "cron_calendar_sync_started" });

  await syncContestsToDatabase();
  const users = await User.find({});
  for (const user of users) {
    try {
      await syncUserCalendar(user._id.toString());
    } catch (error) {
      logger.error({
        event: "user_calendar_sync_failed",
        userId: user._id.toString(),
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  logger.info({ event: "cron_calendar_sync_completed", users: users.length });
}
