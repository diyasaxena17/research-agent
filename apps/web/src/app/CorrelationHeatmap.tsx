type CorrelationMatrix = {
  tickers: string[];
  values: number[][];
};

/**
 * Map a correlation value (-1 to +1) to a background + text colour.
 *
 * Diagonal cells (value === 1.0 with same row/col ticker) get a distinct
 * slate colour so it's obvious they're not meaningful.
 */
function cellStyle(
  value: number,
  isDiagonal: boolean
): { background: string; color: string } {
  if (isDiagonal) {
    return { background: "hsl(215, 16%, 30%)", color: "#cbd5e1" };
  }
  if (value >= 0) {
    // 0 → near-white, 1 → deep green
    const lightness = 96 - value * 55;
    return {
      background: `hsl(142, 72%, ${lightness}%)`,
      color: value > 0.55 ? "#fff" : "#1e293b",
    };
  }
  // 0 → near-white, -1 → deep red
  const lightness = 96 + value * 45;
  return {
    background: `hsl(0, 72%, ${lightness}%)`,
    color: value < -0.55 ? "#fff" : "#1e293b",
  };
}

export default function CorrelationHeatmap({ matrix }: { matrix: CorrelationMatrix }) {
  const { tickers, values } = matrix;

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-semibold">Return Correlation</h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Pairwise Pearson correlation of daily returns over the past year.
        Values near <span className="font-medium text-emerald-600">+1</span> move
        together; near <span className="font-medium text-red-500">−1</span> move
        opposite. High correlation across all holdings means poor diversification.
      </p>

      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              {/* Empty top-left corner */}
              <th className="w-14" />
              {tickers.map((t) => (
                <th
                  key={t}
                  className="w-20 pb-2 text-center font-mono text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickers.map((rowTicker, r) => (
              <tr key={rowTicker}>
                {/* Row label */}
                <td className="pr-2 text-right font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {rowTicker}
                </td>

                {values[r].map((val, c) => {
                  const style = cellStyle(val, r === c);
                  return (
                    <td
                      key={c}
                      title={`${rowTicker} / ${tickers[c]}: ${val.toFixed(4)}`}
                      style={style}
                      className="h-14 w-20 text-center align-middle text-xs font-medium tabular-nums"
                    >
                      {r === c ? "—" : val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Colour legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <span>−1</span>
        <div
          className="h-2.5 w-32 rounded-full"
          style={{
            background:
              "linear-gradient(to right, hsl(0,72%,51%), hsl(0,0%,96%), hsl(142,72%,41%))",
          }}
        />
        <span>+1</span>
      </div>
    </section>
  );
}
