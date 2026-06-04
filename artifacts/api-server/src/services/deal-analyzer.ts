import type { GeneratedProduct } from "../lib/shopping-agent";

export interface DealAnalysis {
  dealScore: number;
  recommendation: "Buy Now" | "Wait for Sale" | "Watch Price" | "Consider Alternatives";
  marketPosition: "Excellent Deal" | "Good Deal" | "Average Deal" | "Poor Deal";
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
}

export function analyzeProductDeal(product: GeneratedProduct, prices: number[]): DealAnalysis {
  const currentPrice = product.price;
  const list = prices.length > 0 ? prices : [currentPrice, Math.round(currentPrice * 1.15), Math.round(currentPrice * 0.95)];

  const lowest = Math.min(...list);
  const highest = Math.max(...list);
  const average = Math.round(list.reduce((a, b) => a + b, 0) / list.length);

  // Score from 0 to 10
  let score = 5.0;
  if (currentPrice <= lowest) {
    score = 9.5;
  } else if (currentPrice < average) {
    const diffPct = (average - currentPrice) / average;
    score = 7.0 + Math.min(2.0, diffPct * 10);
  } else if (currentPrice === average) {
    score = 6.5;
  } else {
    const diffPct = (currentPrice - average) / average;
    score = Math.max(1.0, 5.0 - diffPct * 10);
  }

  // Adjust score by product rating if available
  if (product.rating) {
    score = Math.min(10, Math.max(0, score * 0.8 + (product.rating / 5) * 2));
  }

  const dealScore = parseFloat(score.toFixed(1));

  let marketPosition: "Excellent Deal" | "Good Deal" | "Average Deal" | "Poor Deal" = "Average Deal";
  let recommendation: "Buy Now" | "Wait for Sale" | "Watch Price" | "Consider Alternatives" = "Watch Price";

  if (dealScore >= 9.0) {
    marketPosition = "Excellent Deal";
    recommendation = "Buy Now";
  } else if (dealScore >= 7.5) {
    marketPosition = "Good Deal";
    recommendation = "Buy Now";
  } else if (dealScore >= 5.5) {
    marketPosition = "Average Deal";
    recommendation = "Watch Price";
  } else {
    marketPosition = "Poor Deal";
    recommendation = "Wait for Sale";
  }

  return {
    dealScore,
    recommendation,
    marketPosition,
    averagePrice: average,
    lowestPrice: lowest,
    highestPrice: highest
  };
}
