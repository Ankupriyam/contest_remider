import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { toUserProfile, withApiHandler } from "@/lib/server/api-handler";
import { PLATFORMS } from "@/types";

const preferencesSchema = z.object({
  selectedPlatforms: z.array(z.enum(PLATFORMS)).optional(),
  reminderMinutes: z.number().int().min(1).max(1440).optional(),
});

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

            if (body.selectedPlatforms) {
              user.selectedPlatforms = body.selectedPlatforms;
            }
            if (body.reminderMinutes !== undefined) {
              user.reminderMinutes = body.reminderMinutes;
            }

            await user.save();
            return Response.json(toUserProfile(user));
          },
          { requireAuth: true },
        ),
    },
  },
});
