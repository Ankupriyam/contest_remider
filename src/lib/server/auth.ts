import { google } from "googleapis";

import { getEnv, GOOGLE_BASIC_SCOPES, GOOGLE_CALENDAR_SCOPES } from "./config";
import { decryptToken, encryptToken } from "./crypto";
import { logger } from "./logger";
import { User, type UserDocument } from "@/models/User";

export function createOAuthClient() {
  const env = getEnv();
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${env.APP_URL}/api/auth/callback/google`);
}

export function getGoogleAuthUrl(state: string, includeCalendar = false) {
  const client = createOAuthClient();
  const scopes = includeCalendar
    ? [...GOOGLE_BASIC_SCOPES, ...GOOGLE_CALENDAR_SCOPES]
    : GOOGLE_BASIC_SCOPES;

  return client.generateAuthUrl({
    access_type: includeCalendar ? "offline" : "online",
    prompt: includeCalendar ? "consent" : "select_account",
    scope: scopes,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) {
    throw new Error("Google OAuth did not return an access token");
  }
  return tokens;
}

export function hasCalendarScope(tokens: { scope?: string | null }): boolean {
  return Boolean(tokens.scope?.includes("calendar.events"));
}

export async function getGoogleProfile(accessToken: string) {
  const client = createOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data.id || !data.email || !data.name) {
    throw new Error("Google profile is incomplete");
  }
  return {
    googleId: data.id,
    email: data.email,
    name: data.name,
    image: data.picture ?? null,
  };
}

/**
 * Create or update a user after basic sign-in (no calendar scope).
 * Only updates profile info — never touches tokens/calendar fields.
 */
export async function upsertGoogleUser(
  profile: Awaited<ReturnType<typeof getGoogleProfile>>,
) {
  const user = await User.findOneAndUpdate(
    { googleId: profile.googleId },
    {
      googleId: profile.googleId,
      name: profile.name,
      email: profile.email,
      image: profile.image,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  logger.info({ event: "user_login", userId: user._id.toString(), email: user.email });
  return user;
}

/**
 * Upgrade an existing user with calendar tokens after they grant calendar permission.
 */
export async function upgradeUserWithCalendar(
  user: UserDocument,
  tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>,
) {
  if (!tokens.refresh_token) {
    throw new Error("Calendar upgrade did not return a refresh token");
  }

  const encryptedRefresh = encryptToken(tokens.refresh_token);
  const encryptedAccess = encryptToken(tokens.access_token!);
  const tokenExpiry = new Date(Date.now() + (tokens.expiry_date ?? 3600 * 1000));

  user.refreshToken = encryptedRefresh;
  user.accessToken = encryptedAccess;
  user.tokenExpiry = tokenExpiry;
  user.calendarConnected = true;

  await user.save();
  logger.info({ event: "calendar_connected", userId: user._id.toString() });
  return user;
}

export async function refreshUserAccessToken(user: UserDocument): Promise<UserDocument> {
  if (user.tokenExpiry.getTime() > Date.now() + 60_000) {
    return user;
  }

  const client = createOAuthClient();
  client.setCredentials({ refresh_token: decryptToken(user.refreshToken) });

  try {
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error("Failed to refresh Google access token");
    }

    user.accessToken = encryptToken(credentials.access_token);
    user.tokenExpiry = new Date(Date.now() + (credentials.expiry_date ?? 3600 * 1000));
    await user.save();
    return user;
  } catch (error) {
    logger.error({
      event: "token_refresh_failed",
      userId: user._id.toString(),
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}

export async function getAuthenticatedCalendarClient(user: UserDocument) {
  const refreshed = await refreshUserAccessToken(user);
  const client = createOAuthClient();
  client.setCredentials({
    access_token: decryptToken(refreshed.accessToken),
    refresh_token: decryptToken(refreshed.refreshToken),
  });
  return google.calendar({ version: "v3", auth: client });
}
