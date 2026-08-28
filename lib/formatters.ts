export function formatCurrency(amount: number, currency?: string): string {
  const safeCurrency = (currency && typeof currency === "string" && currency.trim() !== "")
    ? currency.trim().toUpperCase()
    : "INR";

  try {
    return new Intl.NumberFormat(safeCurrency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    const symbolMap: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
    };
    const symbol = symbolMap[safeCurrency] || `${safeCurrency} `;
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
}
