import type { calendar_v3 } from "googleapis";

import { logger } from "./logger";
import { getAuthenticatedCalendarClient } from "./auth";
import type { UserDocument } from "@/models/User";
import type { ContestDocument } from "@/models/Contest";
import type { Platform } from "@/types";

function formatPlatform(platform: Platform) {
  const labels: Record<Platform, string> = {
    leetcode: "LeetCode",
    codeforces: "Codeforces",
    codechef: "CodeChef",
    atcoder: "AtCoder",
  };
  return labels[platform];
}

function buildEventBody(
  contest: ContestDocument,
  reminderMinutes: number,
): calendar_v3.Schema$Event {
  const durationMin = Math.round(
    (contest.endTime.getTime() - contest.startTime.getTime()) / 60_000,
  );

  return {
    summary: `${formatPlatform(contest.platform as Platform)} - ${contest.title}`,
    description: [
      `Contest URL: ${contest.url}`,
      `Platform: ${formatPlatform(contest.platform as Platform)}`,
      `Duration: ${durationMin} minutes`,
    ].join("\n"),
    start: { dateTime: contest.startTime.toISOString() },
    end: { dateTime: contest.endTime.toISOString() },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: reminderMinutes }],
    },
  };
}

export async function createCalendarEvent(
  user: UserDocument,
  contest: ContestDocument,
) {
  const calendar = await getAuthenticatedCalendarClient(user);
  const body = buildEventBody(contest, user.reminderMinutes);

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    requestBody: body,
  });

  if (!data.id) {
    throw new Error("Google Calendar did not return an event id");
  }

  logger.info({
    event: "calendar_event_created",
    userId: user._id.toString(),
    contestId: contest.contestId,
    googleEventId: data.id,
  });

  return data.id;
}

export async function updateCalendarEvent(
  user: UserDocument,
  contest: ContestDocument,
  googleEventId: string,
) {
  const calendar = await getAuthenticatedCalendarClient(user);
  const body = buildEventBody(contest, user.reminderMinutes);

  await calendar.events.update({
    calendarId: "primary",
    eventId: googleEventId,
    requestBody: body,
  });

  logger.info({
    event: "calendar_event_updated",
    userId: user._id.toString(),
    contestId: contest.contestId,
    googleEventId,
  });
}

export async function deleteCalendarEvent(user: UserDocument, googleEventId: string) {
  const calendar = await getAuthenticatedCalendarClient(user);

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("404") && !message.includes("Not Found")) {
      throw error;
    }
  }

  logger.info({
    event: "calendar_event_deleted",
    userId: user._id.toString(),
    googleEventId,
  });
}
