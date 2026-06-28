import { createFileRoute } from "@tanstack/react-router";

import {
  exchangeCodeForTokens,
  getGoogleProfile,
  upsertGoogleUser,
} from "@/lib/server/auth";
import { connectDb } from "@/lib/server/db";
import { getEnv } from "@/lib/server/config";
import { logger } from "@/lib/server/logger";
import {
  buildSessionCookie,
  createSessionToken,
} from "@/lib/server/session";

const STATE_COOKIE = "oauth_state";

function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(";")) {
    const [key, ...rest] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export const Route = createFileRoute("/api/auth/callback/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const storedState = getCookieValue(request, STATE_COOKIE);

        if (!code || !state || !storedState || state !== storedState) {
          logger.error({ event: "oauth_callback_invalid_state" });
          return Response.redirect(`${getEnv().APP_URL}/?error=oauth_state`, 302);
        }

        try {
          await connectDb();
          const tokens = await exchangeCodeForTokens(code);
          const profile = await getGoogleProfile(tokens.access_token!);
          const user = await upsertGoogleUser(profile, tokens);

          const sessionToken = await createSessionToken({
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
          });

          const headers = new Headers();
          headers.set("Location", `${getEnv().APP_URL}/dashboard`);
          headers.append("Set-Cookie", buildSessionCookie(sessionToken));
          headers.append(
            "Set-Cookie",
            `${STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
          );

          return new Response(null, {
            status: 302,
            headers,
          });
        } catch (error) {
          logger.error({
            event: "oauth_callback_failed",
            error: error instanceof Error ? error.message : "unknown",
          });
          return Response.redirect(`${getEnv().APP_URL}/?error=oauth_failed`, 302);
        }
      },
    },
  },
});
