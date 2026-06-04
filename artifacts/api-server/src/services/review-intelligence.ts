export interface ReviewSentiment {
  positive: number;
  neutral: number;
  negative: number;
  mostLoved: string[];
  mostComplained: string[];
  features: {
    battery: "positive" | "neutral" | "negative";
    display: "positive" | "neutral" | "negative";
    gaming: "positive" | "neutral" | "negative";
    camera: "positive" | "neutral" | "negative";
    performance: "positive" | "neutral" | "negative";
  };
}

export function generateReviewIntelligence(title: string): ReviewSentiment {
  const isPhone =
    title.toLowerCase().includes("phone") ||
    title.toLowerCase().includes("mobile") ||
    title.toLowerCase().includes("galaxy") ||
    title.toLowerCase().includes("iphone");

  return {
    positive: 78,
    neutral: 15,
    negative: 7,
    mostLoved: [
      isPhone ? "AMOLED High-refresh screen" : "Snappy processing speeds",
      "Stunning design aesthetics",
      "Robust daily battery life"
    ],
    mostComplained: [
      isPhone ? "Low-light camera grain" : "Slight heat throttling under load",
      "Slow minor software updates"
    ],
    features: {
      battery: "positive",
      display: "positive",
      gaming: isPhone ? "positive" : "neutral",
      camera: "neutral",
      performance: "positive"
    }
  };
}
