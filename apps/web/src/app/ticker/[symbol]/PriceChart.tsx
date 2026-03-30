"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type PricePoint = { date: string; close: number };
type ChartPoint = { date: string; close: number; sma50: number | null; sma200: number | null };

// SMA(n): average of the last n closes. Returns null for the first n-1 points
// where there isn't enough history yet.
function computeSMA(data: PricePoint[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    const slice = data.slice(i - window + 1, i + 1);
    return slice.reduce((sum, p) => sum + p.close, 0) / window;
  });
}

function formatMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short" });
}

const MA_CONFIG = [
  { key: "sma50",  label: "SMA 50",  colour: "#f59e0b" },
  { key: "sma200", label: "SMA 200", colour: "#ef4444" },
] as const;

interface TooltipPayloadItem {
  name: string;
  value: number | null;
  stroke: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const labels: Record<string, string> = { close: "Price", sma50: "SMA 50", sma200: "SMA 200" };

  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="mb-1 opacity-60">{label}</p>
      {payload.map((entry) =>
        entry.value == null ? null : (
          <p key={entry.name} style={{ color: entry.stroke }} className="font-semibold tabular-nums">
            {labels[entry.name] ?? entry.name}: ${entry.value.toFixed(2)}
          </p>
        )
      )}
    </div>
  );
}

export default function PriceChart({ data }: { data: PricePoint[] }) {
  const [show50, setShow50] = useState(true);
  const [show200, setShow200] = useState(true);

  if (!data?.length) return null;

  const sma50Values  = computeSMA(data, 50);
  const sma200Values = computeSMA(data, 200);

  const chartData: ChartPoint[] = data.map((p, i) => ({
    ...p,
    sma50:  sma50Values[i],
    sma200: sma200Values[i],
  }));

  const tickIndices = new Set<number>();
  for (let i = 0; i < data.length; i += 21) tickIndices.add(i);

  const allValues = [
    ...data.map((d) => d.close),
    ...(show50  ? sma50Values.filter((v): v is number => v !== null)  : []),
    ...(show200 ? sma200Values.filter((v): v is number => v !== null) : []),
  ];
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const pad  = (maxV - minV) * 0.05;

  const toggleState = { sma50: show50, sma200: show200 };
  const toggleFns   = { sma50: setShow50, sma200: setShow200 };

  return (
    <div className="mt-7 mb-2">
      {/* Header + toggles */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">1-Year Price</h2>
        {MA_CONFIG.map(({ key, label, colour }) => (
          <button
            key={key}
            onClick={() => toggleFns[key]((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity ${
              toggleState[key] ? "opacity-100" : "opacity-35"
            }`}
            style={{ borderColor: colour, color: colour }}
          >
            <span
              className="inline-block h-2 w-5 rounded-sm"
              style={{ background: colour }}
            />
            {label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <XAxis
            dataKey="date"
            tickFormatter={formatMonthLabel}
            ticks={data
              .map((d, i) => (tickIndices.has(i) ? d.date : null))
              .filter(Boolean) as string[]}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minV - pad, maxV + pad]}
            tickFormatter={(v) => `$${Math.round(v)}`}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Price line */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#6366f1" }}
          />

          {/* SMA 50 — amber, only drawn where enough data exists */}
          {show50 && (
            <Line
              type="monotone"
              dataKey="sma50"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              connectNulls={false}
            />
          )}

          {/* SMA 200 — red, only the last ~52 points on a 1-year chart */}
          {show200 && (
            <Line
              type="monotone"
              dataKey="sma200"
              stroke="#ef4444"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
