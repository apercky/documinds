import { getUserPermissions } from "@/lib/auth/auth";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint to obtain complete user data, including permissions and tokens
 * that are not included in the session cookie to avoid CHUNKING_SESSION_COOKIE
 */
export const GET = withAuth<NextRequest>([], async (req, context) => {
  try {
    const { session, accessToken, roles, token } = context;

    if (!accessToken || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Debug - log only in development environment
    if (process.env.NODE_ENV === "development") {
      console.log(
        "DEBUG - Session content:",
        JSON.stringify(
          {
            userId: (session as any).userId,
            user: session?.user,
            hasToken: !!accessToken,
          },
          null,
          2
        )
      );
    }

    // Retrieve permissions directly from Keycloak using the access token
    const permissions = await getUserPermissions(accessToken);

    // Debug - log only in development environment
    if (process.env.NODE_ENV === "development") {
      console.log(
        "DEBUG - Permissions retrieved:",
        JSON.stringify(permissions, null, 2)
      );
      console.log("DEBUG - Roles from token:", JSON.stringify(roles, null, 2));
    }

    // Create a complete version of the user data
    const userData = {
      ...session.user,
      // Brand is already in the user object
      permissions,
      roles: roles || [],
    };

    return NextResponse.json({
      user: userData,
      accessToken: accessToken,
      expiresAt: token?.expiresAt,
    });
  } catch (error) {
    console.error("Error retrieving user data:", error);
    return NextResponse.json(
      { error: "Error retrieving user data" },
      { status: 500 }
    );
  }
});
