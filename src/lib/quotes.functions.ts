import { createServerFn } from "@tanstack/react-start";
import { fetchAllQuotes } from "./exchanges";

export const getBnbQuotes = createServerFn({ method: "GET" }).handler(async () => {
  return await fetchAllQuotes();
});
