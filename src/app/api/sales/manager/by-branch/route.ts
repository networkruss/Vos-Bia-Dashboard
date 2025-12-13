import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Implement by-branch sales API
    return NextResponse.json({
      success: true,
      data: {
        branches: [],
        sales: [],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error in by-branch API route:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch branch data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
