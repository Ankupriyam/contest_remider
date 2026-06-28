import { createFileRoute } from "@tanstack/react-router";

import { withApiHandler } from "@/lib/server/api-handler";
import { syncUserCalendar } from "@/lib/server/sync-service";

export const Route = createFileRoute("/api/calendar/sync")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withApiHandler(
          request,
          async (user) => {
            if (!user) {
              return Response.json({ error: "Unauthorized" }, { status: 401 });
            }

            const result = await syncUserCalendar(user._id.toString(), { fetchContests: true });
            return Response.json(result);
          },
          { requireAuth: true },
        ),
    },
  },
});
