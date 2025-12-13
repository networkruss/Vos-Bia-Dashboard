import { NextResponse } from "next/server";

const DIRECTUS_URL = "http://100.126.246.124:8060";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || "";

function getHeaders() {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (DIRECTUS_TOKEN) {
    headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  }

  return headers;
}

export async function GET() {
  try {
    console.log("🔍 Fetching sales invoices from Directus...");

    const response = await fetch(
      `${DIRECTUS_URL}/items/sales_invoice?limit=-1`,
      {
        headers: getHeaders(),
        cache: "no-store",
      }
    );

    console.log("📊 Directus response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Directus API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        {
          error: "Failed to fetch from Directus",
          status: response.status,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("✅ Directus data received, count:", data.data?.length || 0);

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error in encoder API route:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch data from Directus",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
