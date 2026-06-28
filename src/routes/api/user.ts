import { createFileRoute } from "@tanstack/react-router";

import { toUserProfile, withApiHandler } from "@/lib/server/api-handler";

export const Route = createFileRoute("/api/user")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withApiHandler(
          request,
          async (user) => {
            if (!user) {
              return Response.json({ error: "Unauthorized" }, { status: 401 });
            }
            return Response.json(toUserProfile(user));
          },
          { requireAuth: true },
        ),
    },
  },
});
