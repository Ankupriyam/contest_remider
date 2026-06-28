import { getEnv } from "./config";
import { logger } from "./logger";
import { Contest } from "@/models/Contest";
import { PLATFORMS, type Platform } from "@/types";

export interface FetchedContest {
  contestId: string;
  platform: Platform;
  title: string;
  startTime: Date;
  endTime: Date;
  url: string;
}

const CLIST_RESOURCES: Record<Platform, string> = {
  leetcode: "leetcode.com",
  codeforces: "codeforces.com",
  codechef: "codechef.com",
  atcoder: "atcoder.jp",
};

async function fetchFromClist(): Promise<FetchedContest[]> {
  const env = getEnv();
  if (!env.CLIST_USERNAME || !env.CLIST_API_KEY) {
    return [];
  }

  const now = new Date();
  const params = new URLSearchParams({
    username: env.CLIST_USERNAME,
    api_key: env.CLIST_API_KEY,
    limit: "200",
    order_by: "start",
    start__gt: now.toISOString(),
  });

  for (const platform of PLATFORMS) {
    params.append("resource", CLIST_RESOURCES[platform]);
  }

  const response = await fetch(`https://clist.by/api/v4/contest/?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`CLIST API failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    objects?: Array<{
      id: number;
      event: string;
      start: string;
      end: string;
      href: string;
      resource: string;
    }>;
  };

  return (data.objects ?? [])
    .map((item) => {
      const platform = (Object.entries(CLIST_RESOURCES).find(([, host]) =>
        item.resource.includes(host),
      )?.[0] ?? null) as Platform | null;

      if (!platform) return null;

      return {
        contestId: `${platform}-${item.id}`,
        platform,
        title: item.event,
        startTime: new Date(item.start),
        endTime: new Date(item.end),
        url: item.href,
      };
    })
    .filter((item): item is FetchedContest => item !== null);
}

async function fetchFromCodeforces(): Promise<FetchedContest[]> {
  const response = await fetch("https://codeforces.com/api/contest.list");
  if (!response.ok) {
    throw new Error(`Codeforces API failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    status: string;
    result?: Array<{
      id: number;
      name: string;
      startTimeSeconds?: number;
      durationSeconds: number;
      phase: string;
    }>;
  };

  if (data.status !== "OK" || !data.result) {
    throw new Error("Codeforces API returned an error");
  }

  const now = Date.now();
  return data.result
    .filter((c) => c.phase === "BEFORE" && c.startTimeSeconds)
    .map((c) => {
      const startTime = new Date(c.startTimeSeconds! * 1000);
      const endTime = new Date(startTime.getTime() + c.durationSeconds * 1000);
      return {
        contestId: `codeforces-${c.id}`,
        platform: "codeforces" as Platform,
        title: c.name,
        startTime,
        endTime,
        url: `https://codeforces.com/contests/${c.id}`,
      };
    })
    .filter((c) => c.startTime.getTime() > now);
}

async function fetchFromLeetCode(): Promise<FetchedContest[]> {
  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query upcomingContests {
          upcomingContests {
            title
            titleSlug
            startTime
            duration
          }
        }
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode GraphQL failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: {
      upcomingContests?: Array<{
        title: string;
        titleSlug: string;
        startTime: number;
        duration: number;
      }>;
    };
  };

  const now = Date.now();
  return (data.data?.upcomingContests ?? [])
    .map((c) => {
      const startTime = new Date(c.startTime * 1000);
      const endTime = new Date(startTime.getTime() + c.duration * 1000);
      return {
        contestId: `leetcode-${c.titleSlug}`,
        platform: "leetcode" as Platform,
        title: c.title,
        startTime,
        endTime,
        url: `https://leetcode.com/contest/${c.titleSlug}`,
      };
    })
    .filter((c) => c.startTime.getTime() > now);
}

function parseAtCoderDateTime(value: string): Date {
  const normalized = value.trim().replace(" ", "T").replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  return new Date(normalized);
}

async function fetchFromAtCoder(): Promise<FetchedContest[]> {
  const response = await fetch("https://atcoder.jp/contests/", {
    headers: { "User-Agent": "ContestReminder/1.0 (+https://github.com/contest-reminder)" },
  });
  if (!response.ok) {
    throw new Error(`AtCoder contests page failed with status ${response.status}`);
  }

  const html = await response.text();
  const sectionStart = ["Upcoming Contests", "Contest scheduled", "開催予定"]
    .map((marker) => html.indexOf(marker))
    .find((index) => index >= 0);
  const pastStart = html.indexOf("Past Contests");
  const section =
    sectionStart !== undefined && sectionStart >= 0
      ? html.slice(sectionStart, pastStart > sectionStart ? pastStart : sectionStart + 20_000)
      : html;

  const rowRe =
    /<time class='fixtime fixtime-full'>([^<]+)<\/time>[\s\S]*?href="\/contests\/([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<td class="text-center">(\d+):(\d+)<\/td>/g;

  const now = Date.now();
  const contests: FetchedContest[] = [];
  let match: RegExpExecArray | null;

  while ((match = rowRe.exec(section)) !== null) {
    const [, startRaw, id, title, hoursRaw, minutesRaw] = match;
    const startTime = parseAtCoderDateTime(startRaw);
    const durationMs = (parseInt(hoursRaw, 10) * 60 + parseInt(minutesRaw, 10)) * 60_000;
    const endTime = new Date(startTime.getTime() + durationMs);

    if (startTime.getTime() <= now) continue;

    contests.push({
      contestId: `atcoder-${id}`,
      platform: "atcoder",
      title,
      startTime,
      endTime,
      url: `https://atcoder.jp/contests/${id}`,
    });
  }

  if (contests.length === 0) {
    logger.warn({ event: "atcoder_fetch_empty", message: "No upcoming contests parsed from AtCoder page" });
  }

  return contests;
}

async function fetchFromCodeChef(): Promise<FetchedContest[]> {
  const response = await fetch(
    "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all",
    {
      headers: { "User-Agent": "ContestReminder/1.0 (+https://github.com/contest-reminder)" },
    },
  );
  if (!response.ok) {
    throw new Error(`CodeChef API failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    future_contests?: Array<{
      contest_code: string;
      contest_name: string;
      contest_start_date_iso: string;
      contest_end_date_iso: string;
    }>;
  };

  const now = Date.now();
  return (data.future_contests ?? [])
    .map((c) => {
      const startTime = new Date(c.contest_start_date_iso);
      const endTime = new Date(c.contest_end_date_iso);
      return {
        contestId: `codechef-${c.contest_code}`,
        platform: "codechef" as Platform,
        title: c.contest_name,
        startTime,
        endTime,
        url: `https://www.codechef.com/${c.contest_code}`,
      };
    })
    .filter((c) => c.startTime.getTime() > now);
}

async function fetchPlatformContests(platform: Platform): Promise<FetchedContest[]> {
  switch (platform) {
    case "codeforces":
      return fetchFromCodeforces();
    case "leetcode":
      return fetchFromLeetCode();
    case "atcoder":
      return fetchFromAtCoder();
    case "codechef":
      return fetchFromCodeChef();
    default:
      return [];
  }
}

export async function fetchAllContests(): Promise<FetchedContest[]> {
  const results = await Promise.allSettled([
    fetchFromClist(),
    ...PLATFORMS.map((platform) => fetchPlatformContests(platform)),
  ]);

  const contests = new Map<string, FetchedContest>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const contest of result.value) {
        contests.set(contest.contestId, contest);
      }
    } else {
      logger.warn({
        event: "contest_fetch_partial_failure",
        error: result.reason instanceof Error ? result.reason.message : "unknown",
      });
    }
  }

  return [...contests.values()];
}

export async function syncContestsForPlatforms(platforms: Platform[]) {
  if (platforms.length === 0) return;

  logger.info({ event: "contest_fetch_started", platforms });

  const results = await Promise.allSettled(platforms.map((platform) => fetchPlatformContests(platform)));
  const contests = new Map<string, FetchedContest>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const contest of result.value) {
        if (platforms.includes(contest.platform)) {
          contests.set(contest.contestId, contest);
        }
      }
    } else {
      logger.warn({
        event: "contest_fetch_partial_failure",
        error: result.reason instanceof Error ? result.reason.message : "unknown",
      });
    }
  }

  let created = 0;
  let updated = 0;

  for (const contest of contests.values()) {
    const existing = await Contest.findOne({ contestId: contest.contestId });
    if (!existing) {
      await Contest.create(contest);
      created += 1;
      continue;
    }

    const changed =
      existing.title !== contest.title ||
      existing.startTime.getTime() !== contest.startTime.getTime() ||
      existing.endTime.getTime() !== contest.endTime.getTime() ||
      existing.url !== contest.url;

    if (changed) {
      existing.title = contest.title;
      existing.startTime = contest.startTime;
      existing.endTime = contest.endTime;
      existing.url = contest.url;
      await existing.save();
      updated += 1;
    }
  }

  logger.info({
    event: "contest_fetch_completed",
    platforms,
    fetched: contests.size,
    created,
    updated,
  });
}

export async function syncContestsToDatabase() {
  logger.info({ event: "contest_fetch_started" });
  const contests = await fetchAllContests();
  let created = 0;
  let updated = 0;

  for (const contest of contests) {
    const existing = await Contest.findOne({ contestId: contest.contestId });
    if (!existing) {
      await Contest.create(contest);
      created += 1;
      continue;
    }

    const changed =
      existing.title !== contest.title ||
      existing.startTime.getTime() !== contest.startTime.getTime() ||
      existing.endTime.getTime() !== contest.endTime.getTime() ||
      existing.url !== contest.url;

    if (changed) {
      existing.title = contest.title;
      existing.startTime = contest.startTime;
      existing.endTime = contest.endTime;
      existing.url = contest.url;
      await existing.save();
      updated += 1;
    }
  }

  logger.info({
    event: "contest_fetch_completed",
    fetched: contests.length,
    created,
    updated,
  });
}

let lastContestSyncAt = 0;
const CONTEST_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export async function ensureContestsFresh(force = false) {
  const now = Date.now();
  if (!force && now - lastContestSyncAt < CONTEST_SYNC_INTERVAL_MS) {
    const upcoming = await Contest.countDocuments({ startTime: { $gt: new Date() } });
    if (upcoming > 0) return;
  }

  await syncContestsToDatabase();
  lastContestSyncAt = now;
}

