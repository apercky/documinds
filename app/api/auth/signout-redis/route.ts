import { deleteUserTokens } from "@/lib/auth/tokenStore";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: isProd,
  });

  if (token?.sub) {
    await deleteUserTokens(token.sub);
    console.log(`[SignOut] Redis tokens deleted for user: ${token.sub}`);
  }

  return NextResponse.json({ status: "ok" });
}
