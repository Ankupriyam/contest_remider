import mongoose from "mongoose";

import { getEnv } from "./config";
import { logger } from "./logger";

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectDb() {
  if (globalThis.__mongooseConn) {
    return globalThis.__mongooseConn;
  }

  const uri = getEnv().MONGODB_URI;
  globalThis.__mongooseConn = mongoose.connect(uri).then((conn) => {
    logger.info({ event: "db_connected" });
    return conn;
  });

  return globalThis.__mongooseConn;
}
