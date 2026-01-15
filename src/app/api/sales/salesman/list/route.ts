import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const AUTH_HEADER = {
  Authorization: "Bearer " + process.env.DIRECTUS_TOKEN,
  "Content-Type": "application/json",
};

export async function GET() {
  try {
    const url = `${DIRECTUS_URL}/items/salesman?fields=id,salesman_name&limit=-1&status=published`;
    const res = await fetch(url, { cache: "no-store", headers: AUTH_HEADER });
    const json = await res.json();

    if (!res.ok) throw new Error("Failed to fetch from Directus");

    return NextResponse.json({
      success: true,
      data: json.data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
