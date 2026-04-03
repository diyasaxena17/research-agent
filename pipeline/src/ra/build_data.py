from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime

import pandas as pd
import yfinance as yf

from ra.portfolio import summarize_performance
from ra.sentiment import FinBertSentiment, summarize_sentiment


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


def fetch_headlines(ticker: str, limit: int = 10) -> list[dict]:
    """
    Fetch recent headlines using yfinance's Ticker.news.
    Teaching note:
    - News APIs can be unreliable, so we always fail gracefully.
    """
    try:
        t = yf.Ticker(ticker)
        news = t.news or []
    except Exception:
        news = []

    headlines = []
    for item in news[:limit]:
        title = item.get("title")
        link = item.get("link") or item.get("url")
        provider = item.get("publisher")

        if not title:
            continue

        headlines.append(
            {
                "title": title,
                "url": link,
                "publisher": provider,
            }
        )
    return headlines


def build_ticker_json(
    ticker: str,
    prices: pd.Series,
    benchmark_prices: pd.Series | None = None,
) -> dict:
    """
    Build the per-ticker JSON payload that the frontend can render.
    """
    summary = summarize_performance(prices, benchmark_prices)

    # Price series for chart (date + price)
    series = [{"date": d.strftime("%Y-%m-%d"), "close": float(p)} for d, p in prices.items()]

    payload = {
        "ticker": ticker,
        "asOf": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "metrics": {
            "cumulativeReturn": float(summary.cumulative_return),
            "maxDrawdown": float(summary.max_drawdown),
            "annualizedVolatility": float(summary.annualized_volatility),
            "downsideDeviation": float(summary.downside_deviation),
            "betaVsBenchmark": round(summary.beta_vs_benchmark, 3) if summary.beta_vs_benchmark is not None else None,
            "lastClose": float(prices.iloc[-1]),
        },
        "priceSeries": series,
    }
    return payload


def build_watchlist_json(ticker_payloads: list[dict], correlation: dict | None = None) -> dict:
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
                "downsideDeviation": m["downsideDeviation"],
                "asOf": payload["asOf"],
            }
        )

    result: dict = {
        "watchlist": rows,
        "generatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "tickers": WATCHLIST,
    }
    if correlation:
        result["correlationMatrix"] = correlation
    return result


def compute_correlation_matrix(prices_by_ticker: dict[str, pd.Series]) -> dict:
    """
    Compute pairwise Pearson correlation of daily returns across all tickers.

    Teaching note:
    - Pearson correlation ranges from -1 to +1
    - +1  → two stocks move perfectly together every day
    -  0  → no linear relationship
    - -1  → move perfectly opposite (e.g. a stock and its inverse ETF)
    - In practice, most large-cap tech stocks are correlated 0.5–0.9
    - High correlation across ALL holdings = poor diversification;
      when one drops, they all drop together.
    """
    # Build a DataFrame: each column is one ticker's daily % returns
    returns = pd.DataFrame(
        {ticker: prices.pct_change().dropna() for ticker, prices in prices_by_ticker.items()}
    ).dropna()  # keep only dates where all tickers have data

    corr = returns.corr()
    tickers = list(corr.columns)
    values = [[round(float(corr.loc[r, c]), 4) for c in tickers] for r in tickers]
    return {"tickers": tickers, "values": values}


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=to_serializable)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TICKERS_DIR.mkdir(parents=True, exist_ok=True)

    sentiment_model = FinBertSentiment()

    print(f"Fetching benchmark ({BENCHMARK})...")
    spy_prices = fetch_prices(BENCHMARK, period="1y")

    ticker_payloads = []
    all_prices: dict[str, pd.Series] = {}

    for t in WATCHLIST:
        print(f"Fetching {t}...")
        prices = fetch_prices(t, period="1y")
        all_prices[t] = prices

        # NEW: headlines + sentiment
        headlines = fetch_headlines(t, limit=10)
        titles = [h["title"] for h in headlines]

        scored = sentiment_model.score_texts(titles) if titles else []
        for h, s in zip(headlines, scored):
            h["sentiment"] = s.label
            h["sentimentScore"] = s.score

        sentiment_summary = summarize_sentiment(scored)

        payload = build_ticker_json(t, prices, benchmark_prices=spy_prices)

        # Attach news + sentiment to the existing payload
        payload["news"] = {
            "headlines": headlines,
            "sentimentSummary": sentiment_summary,
        }

        write_json(TICKERS_DIR / f"{t}.json", payload)
        ticker_payloads.append(payload)

    print("Computing correlation matrix…")
    correlation = compute_correlation_matrix(all_prices)

    watchlist_payload = build_watchlist_json(ticker_payloads, correlation)
    write_json(OUTPUT_DIR / "watchlist.json", watchlist_payload)

    print(f"✅ Wrote: {OUTPUT_DIR / 'watchlist.json'}")
    print(f"✅ Wrote ticker files: {TICKERS_DIR}")


if __name__ == "__main__":
    main()
