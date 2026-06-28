import { createCalendarEvent, updateCalendarEvent } from "./calendar-service";
import { logger } from "./logger";
import { syncContestsToDatabase } from "./contest-fetcher";
import { CalendarEvent } from "@/models/CalendarEvent";
import { Contest } from "@/models/Contest";
import { User } from "@/models/User";

export async function syncUserCalendar(userId: string, options?: { fetchContests?: boolean }) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (options?.fetchContests) {
    await syncContestsToDatabase();
  }

  if (user.selectedPlatforms.length === 0) {
    return { synced: 0, updated: 0, failed: 0 };
  }

  const now = new Date();
  const contests = await Contest.find({
    platform: { $in: user.selectedPlatforms },
    startTime: { $gt: now },
  }).sort({ startTime: 1 });

  let synced = 0;
  let updated = 0;
  let failed = 0;

  for (const contest of contests) {
    const existing = await CalendarEvent.findOne({
      userId: user._id,
      contestId: contest.contestId,
    });

    try {
      if (existing) {
        await updateCalendarEvent(user, contest, existing.googleEventId);
        existing.status = "updated";
        await existing.save();
        updated += 1;
        continue;
      }

      const googleEventId = await createCalendarEvent(user, contest);
      await CalendarEvent.create({
        userId: user._id,
        contestId: contest.contestId,
        googleEventId,
        status: "synced",
      });
      synced += 1;
    } catch (error) {
      failed += 1;
      logger.error({
        event: "calendar_sync_failed",
        userId: user._id.toString(),
        contestId: contest.contestId,
        error: error instanceof Error ? error.message : "unknown",
      });

      if (existing) {
        existing.status = "failed";
        await existing.save();
      }
    }
  }

  logger.info({
    event: "calendar_sync_completed",
    userId: user._id.toString(),
    synced,
    updated,
    failed,
  });

  return { synced, updated, failed };
}

export async function syncAllUsersCalendars() {
  logger.info({ event: "cron_calendar_sync_started" });

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
