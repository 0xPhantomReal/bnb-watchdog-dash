import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getBnbQuotes } from "@/lib/quotes.functions";
import type { ExchangeQuote } from "@/lib/exchanges";
import { ArrowDownRight, ArrowUpRight, Activity, RefreshCw, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "BNB Live Price Dashboard — Multi-Exchange Tracker" },
      {
        name: "description",
        content:
          "Real-time BNB price across Binance, Coinbase, Kraken, KuCoin, OKX, Bybit, Gate.io and MEXC. Live spreads, volume and a free public API.",
      },
    ],
  }),
});

const fmtUsd = (n: number | null, digits = 2) =>
  n == null
    ? "—"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

const fmtCompact = (n: number | null) =>
  n == null
    ? "—"
    : "$" +
      Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);

function Dashboard() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["bnb-quotes"],
    queryFn: () => getBnbQuotes(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const quotes = data?.quotes ?? [];
  const valid = quotes.filter((q) => q.price != null);
  const prices = valid.map((q) => q.price!);
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const spread = min != null && max != null ? max - min : null;
  const spreadPct = spread != null && min ? (spread / min) * 100 : null;
  const totalVol = valid.reduce((a, q) => a + (q.volume24h ?? 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black text-primary-foreground"
              style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
            >
              ◆
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">BNB Pulse</h1>
              <p className="text-sm text-muted-foreground">
                Live price across major exchanges
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LiveDot active={!isFetching} />
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-secondary-foreground transition hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Average price" value={fmtUsd(avg, 4)} accent />
          <StatCard label="Spread (high − low)" value={fmtUsd(spread, 4)} sub={spreadPct != null ? `${spreadPct.toFixed(3)}%` : "—"} />
          <StatCard label="High / Low" value={`${fmtUsd(max, 2)}`} sub={`Low ${fmtUsd(min, 2)}`} />
          <StatCard label="24h volume (sum)" value={fmtCompact(totalVol)} sub={`${valid.length}/${quotes.length} feeds live`} />
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Exchange feed</h2>
            <p className="text-xs text-muted-foreground">
              Updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—"} · auto every 5s
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div className="col-span-3">Exchange</div>
              <div className="col-span-3 text-right">Price</div>
              <div className="col-span-2 text-right">vs Avg</div>
              <div className="col-span-2 text-right">24h</div>
              <div className="col-span-2 text-right">Volume</div>
            </div>
            {isLoading && quotes.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse border-b border-border bg-muted/20" />
                ))
              : quotes.map((q) => (
                  <Row key={q.exchange} q={q} avg={avg} min={min} max={max} />
                ))}
          </div>
        </section>

        <ApiSection />

        <footer className="mt-12 pb-6 text-center text-xs text-muted-foreground">
          Data pulled directly from public exchange APIs. Not financial advice.
        </footer>
      </div>
    </div>
  );
}

function LiveDot({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
            active ? "animate-ping bg-[oklch(0.74_0.18_152)]" : "bg-muted-foreground"
          }`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            active ? "bg-[oklch(0.74_0.18_152)]" : "bg-muted-foreground"
          }`}
        />
      </span>
      Live
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-5"
      style={accent ? { boxShadow: "var(--shadow-gold)" } : undefined}
    >
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-2 text-2xl font-bold tabular-nums ${accent ? "text-primary" : ""}`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Row({
  q,
  avg,
  min,
  max,
}: {
  q: ExchangeQuote;
  avg: number | null;
  min: number | null;
  max: number | null;
}) {
  const prev = useRef<number | null>(q.price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (q.price == null) return;
    if (prev.current != null && prev.current !== q.price) {
      setFlash(q.price > prev.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 700);
      prev.current = q.price;
      return () => clearTimeout(t);
    }
    prev.current = q.price;
  }, [q.price]);

  const diff = q.price != null && avg != null ? q.price - avg : null;
  const diffPct = diff != null && avg ? (diff / avg) * 100 : null;
  const isMin = q.price != null && q.price === min;
  const isMax = q.price != null && q.price === max;

  const flashCls =
    flash === "up"
      ? "bg-[oklch(0.74_0.18_152_/_0.12)]"
      : flash === "down"
        ? "bg-[oklch(0.65_0.22_25_/_0.12)]"
        : "";

  return (
    <a
      href={q.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`grid grid-cols-12 items-center gap-2 border-b border-border px-5 py-4 text-sm transition-colors last:border-0 hover:bg-muted/40 ${flashCls}`}
    >
      <div className="col-span-3 flex items-center gap-2">
        <span className="font-medium">{q.exchange}</span>
        <span className="text-xs text-muted-foreground">{q.pair}</span>
        {isMax && (
          <span className="rounded-md bg-[oklch(0.74_0.18_152_/_0.15)] px-1.5 py-0.5 text-[10px] font-medium text-[oklch(0.82_0.18_152)]">
            HIGH
          </span>
        )}
        {isMin && (
          <span className="rounded-md bg-[oklch(0.65_0.22_25_/_0.15)] px-1.5 py-0.5 text-[10px] font-medium text-[oklch(0.78_0.2_25)]">
            LOW
          </span>
        )}
        <ExternalLink className="h-3 w-3 opacity-40" />
      </div>
      <div className="col-span-3 text-right font-semibold tabular-nums">
        {q.error ? <span className="text-xs text-destructive">{q.error}</span> : fmtUsd(q.price, 4)}
      </div>
      <div
        className={`col-span-2 text-right text-xs tabular-nums ${
          diffPct == null
            ? "text-muted-foreground"
            : diffPct >= 0
              ? "text-[oklch(0.82_0.18_152)]"
              : "text-[oklch(0.78_0.2_25)]"
        }`}
      >
        {diffPct == null ? "—" : `${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(3)}%`}
      </div>
      <ChangeCell pct={q.change24h} />
      <div className="col-span-2 text-right text-xs tabular-nums text-muted-foreground">
        {fmtCompact(q.volume24h)}
      </div>
    </a>
  );
}

function ChangeCell({ pct }: { pct: number | null }) {
  if (pct == null)
    return <div className="col-span-2 text-right text-xs text-muted-foreground">—</div>;
  const up = pct >= 0;
  return (
    <div
      className={`col-span-2 flex items-center justify-end gap-1 text-xs tabular-nums ${
        up ? "text-[oklch(0.82_0.18_152)]" : "text-[oklch(0.78_0.2_25)]"
      }`}
    >
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {up ? "+" : ""}
      {pct.toFixed(2)}%
    </div>
  );
}

function ApiSection() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/public/bnb`;

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Public API</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        A live, no-auth JSON endpoint that aggregates BNB prices from every exchange shown above.
        Includes average, min, max and per-exchange breakdown.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3">
        <code className="text-xs text-foreground">GET {url || "/api/public/bnb"}</code>
      </div>
      <div className="mt-3">
        <a
          href="/api/public/bnb"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Open endpoint <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  );
}
