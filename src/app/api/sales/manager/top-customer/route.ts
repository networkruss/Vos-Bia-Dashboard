import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Implement top-customer API
    return NextResponse.json({
      success: true,
      data: {
        topCustomers: [],
        metrics: [],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error in top-customer API route:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch top customer data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
