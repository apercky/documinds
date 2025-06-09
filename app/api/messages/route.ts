import { invalidateTranslationsCache } from "@/lib/translations";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action === "reset") {
    try {
      await invalidateTranslationsCache();
      return NextResponse.json({
        success: true,
        message: "Translation cache has been reset successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error resetting translation cache:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to reset translation cache",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Invalid action. Use ?action=reset to reset the cache",
    },
    { status: 400 }
  );
}
