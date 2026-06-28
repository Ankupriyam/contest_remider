import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "node:crypto";

import { getGoogleAuthUrl } from "@/lib/server/auth";
import { checkRateLimit } from "@/lib/server/rate-limit";

const STATE_COOKIE = "oauth_state";

export const Route = createFileRoute("/api/auth/signin/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        const state = randomBytes(16).toString("hex");
        const url = getGoogleAuthUrl(state);

        return new Response(null, {
          status: 302,
          headers: {
            Location: url,
            "Set-Cookie": `${STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
          },
        });
      },
    },
  },
});
