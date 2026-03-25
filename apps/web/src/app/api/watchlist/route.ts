import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  try {
    const file = path.join(process.cwd(), "public", "data", "watchlist.json");
    const data = JSON.parse(readFileSync(file, "utf-8"));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Watchlist data not found. Run: python -m ra.build_data" },
      { status: 404 }
    );
  }
}
