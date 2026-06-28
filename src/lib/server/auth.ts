import { google } from "googleapis";

import { getEnv, GOOGLE_SCOPES } from "./config";
import { decryptToken, encryptToken } from "./crypto";
import { logger } from "./logger";
import { User, type UserDocument } from "@/models/User";

export function createOAuthClient() {
  const env = getEnv();
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${env.APP_URL}/api/auth/callback/google`);
}

export function getGoogleAuthUrl(state: string) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Google OAuth did not return required tokens");
  }
  return tokens;
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

export async function upsertGoogleUser(
  profile: Awaited<ReturnType<typeof getGoogleProfile>>,
  tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>,
) {
  const encryptedRefresh = encryptToken(tokens.refresh_token!);
  const encryptedAccess = encryptToken(tokens.access_token!);
  const tokenExpiry = new Date(Date.now() + (tokens.expiry_date ?? 3600 * 1000));

  const user = await User.findOneAndUpdate(
    { googleId: profile.googleId },
    {
      googleId: profile.googleId,
      name: profile.name,
      email: profile.email,
      image: profile.image,
      refreshToken: encryptedRefresh,
      accessToken: encryptedAccess,
      tokenExpiry,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  logger.info({ event: "user_login", userId: user._id.toString(), email: user.email });
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
