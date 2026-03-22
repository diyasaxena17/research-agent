# Equity Research Agent + Portfolio Monitor

Generate research packs for any stock ticker — price history, drawdown curves, and FinBERT news sentiment — with a live watchlist dashboard.

**[research-agent-ai.vercel.app](https://research-agent-ai.vercel.app)**

---

## What it does

- **Watchlist dashboard** — table of tracked tickers with 1Y return, max drawdown, and annualised volatility
- **Ticker research packs** — per-symbol pages with a 1Y price chart, drawdown-from-peak chart, key metrics, and sentiment-scored headlines
- **Python data pipeline** — fetches prices and news from Yahoo Finance, scores headlines with FinBERT, writes static JSON consumed by the frontend

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | Next.js, React, TypeScript, Recharts, Tailwind CSS |
| Data pipeline | Python, pandas, numpy, yfinance |
| NLP | FinBERT (ProsusAI/finbert via HuggingFace Transformers + PyTorch) |
| Testing | pytest |
| Deployment | Vercel (frontend), GitHub Actions (CI) |

## Repo structure

```
apps/web/          Next.js frontend
  src/app/
    page.tsx               Watchlist dashboard
    ticker/[symbol]/       Per-ticker research pack
      PriceChart.tsx       1Y price line chart
      DrawdownChart.tsx    Drawdown-from-peak area chart
  public/data/             Static JSON written by pipeline

pipeline/
  src/ra/
    build_data.py          Main ETL — fetches prices + news, writes JSON
    portfolio.py           Returns, drawdown, volatility, beta calculations
    sentiment.py           FinBERT headline scoring
  tests/
    test_portfolio.py      Unit tests for portfolio metrics
```

## Running locally

**Frontend**
```bash
cd apps/web
npm install
npm run dev
# → http://localhost:3000
```

**Data pipeline** (regenerates the JSON the frontend reads)
```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -e .
python -m ra.build_data
```

**Tests**
```bash
cd pipeline
pytest
```
