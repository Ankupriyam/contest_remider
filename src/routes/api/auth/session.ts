import { createFileRoute } from "@tanstack/react-router";

import { withApiHandler, toUserProfile } from "@/lib/server/api-handler";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withApiHandler(request, async (user) => {
          if (!user) {
            return Response.json({ authenticated: false }, { status: 401 });
          }
          return Response.json({ authenticated: true, user: toUserProfile(user) });
        }),
    },
  },
});
