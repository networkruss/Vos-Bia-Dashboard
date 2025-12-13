import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Implement overview sales API
    return NextResponse.json({
      success: true,
      data: {
        overview: {},
        metrics: [],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error in overview API route:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch overview data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
