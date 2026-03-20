"use client";

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

function formatMonthLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short" });
}

function formatDollar(v: number) {
  return `$${v.toFixed(2)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1a1a2e",
        border: "1px solid #334",
        borderRadius: 6,
        padding: "6px 12px",
        fontSize: 13,
        color: "#e2e8f0",
      }}
    >
      <p style={{ margin: 0, opacity: 0.7 }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 700 }}>{formatDollar(payload[0].value)}</p>
    </div>
  );
}

export default function PriceChart({ data }: { data: PricePoint[] }) {
  if (!data?.length) return null;

  // Show a tick roughly every 21 trading days (~1 month)
  const tickIndices = new Set<number>();
  for (let i = 0; i < data.length; i += 21) tickIndices.add(i);

  const minClose = Math.min(...data.map((d) => d.close));
  const maxClose = Math.max(...data.map((d) => d.close));
  const pad = (maxClose - minClose) * 0.05;

  return (
    <div style={{ marginTop: 28, marginBottom: 8 }}>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>1-Year Price</h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
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
            domain={[minClose - pad, maxClose + pad]}
            tickFormatter={(v) => `$${Math.round(v)}`}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#6366f1" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
