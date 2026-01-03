from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime

import pandas as pd
import yfinance as yf

from ra.portfolio import summarize_performance


WATCHLIST = ["AAPL", "MSFT", "NVDA", "TSLA"]
BENCHMARK = "SPY"  # used for beta later if you want, but today we keep it simple

# Where to write output JSON (inside Next.js public folder)
OUTPUT_DIR = Path(__file__).resolve().parents[3] / "apps" / "web" / "public" / "data"
TICKERS_DIR = OUTPUT_DIR / "tickers"


def to_serializable(obj):
    """Convert types (like numpy/pandas) into JSON-safe python types."""
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    if pd.isna(obj):
        return None
    return obj


def fetch_prices(ticker: str, period: str = "1y") -> pd.Series:
    """
    Fetch daily close prices for the ticker using yfinance.

    Teaching note:
    - We want a 1D Series: index = dates, values = close price
    - Sometimes yfinance/pandas returns Close as a 1-column DataFrame (shape: N x 1)
      so we "squeeze" it into a Series.
    """
    df = yf.download(
        ticker,
        period=period,
        interval="1d",
        auto_adjust=False,
        progress=False,
    )

    if df.empty:
        raise ValueError(f"No price data returned for {ticker}")

    close = df["Close"]

    # If Close is a 1-column DataFrame, convert to Series
    if isinstance(close, pd.DataFrame):
        if close.shape[1] != 1:
            raise ValueError(f"Expected 1 Close column for {ticker}, got {close.shape[1]}")
        close = close.iloc[:, 0]

    close = close.dropna()
    close.index = pd.to_datetime(close.index)
    close = close.sort_index()

    if len(close) < 2:
        raise ValueError(f"Not enough close prices for {ticker}")

    return close


def build_ticker_json(ticker: str, prices: pd.Series) -> dict:
    """
    Build the per-ticker JSON payload that the frontend can render.
    """
    summary = summarize_performance(prices)

    # Price series for chart (date + price)
    series = [{"date": d.strftime("%Y-%m-%d"), "close": float(p)} for d, p in prices.items()]

    payload = {
        "ticker": ticker,
        "asOf": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "metrics": {
            "cumulativeReturn": float(summary.cumulative_return),
            "maxDrawdown": float(summary.max_drawdown),
            "annualizedVolatility": float(summary.annualized_volatility),
            "betaVsBenchmark": summary.beta_vs_benchmark,  # None today
            "lastClose": float(prices.iloc[-1]),
        },
        "priceSeries": series,
    }
    return payload


def build_watchlist_json(ticker_payloads: list[dict]) -> dict:
    """
    Build a simple summary list for the homepage table.
    """
    rows = []
    for payload in ticker_payloads:
        m = payload["metrics"]
        rows.append(
            {
                "ticker": payload["ticker"],
                "lastClose": m["lastClose"],
                "cumulativeReturn": m["cumulativeReturn"],
                "maxDrawdown": m["maxDrawdown"],
                "annualizedVolatility": m["annualizedVolatility"],
                "asOf": payload["asOf"],
            }
        )

    return {
        "watchlist": rows,
        "generatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "tickers": WATCHLIST,
    }


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=to_serializable)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TICKERS_DIR.mkdir(parents=True, exist_ok=True)

    ticker_payloads = []
    for t in WATCHLIST:
        print(f"Fetching {t}...")
        prices = fetch_prices(t, period="1y")
        payload = build_ticker_json(t, prices)
        write_json(TICKERS_DIR / f"{t}.json", payload)
        ticker_payloads.append(payload)

    watchlist_payload = build_watchlist_json(ticker_payloads)
    write_json(OUTPUT_DIR / "watchlist.json", watchlist_payload)

    print(f"✅ Wrote: {OUTPUT_DIR / 'watchlist.json'}")
    print(f"✅ Wrote ticker files: {TICKERS_DIR}")


if __name__ == "__main__":
    main()
