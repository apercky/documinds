import "server-only";

import { auth } from "@/lib/auth/auth";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Check if the request is authenticated
 * @param req The NextRequest object
 * @returns false if authenticated, otherwise returns a Response object with 401 status
 */
export async function checkAuth(
  req: Request | NextRequest
): Promise<false | Response> {
  const session = await auth();
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  if (!token?.accessToken || !session) {
    // For regular requests
    if (req.headers.get("Accept")?.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    // For SSE requests
    else if (req.headers.get("Accept")?.includes("text/event-stream")) {
      const encoder = new TextEncoder();
      const customEncode = (chunk: object) =>
        encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);
      return new Response(
        customEncode({ type: "error", error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }
    // Default response
    else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return false;
}
