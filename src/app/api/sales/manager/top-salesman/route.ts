import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Implement top-salesman API
    return NextResponse.json({
      success: true,
      data: {
        topSalesmen: [],
        metrics: [],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error in top-salesman API route:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch top salesman data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
