import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Rocket, Zap, Wallet, Trophy, Users, Flame, ShieldCheck, Coins,
  ArrowUpRight, X, TrendingUp, Radio, Skull,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: PerpsFun,
  head: () => ({
    meta: [
      { title: "perps.fun — ride the pump, dodge the rug" },
      {
        name: "description",
        content:
          "perps.fun · the on-chain perps crash game. Long BTC/ETH/SOL with leverage, cash out before the rug. Stake $PERPS, earn the house's cut.",
      },
    ],
  }),
});

/* ---------- palette (self-contained neon casino, independent of theme tokens) ---------- */
const C = {
  bg: "#05070d",
  panel: "#0b0f18",
  panel2: "#0f1420",
  border: "#1b2333",
  text: "#e8eef7",
  muted: "#7c88a0",
  green: "#25f08a",
  cyan: "#22d3ee",
  pink: "#ff3d8b",
  amber: "#ffb020",
  red: "#ff4d5e",
  purple: "#a970ff",
};
const glow = (c: string, s = 18) => ({ boxShadow: `0 0 ${s}px ${c}44, 0 0 ${s * 2}px ${c}22` });
const tglow = (c: string, s = 16) => ({ textShadow: `0 0 ${s}px ${c}cc` });

const MARKETS = [
  { sym: "BTC", name: "Bitcoin", base: 97250, color: C.amber },
  { sym: "ETH", name: "Ethereum", base: 3420, color: C.cyan },
  { sym: "SOL", name: "Solana", base: 238, color: C.purple },
];

const NAMES = ["degenape", "0xLiquid", "rugsurvivor", "maxpain", "jeetkiller", "gwei_god", "satoshis_bane", "aped_in", "exitliquidity", "20xOrDie", "cope_harder", "wenlambo", "paperhands", "diamond.eth", "notfinancial", "leverage_lord", "ser_pump", "rekt_again", "moonboi", "fatfingered"];

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtUsd = (n: number, d = 2) => "$" + fmt(n, d);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// crash-game distribution: heavy tail, median ~2x, capped
function nextCrash() {
  const r = Math.random();
  if (r < 0.04) return 1.0 + Math.random() * 0.08; // instant rug
  const cp = 0.96 / (1 - r);
  return Math.min(48, Math.max(1.05, Math.round(cp * 100) / 100));
}

type Bet = { placed: boolean; entry: number; cashed: boolean; cashMult: number; amount: number; lev: number; result: null | "win" | "rug" };
type Feed = { id: number; user: string; sym: string; amount: number; mult: number; win: boolean; live: boolean };

function PerpsFun() {
  const [, tick] = useState(0);
  const force = () => tick((t) => (t + 1) % 1e9);

  const [market, setMarket] = useState(0);
  const [amount, setAmount] = useState(50);
  const [lev, setLev] = useState(10);
  const [balance, setBalance] = useState(1000);
  const [connected, setConnected] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depAmt, setDepAmt] = useState(2500);
  const [staked, setStaked] = useState(0);
  const [flash, setFlash] = useState<null | "win" | "rug">(null);

  const [prices, setPrices] = useState(MARKETS.map((m) => m.base));
  const [recent, setRecent] = useState<number[]>(() => Array.from({ length: 18 }, () => nextCrash()));
  const [feed, setFeed] = useState<Feed[]>([]);
  const [board] = useState(() =>
    NAMES.slice(0, 8).map((u) => ({ user: u, profit: rand(2000, 145000), roi: rand(120, 4200) })).sort((a, b) => b.profit - a.profit),
  );

  // live game state in a ref (70ms loop) to avoid re-creating the interval
  const g = useRef({
    phase: "starting" as "running" | "crashed" | "starting",
    mult: 1,
    crash: nextCrash(),
    pts: [] as { x: number; y: number }[],
    start: Date.now(),
    count: 4,
    bet: { placed: false, entry: 1, cashed: false, cashMult: 0, amount: 0, lev: 10, result: null } as Bet,
    nextBet: null as null | { amount: number; lev: number },
  });

  const balRef = useRef(balance); balRef.current = balance;
  const feedId = useRef(1);

  const pushFeed = (f: Omit<Feed, "id">) =>
    setFeed((prev) => [{ ...f, id: feedId.current++ }, ...prev].slice(0, 14));

  useEffect(() => {
    const yOf = (m: number) => 96 - (Math.log(m) / Math.log(14)) * 90;
    const loop = setInterval(() => {
      const s = g.current;
      const now = Date.now();
      if (s.phase === "running") {
        const t = (now - s.start) / 1000;
        s.mult = Math.pow(Math.E, 0.19 * t);
        const x = Math.min(t * 11, 100);
        s.pts.push({ x, y: yOf(s.mult) });
        if (s.pts.length > 400) s.pts.shift();
        if (s.mult >= s.crash) {
          s.mult = s.crash;
          s.phase = "crashed";
          setRecent((r) => [Math.round(s.crash * 100) / 100, ...r].slice(0, 18));
          // settle player bet
          if (s.bet.placed && !s.bet.cashed) {
            s.bet.result = "rug";
            setFlash("rug"); setTimeout(() => setFlash(null), 900);
            pushFeed({ user: "you", sym: MARKETS[market].sym, amount: s.bet.amount, mult: s.crash, win: false, live: false });
          }
          setTimeout(() => {
            const ns = g.current;
            ns.phase = "starting"; ns.count = 4; ns.start = Date.now();
            ns.bet = { placed: false, entry: 1, cashed: false, cashMult: 0, amount: 0, lev, result: null };
            force();
          }, 1900);
        }
      } else if (s.phase === "starting") {
        s.count = Math.max(0, 4 - (now - s.start) / 1000);
        if (s.count <= 0) {
          s.phase = "running"; s.mult = 1; s.pts = [{ x: 0, y: yOf(1) }]; s.crash = nextCrash(); s.start = Date.now();
          if (s.nextBet) {
            s.bet = { placed: true, entry: 1, cashed: false, cashMult: 0, amount: s.nextBet.amount, lev: s.nextBet.lev, result: null };
            s.nextBet = null;
          }
        }
      }
      force();
    }, 70);

    // price ticker
    const pr = setInterval(() => {
      setPrices((p) => p.map((v, i) => Math.max(1, v * (1 + rand(-0.0011, 0.0012)))));
    }, 900);

    // fake bettor feed
    const fd = setInterval(() => {
      const win = Math.random() > 0.42;
      pushFeed({ user: pick(NAMES), sym: pick(MARKETS).sym, amount: Math.round(rand(10, 3000)), mult: Math.round(rand(1.1, win ? 12 : 3) * 100) / 100, win, live: false });
    }, 1400);

    return () => { clearInterval(loop); clearInterval(pr); clearInterval(fd); };
  }, [market, lev]);

  const s = g.current;
  const running = s.phase === "running";
  const live = s.bet.placed && !s.bet.cashed && running;
  const potential = live ? s.bet.amount * (1 + s.bet.lev * (s.mult - 1)) : 0;

  const placeBet = () => {
    if (amount <= 0 || amount > balance) return;
    setBalance((b) => b - amount);
    if (running) {
      g.current.bet = { placed: true, entry: s.mult, cashed: false, cashMult: 0, amount, lev, result: null };
    } else {
      g.current.nextBet = { amount, lev };
    }
    force();
  };
  const cashOut = () => {
    const b = g.current.bet;
    if (!b.placed || b.cashed || !running) return;
    b.cashed = true; b.cashMult = s.mult; b.result = "win";
    const payout = b.amount * (1 + b.lev * (s.mult - 1));
    setBalance((v) => v + payout);
    setFlash("win"); setTimeout(() => setFlash(null), 900);
    pushFeed({ user: "you", sym: MARKETS[market].sym, amount: b.amount, mult: Math.round(s.mult * 100) / 100, win: true, live: false });
    force();
  };
  const doDeposit = () => { setStaked((v) => v + depAmt); setDepositOpen(false); };

  const multColor = s.phase === "crashed" ? C.red : s.mult < 2 ? C.green : s.mult < 5 ? C.amber : C.pink;
  const curve = s.pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  const TVL = 4_182_940 + staked;
  const myShare = staked > 0 ? (staked / TVL) * 100 : 0;

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh" }} className="relative overflow-hidden font-sans">
      <style>{`
        @keyframes scrollx { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes pulseGlow { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        @keyframes rise { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform:none } }
        @keyframes shake { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-3px,2px)} 50%{transform:translate(3px,-2px)} 75%{transform:translate(-2px,-2px)} }
        .flick { animation: pulseGlow 2.2s ease-in-out infinite }
        .feedrow { animation: rise .25s ease-out }
        .marq { display:flex; width:max-content; animation: scrollx 32s linear infinite }
        .shake { animation: shake .4s ease-in-out }
        input[type=range]{ -webkit-appearance:none; height:6px; border-radius:99px; background:${C.border}; outline:none }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:18px;height:18px;border-radius:50%;background:${C.green};cursor:pointer;box-shadow:0 0 12px ${C.green}aa }
      `}</style>

      {/* background grid + glow */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: `linear-gradient(${C.border}55 1px, transparent 1px), linear-gradient(90deg, ${C.border}55 1px, transparent 1px)`,
        backgroundSize: "42px 42px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
      }} />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full" style={{ background: `radial-gradient(circle, ${C.green}22, transparent 60%)`, filter: "blur(40px)" }} />

      {/* ---------------- NAV ---------------- */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`, ...glow(C.green, 14) }}>
              <Rocket className="h-5 w-5" style={{ color: "#04110b" }} />
            </div>
            <span className="text-xl font-black tracking-tight" style={tglow(C.green, 10)}>
              perps<span style={{ color: C.green }}>.fun</span>
            </span>
          </div>
          <nav className="hidden items-center gap-5 text-sm md:flex" style={{ color: C.muted }}>
            {["Play", "Vault", "Leaderboard", "Docs"].map((l) => (
              <a key={l} href="#" className="transition-colors hover:text-white">{l}</a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm sm:flex" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <Wallet className="h-4 w-4" style={{ color: C.green }} />
            <span className="font-mono font-semibold">{fmtUsd(balance)}</span>
          </div>
          <button
            onClick={() => setConnected((v) => !v)}
            className="rounded-lg px-4 py-2 text-sm font-bold transition-transform active:scale-95"
            style={{ background: connected ? C.panel2 : `linear-gradient(135deg, ${C.green}, ${C.cyan})`, color: connected ? C.green : "#04110b", border: connected ? `1px solid ${C.green}55` : "none", ...(connected ? {} : glow(C.green, 12)) }}
          >
            {connected ? "0x7a…4f2 ✓" : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* ---------------- TICKER ---------------- */}
      <div className="relative z-10 border-y" style={{ borderColor: C.border, background: C.panel }}>
        <div className="overflow-hidden py-2">
          <div className="marq gap-8 px-4 text-xs" style={{ color: C.muted }}>
            {[...Array(2)].map((_, k) => (
              <div key={k} className="flex gap-8">
                <Tk label="24H VOLUME" v="$48,209,417" c={C.green} />
                <Tk label="TOTAL WAGERED" v="$1,204,882,013" c={C.cyan} />
                <Tk label="BIGGEST WIN 24H" v="$284,109 @ 41.2x" c={C.pink} />
                <Tk label="PLAYERS ONLINE" v="7,412" c={C.amber} />
                <Tk label="$PERPS" v="$0.0428  +18.4%" c={C.green} />
                <Tk label="ROUNDS PLAYED" v="9,441,207" c={C.purple} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- MAIN ---------------- */}
      <main className="relative z-10 mx-auto max-w-7xl px-5 py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* ===== GAME ===== */}
          <section className="space-y-4">
            {/* market tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {MARKETS.map((m, i) => (
                <button key={m.sym} onClick={() => setMarket(i)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-all"
                  style={{ background: market === i ? C.panel2 : C.panel, border: `1px solid ${market === i ? m.color + "88" : C.border}`, ...(market === i ? glow(m.color, 8) : {}) }}>
                  <span style={{ color: m.color }}>{m.sym}</span>
                  <span className="font-mono text-xs" style={{ color: C.muted }}>{fmtUsd(prices[i], prices[i] > 1000 ? 0 : 2)}</span>
                </button>
              ))}
              <span className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: C.green }}>
                <Radio className="h-3.5 w-3.5 flick" /> LIVE
              </span>
            </div>

            {/* crash chart */}
            <div className={`relative overflow-hidden rounded-2xl p-4 ${s.phase === "crashed" ? "shake" : ""}`}
              style={{ background: `radial-gradient(ellipse at 50% 120%, ${multColor}18, ${C.panel} 70%)`, border: `1px solid ${s.phase === "crashed" ? C.red + "66" : C.border}`, height: 380 }}>
              {/* big multiplier */}
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
                {s.phase === "crashed" ? (
                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center gap-2 text-sm font-bold tracking-widest" style={{ color: C.red }}>
                      <Skull className="h-5 w-5" /> RUGGED
                    </div>
                    <div className="font-mono text-6xl font-black md:text-7xl" style={{ color: C.red, ...tglow(C.red, 24) }}>{fmt(s.crash)}x</div>
                  </div>
                ) : s.phase === "starting" ? (
                  <div className="text-center">
                    <div className="mb-1 text-xs font-bold tracking-widest" style={{ color: C.muted }}>NEXT ROUND IN</div>
                    <div className="font-mono text-6xl font-black" style={{ color: C.cyan, ...tglow(C.cyan, 18) }}>{s.count.toFixed(1)}s</div>
                    <div className="mt-2 text-xs" style={{ color: C.muted }}>place your bet ↓</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="font-mono text-7xl font-black tabular-nums md:text-8xl" style={{ color: multColor, ...tglow(multColor, 22) }}>{fmt(s.mult)}x</div>
                    {live && <div className="mt-1 font-mono text-lg font-bold" style={{ color: C.green }}>+{fmtUsd(potential - s.bet.amount)}</div>}
                  </div>
                )}
              </div>
              {/* svg curve */}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={multColor} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={multColor} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {s.pts.length > 1 && (
                  <>
                    <polygon points={`0,100 ${curve} ${s.pts[s.pts.length - 1].x},100`} fill="url(#fill)" />
                    <polyline points={curve} fill="none" stroke={multColor} strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${multColor})` }} />
                    {running && <circle cx={s.pts[s.pts.length - 1].x} cy={s.pts[s.pts.length - 1].y} r="1.4" fill={multColor} style={{ filter: `drop-shadow(0 0 5px ${multColor})` }} />}
                  </>
                )}
              </svg>
            </div>

            {/* recent rounds */}
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="shrink-0 text-xs font-semibold" style={{ color: C.muted }}>LAST ROUNDS</span>
              <div className="flex gap-1.5 overflow-hidden">
                {recent.map((r, i) => (
                  <span key={i} className="shrink-0 rounded-md px-2 py-1 font-mono text-xs font-bold"
                    style={{ background: C.panel, border: `1px solid ${r < 1.5 ? C.red + "55" : r < 3 ? C.border : C.green + "55"}`, color: r < 1.5 ? C.red : r < 3 ? C.text : C.green }}>
                    {fmt(r)}x
                  </span>
                ))}
              </div>
            </div>

            {/* live feed */}
            <div className="rounded-2xl p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold"><Flame className="h-4 w-4" style={{ color: C.pink }} /> Live Bets</div>
              <div className="space-y-1.5">
                {feed.length === 0 && <div className="py-6 text-center text-xs" style={{ color: C.muted }}>waiting for degens…</div>}
                {feed.map((f) => (
                  <div key={f.id} className="feedrow flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: f.user === "you" ? C.green + "12" : C.panel2 }}>
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold" style={{ background: C.border, color: f.user === "you" ? C.green : C.muted }}>{f.user.slice(0, 2)}</span>
                      <span className="font-medium" style={{ color: f.user === "you" ? C.green : C.text }}>{f.user}</span>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: C.border, color: C.muted }}>{f.sym}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span style={{ color: C.muted }}>{fmtUsd(f.amount)}</span>
                      <span className="font-bold" style={{ color: f.win ? C.green : C.red }}>{f.win ? `▲ ${fmt(f.mult)}x` : `✕ ${fmt(f.mult)}x`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== BET PANEL ===== */}
          <aside className="space-y-4">
            <div className="rounded-2xl p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold">Open Position</span>
                <span className="font-mono text-xs" style={{ color: C.muted }}>bal {fmtUsd(balance)}</span>
              </div>

              <label className="mb-1 block text-xs" style={{ color: C.muted }}>Amount (USDC)</label>
              <div className="mb-3 flex items-center gap-2">
                <input type="number" value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg px-3 py-2 font-mono text-sm outline-none" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text }} />
                {[10, 50, 100].map((v) => (
                  <button key={v} onClick={() => setAmount(v)} className="rounded-lg px-2.5 py-2 text-xs font-bold" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.muted }}>{v}</button>
                ))}
                <button onClick={() => setAmount(Math.floor(balance))} className="rounded-lg px-2.5 py-2 text-xs font-bold" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.green }}>MAX</button>
              </div>

              <div className="mb-1 flex items-center justify-between text-xs" style={{ color: C.muted }}>
                <span>Leverage</span>
                <span className="font-mono font-bold" style={{ color: lev >= 50 ? C.red : lev >= 20 ? C.amber : C.green }}>{lev}x</span>
              </div>
              <input type="range" min={1} max={100} value={lev} onChange={(e) => setLev(Number(e.target.value))} className="mb-1 w-full" />
              <div className="mb-4 flex justify-between text-[10px]" style={{ color: C.muted }}><span>1x</span><span>safu</span><span>degen</span><span>100x</span></div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                <Stat label="Est. liq @" v={`${fmt(1 + 1 / lev)}x`} c={C.red} />
                <Stat label="Payout / 2x" v={fmtUsd(amount * (1 + lev * 1))} c={C.green} />
              </div>

              {live ? (
                <button onClick={cashOut} className="w-full rounded-xl py-3.5 text-base font-black transition-transform active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`, color: "#04110b", ...glow(C.green, 16) }}>
                  CASH OUT · {fmtUsd(potential)}
                </button>
              ) : g.current.nextBet ? (
                <button disabled className="w-full rounded-xl py-3.5 text-base font-black" style={{ background: C.panel2, color: C.amber, border: `1px solid ${C.amber}55` }}>
                  QUEUED FOR NEXT ROUND…
                </button>
              ) : (
                <button onClick={placeBet} disabled={amount <= 0 || amount > balance}
                  className="w-full rounded-xl py-3.5 text-base font-black transition-transform active:scale-95 disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`, color: "#04110b", ...glow(C.green, 16) }}>
                  {running ? "APE IN NOW" : "PLACE BET"} · {lev}x
                </button>
              )}
              <p className="mt-2 text-center text-[10px]" style={{ color: C.muted }}>cash out before the rug or get liquidated 💀</p>
            </div>

            {/* $PERPS vault */}
            <div className="rounded-2xl p-4" style={{ background: `linear-gradient(160deg, ${C.purple}14, ${C.panel})`, border: `1px solid ${C.purple}44`, ...glow(C.purple, 6) }}>
              <div className="mb-1 flex items-center gap-2 text-sm font-bold"><Coins className="h-4 w-4" style={{ color: C.purple }} /> $PERPS Revenue Vault</div>
              <p className="mb-3 text-xs" style={{ color: C.muted }}>Stake $PERPS to earn a real-time share of every round's house edge. Paid in USDC, claimable anytime.</p>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Stat label="Vault TVL" v={fmtUsd(TVL, 0)} c={C.text} />
                <Stat label="Est. APR" v="142.7%" c={C.green} />
                <Stat label="Your stake" v={staked ? `${fmt(staked, 0)} $PERPS` : "—"} c={C.text} />
                <Stat label="Your share" v={myShare ? `${myShare.toFixed(3)}%` : "—"} c={C.purple} />
              </div>
              {staked > 0 && (
                <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: C.green + "12", color: C.green }}>
                  earning ≈ {fmtUsd((TVL * 0.0011 * myShare) / 100 + 0.42)} / day · claimable now
                </div>
              )}
              <button onClick={() => setDepositOpen(true)} className="w-full rounded-xl py-3 text-sm font-black transition-transform active:scale-95"
                style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`, color: "#fff", ...glow(C.purple, 12) }}>
                Deposit $PERPS
              </button>
            </div>

            {/* leaderboard */}
            <div className="rounded-2xl p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold"><Trophy className="h-4 w-4" style={{ color: C.amber }} /> Top Degens · 24h</div>
              <div className="space-y-1">
                {board.map((r, i) => (
                  <div key={r.user} className="flex items-center justify-between py-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 font-mono text-xs font-bold" style={{ color: i === 0 ? C.amber : i === 1 ? "#c9d1d9" : i === 2 ? "#cd7f32" : C.muted }}>#{i + 1}</span>
                      <span className="font-medium">{r.user}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span style={{ color: C.muted }}>{r.roi.toFixed(0)}%</span>
                      <span className="font-bold" style={{ color: C.green }}>{fmtUsd(r.profit, 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* stat row */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Big icon={<TrendingUp className="h-5 w-5" />} label="24h Volume" v="$48.2M" c={C.green} />
          <Big icon={<Users className="h-5 w-5" />} label="Players Online" v="7,412" c={C.cyan} />
          <Big icon={<Zap className="h-5 w-5" />} label="Rounds / min" v="38" c={C.amber} />
          <Big icon={<ShieldCheck className="h-5 w-5" />} label="Provably Fair" v="on-chain RNG" c={C.purple} />
        </div>

        {/* how it works */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { i: <Rocket className="h-5 w-5" />, t: "1 · Long the pump", d: "Pick BTC, ETH or SOL. Set your size and leverage. The multiplier starts climbing the moment the round goes live." },
            { i: <Wallet className="h-5 w-5" />, t: "2 · Cash out in time", d: "Your position grows with the multiplier. Hit CASH OUT to lock the gain — wait too long and the rug liquidates you." },
            { i: <Coins className="h-5 w-5" />, t: "3 · Stake $PERPS", d: "Stakers earn the platform's cut of every round in real time. The house edge becomes your yield." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl p-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg" style={{ background: C.panel2, color: C.green }}>{c.i}</div>
              <div className="mb-1 font-bold">{c.t}</div>
              <p className="text-sm" style={{ color: C.muted }}>{c.d}</p>
            </div>
          ))}
        </div>
      </main>

      {/* footer */}
      <footer className="relative z-10 mt-8 border-t px-5 py-8" style={{ borderColor: C.border }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4" style={{ color: C.green }} />
            <span className="font-black">perps<span style={{ color: C.green }}>.fun</span></span>
          </div>
          <div className="flex gap-5 text-xs" style={{ color: C.muted }}>
            {["Docs", "Provably Fair", "$PERPS", "X / Twitter", "Discord"].map((l) => <a key={l} href="#" className="hover:text-white">{l}</a>)}
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[10px]" style={{ color: C.muted }}>
          perps.fun is a demo/entertainment interface. Nothing here is a real financial product, exchange, or investment. No real funds, orders, or yields. For the memes. 🎲
        </p>
      </footer>

      {/* flash overlay */}
      {flash && (
        <div className="pointer-events-none fixed inset-0 z-40" style={{ background: flash === "win" ? `radial-gradient(circle at 50% 40%, ${C.green}22, transparent 60%)` : `radial-gradient(circle at 50% 40%, ${C.red}2a, transparent 60%)` }} />
      )}

      {/* deposit modal */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "#000000aa", backdropFilter: "blur(4px)" }} onClick={() => setDepositOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: C.panel, border: `1px solid ${C.purple}55`, ...glow(C.purple, 20) }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold"><Coins className="h-5 w-5" style={{ color: C.purple }} /> Stake $PERPS</div>
              <button onClick={() => setDepositOpen(false)}><X className="h-5 w-5" style={{ color: C.muted }} /></button>
            </div>
            <label className="mb-1 block text-xs" style={{ color: C.muted }}>Amount to stake</label>
            <div className="mb-3 flex items-center gap-2">
              <input type="number" value={depAmt} onChange={(e) => setDepAmt(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg px-3 py-2 font-mono text-sm outline-none" style={{ background: C.panel2, border: `1px solid ${C.border}`, color: C.text }} />
              <span className="font-bold" style={{ color: C.purple }}>$PERPS</span>
            </div>
            <div className="mb-4 space-y-1.5 rounded-lg p-3 text-xs" style={{ background: C.panel2 }}>
              <Row k="Est. share of vault" v={`${((depAmt / (TVL + depAmt)) * 100).toFixed(3)}%`} />
              <Row k="Est. daily revenue" v={fmtUsd((depAmt / (TVL + depAmt)) * 4600)} c={C.green} />
              <Row k="Est. APR" v="142.7%" c={C.green} />
              <Row k="Lock" v="none · unstake anytime" />
            </div>
            <button onClick={doDeposit} className="w-full rounded-xl py-3 text-sm font-black transition-transform active:scale-95"
              style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`, color: "#fff", ...glow(C.purple, 12) }}>
              Confirm Stake · <ArrowUpRight className="mb-0.5 inline h-4 w-4" />
            </button>
            <p className="mt-2 text-center text-[10px]" style={{ color: C.muted }}>demo only — no real tokens are moved</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- small helpers ---------- */
function Tk({ label, v, c }: { label: string; v: string; c: string }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span style={{ color: C.muted }}>{label}</span>
      <span className="font-mono font-semibold" style={{ color: c }}>{v}</span>
    </span>
  );
}
function Stat({ label, v, c }: { label: string; v: string; c: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
      <div className="text-[10px]" style={{ color: C.muted }}>{label}</div>
      <div className="font-mono text-sm font-bold" style={{ color: c }}>{v}</div>
    </div>
  );
}
function Big({ icon, label, v, c }: { icon: ReactNode; label: string; v: string; c: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
      <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg" style={{ background: C.panel2, color: c }}>{icon}</div>
      <div className="text-xs" style={{ color: C.muted }}>{label}</div>
      <div className="font-mono text-xl font-black" style={{ color: c }}>{v}</div>
    </div>
  );
}
function Row({ k, v, c }: { k: string; v: string; c?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: C.muted }}>{k}</span>
      <span className="font-mono font-semibold" style={{ color: c ?? C.text }}>{v}</span>
    </div>
  );
}
