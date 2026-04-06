"use client";

import { useEffect, useRef, useState } from "react";
import PriceChart from "./PriceChart";
import DrawdownChart from "./DrawdownChart";
import RSIChart from "./RSIChart";
import SentimentBar from "./SentimentBar";
import DownloadPDFButton from "./DownloadPDFButton";

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

function BetaCard({ beta }: { beta: number | null }) {
  const colour =
    beta === null
      ? ""
      : beta >= 1.2
      ? "text-amber-600 dark:text-amber-400"
      : beta <= 0.8
      ? "text-blue-600 dark:text-blue-400"
      : "";

  const tooltip =
    beta === null
      ? "Beta not yet computed — re-run the pipeline."
      : beta >= 1.2
      ? `β ${beta.toFixed(2)} — more volatile than the S&P 500. Amplifies both gains and losses.`
      : beta <= 0.8
      ? `β ${beta.toFixed(2)} — defensive. Moves less than the S&P 500.`
      : `β ${beta.toFixed(2)} — tracks the S&P 500 closely.`;

  return (
    <div
      title={tooltip}
      className="cursor-help rounded-lg border border-slate-200 p-3 dark:border-slate-700"
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Beta vs SPY
        <span className="ml-1 text-slate-300 dark:text-slate-600">(?)</span>
      </p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${colour}`}>
        {beta !== null ? beta.toFixed(2) : "—"}
      </p>
    </div>
  );
}

const sentimentBadge: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  neutral:  "bg-slate-100  text-slate-600  dark:bg-slate-700      dark:text-slate-300",
  negative: "bg-red-100    text-red-700    dark:bg-red-900/40     dark:text-red-400",
};

export default function TickerClient({ symbol }: { symbol: string }) {
  const [data, setData] = useState<TickerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/ticker/${symbol}`)
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.error ?? `No data for ${symbol}`);
        setData(body);
      })
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

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {symbol} Research Pack
        </h1>
        {data && (
          <DownloadPDFButton
            targetRef={contentRef}
            filename={`${symbol}-research-pack.pdf`}
          />
        )}
      </div>

      {!data && !error && (
        <div className="mt-4 space-y-4" aria-label="Loading research pack">
          {/* as-of line */}
          <div className="h-3 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          {/* metrics grid — 5 cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
          {/* price chart area */}
          <div className="h-64 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          {/* drawdown chart */}
          <div className="h-44 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          {/* RSI chart */}
          <div className="h-36 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            {symbol} is not in the pre-built dataset
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            Only tickers fetched by the pipeline have research packs. To add{" "}
            <span className="font-mono font-semibold">{symbol}</span>:
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-400">
            <li>
              Open{" "}
              <span className="font-mono">pipeline/src/ra/build_data.py</span>
            </li>
            <li>
              Add <span className="font-mono">&quot;{symbol}&quot;</span> to the{" "}
              <span className="font-mono">WATCHLIST</span> list
            </li>
            <li>
              Run{" "}
              <span className="font-mono">python -m ra.build_data</span>
            </li>
          </ol>
        </div>
      )}

      {data && (
        <div ref={contentRef}>
          <p className="mb-4 text-xs text-slate-400">
            As of: {new Date(data.asOf).toLocaleString()}
          </p>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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

            {/* Beta card */}
            <BetaCard beta={data.metrics.betaVsBenchmark} />
          </div>

          {/* Charts */}
          <PriceChart data={data.priceSeries} />
          <DrawdownChart data={data.priceSeries} />
          <RSIChart data={data.priceSeries} />

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
        </div>
      )}
    </main>
  );
}
