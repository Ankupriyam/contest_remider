import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "node:crypto";

import { getGoogleAuthUrl } from "@/lib/server/auth";
import { checkRateLimit } from "@/lib/server/rate-limit";

const STATE_COOKIE = "oauth_state";
const PENDING_PLATFORM_COOKIE = "pending_platform";

export const Route = createFileRoute("/api/auth/connect/calendar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        const reqUrl = new URL(request.url);
        const pendingPlatform = reqUrl.searchParams.get("platform") ?? "";

        const state = randomBytes(16).toString("hex");
        const url = getGoogleAuthUrl(state, true);

        const headers = new Headers();
        headers.set("Location", url);
        headers.append(
          "Set-Cookie",
          `${STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
        );
        if (pendingPlatform) {
          headers.append(
            "Set-Cookie",
            `${PENDING_PLATFORM_COOKIE}=${encodeURIComponent(pendingPlatform)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
          );
        }

        return new Response(null, { status: 302, headers });
      },
    },
  },
});
