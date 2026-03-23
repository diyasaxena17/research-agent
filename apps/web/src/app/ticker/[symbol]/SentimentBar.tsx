type Counts = { positive: number; neutral: number; negative: number };

export default function SentimentBar({
  counts,
  total,
}: {
  counts: Counts;
  total: number;
}) {
  if (total === 0) {
    return <p className="text-sm text-slate-500">No headlines scored yet.</p>;
  }

  const pos = (counts.positive / total) * 100;
  const neu = (counts.neutral / total) * 100;
  const neg = (counts.negative / total) * 100;

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div style={{ width: `${pos}%` }} className="bg-emerald-500" />
        <div style={{ width: `${neu}%` }} className="bg-slate-400" />
        <div style={{ width: `${neg}%` }} className="bg-red-500" />
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-5 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
          Positive&nbsp;{counts.positive}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-slate-400" />
          Neutral&nbsp;{counts.neutral}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-red-500" />
          Negative&nbsp;{counts.negative}
        </span>
      </div>
    </div>
  );
}
