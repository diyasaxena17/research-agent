import TickerClient from "./TickerClient";

export default async function Page({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  return <TickerClient symbol={(symbol ?? "").toUpperCase()} />;
}
