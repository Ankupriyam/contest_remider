import cron from "node-cron";

import { connectDb } from "@/lib/server/db";
import { getEnv } from "@/lib/server/config";
import { syncContestsToDatabase } from "@/lib/server/contest-fetcher";
import { logger } from "@/lib/server/logger";
import { syncAllUsersCalendars } from "@/lib/server/sync-service";

let started = false;

export function startCronJobs() {
  if (started) return;

  try {
    if (!getEnv().ENABLE_CRON) return;
  } catch {
    return;
  }

  started = true;

  cron.schedule("*/15 * * * *", async () => {
    logger.info({ event: "cron_execution_started" });
    try {
      await connectDb();
      await syncContestsToDatabase();
      await syncAllUsersCalendars();
      logger.info({ event: "cron_execution_completed" });
    } catch (error) {
      logger.error({
        event: "cron_execution_failed",
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  });

  logger.info({ event: "cron_jobs_started", schedule: "*/15 * * * *" });
}
