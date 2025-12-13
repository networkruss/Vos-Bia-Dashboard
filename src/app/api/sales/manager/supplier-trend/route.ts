import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Implement supplier-trend sales API
    return NextResponse.json({
      success: true,
      data: {
        suppliers: [],
        trends: [],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error in supplier-trend API route:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch supplier trend data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
