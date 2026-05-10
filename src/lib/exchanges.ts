export type ExchangeQuote = {
  exchange: string;
  pair: string;
  price: number | null;
  volume24h: number | null;
  change24h: number | null;
  url: string;
  error?: string;
};

type Fetcher = () => Promise<ExchangeQuote>;

const safeFetch = async (url: string) => {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const fetchers: Record<string, Fetcher> = {
  Binance: async () => {
    const d = await safeFetch(
      "https://api.binance.com/api/v3/ticker/24hr?symbol=BNBUSDT",
    );
    return {
      exchange: "Binance",
      pair: "BNB/USDT",
      price: parseFloat(d.lastPrice),
      volume24h: parseFloat(d.quoteVolume),
      change24h: parseFloat(d.priceChangePercent),
      url: "https://www.binance.com/en/trade/BNB_USDT",
    };
  },
  Coinbase: async () => {
    const [stats, spot] = await Promise.all([
      safeFetch("https://api.exchange.coinbase.com/products/BNB-USD/stats"),
      safeFetch("https://api.coinbase.com/v2/prices/BNB-USD/spot"),
    ]);
    const price = parseFloat(spot.data.amount);
    const open = parseFloat(stats.open);
    return {
      exchange: "Coinbase",
      pair: "BNB/USD",
      price,
      volume24h: parseFloat(stats.volume) * price,
      change24h: open ? ((price - open) / open) * 100 : null,
      url: "https://www.coinbase.com/price/bnb",
    };
  },
  Kraken: async () => {
    const d = await safeFetch("https://api.kraken.com/0/public/Ticker?pair=BNBUSD");
    const k = Object.values(d.result)[0] as any;
    const price = parseFloat(k.c[0]);
    const open = parseFloat(k.o);
    return {
      exchange: "Kraken",
      pair: "BNB/USD",
      price,
      volume24h: parseFloat(k.v[1]) * price,
      change24h: open ? ((price - open) / open) * 100 : null,
      url: "https://www.kraken.com/prices/bnb",
    };
  },
  KuCoin: async () => {
    const d = await safeFetch(
      "https://api.kucoin.com/api/v1/market/stats?symbol=BNB-USDT",
    );
    return {
      exchange: "KuCoin",
      pair: "BNB/USDT",
      price: parseFloat(d.data.last),
      volume24h: parseFloat(d.data.volValue),
      change24h: parseFloat(d.data.changeRate) * 100,
      url: "https://www.kucoin.com/trade/BNB-USDT",
    };
  },
  OKX: async () => {
    const d = await safeFetch(
      "https://www.okx.com/api/v5/market/ticker?instId=BNB-USDT",
    );
    const t = d.data[0];
    const price = parseFloat(t.last);
    const open = parseFloat(t.open24h);
    return {
      exchange: "OKX",
      pair: "BNB/USDT",
      price,
      volume24h: parseFloat(t.volCcy24h),
      change24h: open ? ((price - open) / open) * 100 : null,
      url: "https://www.okx.com/trade-spot/bnb-usdt",
    };
  },
  Bybit: async () => {
    const d = await safeFetch(
      "https://api.bybit.com/v5/market/tickers?category=spot&symbol=BNBUSDT",
    );
    const t = d.result.list[0];
    return {
      exchange: "Bybit",
      pair: "BNB/USDT",
      price: parseFloat(t.lastPrice),
      volume24h: parseFloat(t.turnover24h),
      change24h: parseFloat(t.price24hPcnt) * 100,
      url: "https://www.bybit.com/en/trade/spot/BNB/USDT",
    };
  },
  "Gate.io": async () => {
    const d = await safeFetch(
      "https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BNB_USDT",
    );
    const t = d[0];
    return {
      exchange: "Gate.io",
      pair: "BNB/USDT",
      price: parseFloat(t.last),
      volume24h: parseFloat(t.quote_volume),
      change24h: parseFloat(t.change_percentage),
      url: "https://www.gate.io/trade/BNB_USDT",
    };
  },
  MEXC: async () => {
    const d = await safeFetch(
      "https://api.mexc.com/api/v3/ticker/24hr?symbol=BNBUSDT",
    );
    return {
      exchange: "MEXC",
      pair: "BNB/USDT",
      price: parseFloat(d.lastPrice),
      volume24h: parseFloat(d.quoteVolume),
      change24h: parseFloat(d.priceChangePercent),
      url: "https://www.mexc.com/exchange/BNB_USDT",
    };
  },
};

export const EXCHANGES = Object.keys(fetchers);

export async function fetchAllQuotes(): Promise<{
  quotes: ExchangeQuote[];
  fetchedAt: number;
}> {
  const entries = await Promise.all(
    Object.entries(fetchers).map(async ([name, fn]): Promise<ExchangeQuote> => {
      try {
        return await fn();
      } catch (e: any) {
        return {
          exchange: name,
          pair: "BNB",
          price: null,
          volume24h: null,
          change24h: null,
          url: "#",
          error: e?.message ?? "Failed",
        };
      }
    }),
  );
  return { quotes: entries, fetchedAt: Date.now() };
}
