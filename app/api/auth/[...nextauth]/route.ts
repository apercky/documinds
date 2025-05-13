// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  process.stdout.write(`[GET] Incoming Request: ${req.url}\n`);
  return handlers.GET(req);
};

export const POST = async (req: NextRequest) => {
  process.stdout.write(`[POST] Incoming Request: ${req.url}\n`);
  return handlers.POST(req);
};

// export const { GET, POST } = handlers;
