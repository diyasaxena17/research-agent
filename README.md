# Equity Research Agent + Portfolio Monitor

A deployable finance project that generates research packs for tickers (performance, drawdown, news sentiment) and portfolio analytics.

## Live Demo
- research-agent-ai.vercel.app

## Features (MVP Plan)
- Watchlist dashboard (returns, drawdown, volatility)
- Ticker “research pack” pages
- Portfolio analytics vs benchmark
- AI sentiment on headlines (FinBERT, PyTorch)

## Tech Stack
- Next.js (TypeScript) + Vercel deployment
- Python analytics pipeline (pandas/numpy)
- PyTorch + Transformers (FinBERT sentiment)
- GitHub Actions CI (tests + lint)

## Repo Structure
- `apps/web`: Next.js frontend (Vercel)
- `pipeline`: Python data + analytics
- `docs`: agent spec + architecture notes

## Roadmap
- Day 2: Portfolio analytics + unit tests
- Day 3: Build data JSON for the frontend
- Day 4: FinBERT sentiment pipeline
- Day 5: Research pack UI
- Day 6: GitHub Actions CI + PR checks
- Day 7: polish + screenshots + documentation
