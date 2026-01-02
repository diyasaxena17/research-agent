export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>
        Equity Research Agent + Portfolio Monitor
      </h1>
      <p style={{ fontSize: 16, maxWidth: 720 }}>
        A beginner-built finance project that generates research packs for tickers
        (price stats, drawdown, news sentiment) and portfolio analytics.
      </p>

      <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 12, maxWidth: 720 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Status</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>✅ Deployed on Vercel</li>
          <li>⏳ Data pipeline (Python) starts Day 2</li>
          <li>⏳ FinBERT sentiment (PyTorch) starts Day 4</li>
        </ul>
      </div>
    </main>
  );
}
