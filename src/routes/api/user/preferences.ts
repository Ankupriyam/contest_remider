import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { toUserProfile, withApiHandler } from "@/lib/server/api-handler";
import { logger } from "@/lib/server/logger";
import {
  handlePlatformChanges,
  handleReminderChange,
} from "@/lib/server/sync-service";
import { PLATFORMS, type Platform } from "@/types";

const preferencesSchema = z.object({
  selectedPlatforms: z.array(z.enum(PLATFORMS)).optional(),
  reminderMinutes: z.number().int().min(1).max(1440).optional(),
});

const emptySync = { synced: 0, removed: 0, updated: 0, failed: 0 };

export const Route = createFileRoute("/api/user/preferences")({
  server: {
    handlers: {
      PUT: async ({ request }) =>
        withApiHandler(
          request,
          async (user) => {
            if (!user) {
              return Response.json({ error: "Unauthorized" }, { status: 401 });
            }

            let body;
            try {
              body = preferencesSchema.parse(await request.json());
            } catch {
              return Response.json({ error: "Invalid preferences payload" }, { status: 400 });
            }

            const previousPlatforms = [...user.selectedPlatforms] as Platform[];
            const previousReminder = user.reminderMinutes;
            let sync = emptySync;

            if (body.selectedPlatforms) {
              user.selectedPlatforms = body.selectedPlatforms;
            }
            if (body.reminderMinutes !== undefined) {
              user.reminderMinutes = body.reminderMinutes;
            }

            await user.save();

            try {
              if (body.selectedPlatforms) {
                sync = await handlePlatformChanges(user, previousPlatforms, body.selectedPlatforms);
              } else if (
                body.reminderMinutes !== undefined &&
                body.reminderMinutes !== previousReminder
              ) {
                sync = await handleReminderChange(user);
              }
            } catch (error) {
              logger.error({
                event: "preferences_sync_failed",
                userId: user._id.toString(),
                error: error instanceof Error ? error.message : "unknown",
              });
              return Response.json(
                {
                  user: toUserProfile(user),
                  sync,
                  error: "Preferences saved but calendar sync failed. Try again.",
                },
                { status: 207 },
              );
            }

            return Response.json({ user: toUserProfile(user), sync });
          },
          { requireAuth: true },
        ),
    },
  },
});
