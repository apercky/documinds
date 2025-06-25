import { NextRequest, NextResponse } from "next/server";
import { collectDefaultMetrics, register } from "prom-client";

// Initialize default metrics collection
collectDefaultMetrics({
  register,
  prefix: "documinds_",
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

export async function GET(request: NextRequest) {
  try {
    // Get metrics in Prometheus format
    const metrics = await register.metrics();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        "Content-Type": register.contentType,
      },
    });
  } catch (error) {
    console.error("Error collecting metrics:", error);
    return NextResponse.json(
      { error: "Failed to collect metrics" },
      { status: 500 }
    );
  }
}
