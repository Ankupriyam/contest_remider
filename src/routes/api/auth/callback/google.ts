import { createFileRoute } from "@tanstack/react-router";

import {
  exchangeCodeForTokens,
  getGoogleProfile,
  hasCalendarScope,
  upgradeUserWithCalendar,
  upsertGoogleUser,
} from "@/lib/server/auth";
import { connectDb } from "@/lib/server/db";
import { getEnv } from "@/lib/server/config";
import { logger } from "@/lib/server/logger";
import {
  buildSessionCookie,
  createSessionToken,
  getSessionFromRequest,
} from "@/lib/server/session";
import { User } from "@/models/User";
import { handlePlatformChanges } from "@/lib/server/sync-service";
import type { Platform } from "@/types";

const STATE_COOKIE = "oauth_state";
const PENDING_PLATFORM_COOKIE = "pending_platform";

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
          const calendarGranted = hasCalendarScope(tokens);

          // Check if user already has a session (calendar-connect flow)
          const session = await getSessionFromRequest(request);

          const headers = new Headers();

          if (session) {
            // --- Calendar connect flow ---
            // User is already logged in and is granting calendar permission
            const user = await User.findById(session.userId);
            if (!user) {
              return Response.redirect(`${getEnv().APP_URL}/?error=user_not_found`, 302);
            }

            if (calendarGranted && tokens.refresh_token) {
              await upgradeUserWithCalendar(user, tokens);

              // Auto-enable the pending platform if set via cookie
              const pendingPlatform = getCookieValue(request, PENDING_PLATFORM_COOKIE) as Platform | null;
              if (pendingPlatform) {
                const previousPlatforms = [...user.selectedPlatforms] as Platform[];
                if (!previousPlatforms.includes(pendingPlatform)) {
                  const newPlatforms = [...previousPlatforms, pendingPlatform] as Platform[];
                  user.selectedPlatforms = newPlatforms;
                  await user.save();
                  // Fire-and-forget calendar sync for the new platform
                  handlePlatformChanges(user, previousPlatforms, newPlatforms).catch((err) => {
                    logger.error({
                      event: "auto_platform_sync_failed",
                      error: err instanceof Error ? err.message : "unknown",
                    });
                  });
                }
                // Clear the pending platform cookie
                headers.append(
                  "Set-Cookie",
                  `${PENDING_PLATFORM_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
                );
              }
            }

            headers.set("Location", `${getEnv().APP_URL}/dashboard`);
            headers.append(
              "Set-Cookie",
              `${STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
            );

            return new Response(null, { status: 302, headers });
          }

          // --- Normal sign-in flow ---
          const user = await upsertGoogleUser(profile);

          // If user already had calendar connected (returning user), update tokens if calendar scope granted
          if (calendarGranted && tokens.refresh_token) {
            await upgradeUserWithCalendar(user, tokens);
          }

          const sessionToken = await createSessionToken({
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image ?? null,
          });

          headers.set("Location", `${getEnv().APP_URL}/dashboard`);
          headers.append("Set-Cookie", buildSessionCookie(sessionToken));
          headers.append(
            "Set-Cookie",
            `${STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
          );

          return new Response(null, { status: 302, headers });
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
