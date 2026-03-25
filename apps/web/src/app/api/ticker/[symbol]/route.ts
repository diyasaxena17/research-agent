import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

// Only A-Z, 1–5 chars — covers every real ticker and blocks path traversal
// (e.g. someone requesting /api/ticker/../../etc/passwd).
const TICKER_RE = /^[A-Z]{1,5}$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase();

  if (!TICKER_RE.test(symbol)) {
    return NextResponse.json({ error: "Invalid ticker symbol." }, { status: 400 });
  }

  try {
    const file = path.join(
      process.cwd(),
      "public",
      "data",
      "tickers",
      `${symbol}.json`
    );
    const data = JSON.parse(readFileSync(file, "utf-8"));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: `No data for ${symbol}. Run: python -m ra.build_data` },
      { status: 404 }
    );
  }
}
