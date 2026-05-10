import { createFileRoute } from "@tanstack/react-router";
import { fetchAllQuotes } from "@/lib/exchanges";

export const Route = createFileRoute("/api/public/bnb")({
  server: {
    handlers: {
      GET: async () => {
        const data = await fetchAllQuotes();
        const valid = data.quotes.filter((q) => q.price !== null);
        const prices = valid.map((q) => q.price!);
        const avg = prices.length
          ? prices.reduce((a, b) => a + b, 0) / prices.length
          : null;
        const summary = {
          fetchedAt: data.fetchedAt,
          count: valid.length,
          averagePrice: avg,
          minPrice: prices.length ? Math.min(...prices) : null,
          maxPrice: prices.length ? Math.max(...prices) : null,
          quotes: data.quotes,
        };
        return new Response(JSON.stringify(summary, null, 2), {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
