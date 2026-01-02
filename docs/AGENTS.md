# AGENTS.md — Equity Research Agent Spec (Draft)

## Purpose
Generate a weekly research brief for a watchlist and a per-ticker research pack.

## Inputs
- Watchlist tickers (default: AAPL, MSFT, NVDA, TSLA)
- Time window (default: 1 year prices, last 7–14 days news)

## Tools (planned)
1. Price fetcher (yfinance)
2. Portfolio analytics (returns, volatility, max drawdown)
3. News fetcher (yfinance headlines)
4. Sentiment model (FinBERT via PyTorch Transformers)

## Outputs
- `public/data/watchlist.json`
- `public/data/ticker/<TICKER>.json`

## Guardrails
- Not financial advice
- No trade execution
- Always include links/sources for headlines
