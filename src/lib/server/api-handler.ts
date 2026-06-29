import { connectDb } from "./db";
import { checkRateLimit } from "./rate-limit";
import { getSessionFromRequest } from "./session";
import { User, type UserDocument } from "@/models/User";

export async function withApiHandler(
  request: Request,
  handler: (user: UserDocument | null) => Promise<Response>,
  options: { requireAuth?: boolean } = {},
): Promise<Response> {
  const rateLimited = checkRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    await connectDb();
  } catch {
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }

  const session = await getSessionFromRequest(request);
  let user: UserDocument | null = null;

  if (session) {
    user = await User.findById(session.userId);
  }

  if (options.requireAuth && !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await handler(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export function toUserProfile(user: UserDocument) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image,
    reminderMinutes: user.reminderMinutes,
    selectedPlatforms: user.selectedPlatforms,
    calendarConnected: Boolean(user.calendarConnected),
  };
}
