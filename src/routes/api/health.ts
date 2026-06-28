import { createFileRoute } from "@tanstack/react-router";

import { connectDb } from "@/lib/server/db";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await connectDb();
          return Response.json({ status: "ok", database: "connected" });
        } catch {
          return Response.json({ status: "degraded", database: "disconnected" }, { status: 503 });
        }
      },
    },
  },
});
