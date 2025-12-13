import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Implement supplier-monthly sales API
    return NextResponse.json({
      success: true,
      data: {
        suppliers: [],
        monthlySales: [],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error in supplier-monthly API route:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch supplier monthly data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
