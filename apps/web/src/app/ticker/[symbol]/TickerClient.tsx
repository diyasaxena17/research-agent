"use client";

import { useEffect, useState } from "react";
import PriceChart from "./PriceChart";
import DrawdownChart from "./DrawdownChart";
import SentimentBar from "./SentimentBar";

type TickerData = {
  ticker: string;
  asOf: string;
  metrics: {
    cumulativeReturn: number;
    maxDrawdown: number;
    annualizedVolatility: number;
    betaVsBenchmark: number | null;
    lastClose: number;
  };
  priceSeries: { date: string; close: number }[];
  news?: {
    headlines: {
      title: string;
      url?: string;
      publisher?: string;
      sentiment?: "positive" | "neutral" | "negative";
      sentimentScore?: number;
    }[];
    sentimentSummary: {
      counts: { positive: number; neutral: number; negative: number };
      ratios: { positive: number; neutral: number; negative: number };
      total: number;
    };
  };
};

function pct(x: number) {
  return `${(x * 100).toFixed(2)}%`;
}

const sentimentBadge: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  neutral:  "bg-slate-100  text-slate-600  dark:bg-slate-700      dark:text-slate-300",
  negative: "bg-red-100    text-red-700    dark:bg-red-900/40     dark:text-red-400",
};

export default function TickerClient({ symbol }: { symbol: string }) {
  const [data, setData] = useState<TickerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/data/tickers/${symbol}.json`)
      .then((r) => {
        if (!r.ok)
          throw new Error(
            `No data found for ${symbol}. Run: python -m ra.build_data`
          );
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [symbol]);

  return (
    <main className="mx-auto max-w-3xl p-6 font-sans">
      <a
        href="/"
        className="text-sm text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-300"
      >
        ← Back
      </a>

      <h1 className="mb-1 mt-3 text-2xl font-bold tracking-tight">
        {symbol} Research Pack
      </h1>

      {!data && !error && (
        <p className="mt-4 text-slate-500">Loading…</p>
      )}
      {error && (
        <p className="mt-4 text-red-500">{error}</p>
      )}

      {data && (
        <>
          <p className="mb-4 text-xs text-slate-400">
            As of: {new Date(data.asOf).toLocaleString()}
          </p>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Last Close",   value: `$${data.metrics.lastClose.toFixed(2)}` },
              { label: "1Y Return",    value: pct(data.metrics.cumulativeReturn),    positive: data.metrics.cumulativeReturn > 0 },
              { label: "Max Drawdown", value: pct(data.metrics.maxDrawdown),         positive: false },
              { label: "Ann. Vol",     value: pct(data.metrics.annualizedVolatility) },
            ].map(({ label, value, positive }) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p
                  className={`mt-0.5 text-lg font-semibold tabular-nums ${
                    positive === true
                      ? "text-emerald-600 dark:text-emerald-400"
                      : positive === false && label !== "Ann. Vol"
                      ? "text-red-500 dark:text-red-400"
                      : ""
                  }`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <PriceChart data={data.priceSeries} />
          <DrawdownChart data={data.priceSeries} />

          {/* News & Sentiment */}
          {data.news && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">
                News &amp; Sentiment
                <span className="ml-2 text-xs font-normal text-slate-400">
                  (FinBERT)
                </span>
              </h2>

              <SentimentBar
                counts={data.news.sentimentSummary.counts}
                total={data.news.sentimentSummary.total}
              />

              <ul className="mt-4 space-y-2">
                {data.news.headlines.map((h, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm"
                  >
                    {h.sentiment && (
                      <span
                        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                          sentimentBadge[h.sentiment] ?? sentimentBadge.neutral
                        }`}
                      >
                        {h.sentiment}
                      </span>
                    )}
                    <span>
                      {h.url ? (
                        <a
                          href={h.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-indigo-500"
                        >
                          {h.title}
                        </a>
                      ) : (
                        h.title
                      )}
                      {h.publisher && (
                        <span className="ml-1.5 text-slate-400">
                          — {h.publisher}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
