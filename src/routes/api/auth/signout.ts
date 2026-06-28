import { createFileRoute } from "@tanstack/react-router";

import { clearSessionCookie } from "@/lib/server/session";

export const Route = createFileRoute("/api/auth/signout")({
  server: {
    handlers: {
      POST: async () =>
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": clearSessionCookie(),
          },
        }),
    },
  },
});
