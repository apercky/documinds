import { NextResponse } from "next/server";

/**
 * Standard error handler for API routes
 * @param error The error object
 * @returns NextResponse with appropriate error message and status code
 */
export function handleApiError(error: any) {
  console.error("API Error:", error);

  // Error message mapping to HTTP status codes
  const statusCodeMap: Record<string, number> = {
    "Collection name is required": 400,
    "Collection ID is required": 400,
    "Attributes must be an array": 400,
    "Missing route parameters": 400,
    "Qdrant collection already exists": 409,
    "Collection not found": 404,
    Unauthorized: 401,
    Forbidden: 403,
  };

  const message = error?.message || "Internal server error";
  const status = statusCodeMap[message] || 500;

  return NextResponse.json({ error: message }, { status });
}
