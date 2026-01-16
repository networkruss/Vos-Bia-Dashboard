// src/app/api/sales/salesman/list/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const DIRECTUS_URL = process.env.DIRECTUS_URL;
    const res = await fetch(
      `${DIRECTUS_URL}/items/salesman?fields=id,salesman_name`,
      {
        headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` },
        cache: "no-store",
      }
    );
    const json = await res.json();
    return NextResponse.json({ success: true, data: json.data || [] });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
