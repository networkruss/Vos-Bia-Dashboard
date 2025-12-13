import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Implement by-division sales API
    return NextResponse.json({
      success: true,
      data: {
        divisions: [],
        sales: [],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error in by-division API route:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch division data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
