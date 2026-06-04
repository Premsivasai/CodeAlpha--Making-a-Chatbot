import { openai, getChatModel } from "@workspace/integrations-openai-ai-server";

export interface ExtractedQueryIntent {
  category: string;
  useCase: string | null;
  maxPrice: number | null;
  minPrice: number | null;
  brand: string | null;
  features: string[];
}

export async function parseUserQueryIntent(query: string): Promise<ExtractedQueryIntent> {
  const chatModel = getChatModel();

  const systemPrompt = `You are an AI Query Understanding Agent. Your task is to analyze user search queries for a shopping platform and extract filterable entities.
  
Provide a structured output in JSON format with the following fields:
{
  "category": "Standard category name, e.g. 'phone', 'laptop', 'shoes', 'earphones'",
  "useCase": "The target intent/use case, e.g. 'gaming', 'machine-learning', 'running', 'office' (or null if none)",
  "maxPrice": 25000, // Maximum price target as a number (or null if none)
  "minPrice": 5000, // Minimum price target as a number (or null if none)
  "brand": "The preferred brand, e.g. 'Poco', 'Infinix', 'Apple', 'Dell' (or null if none)",
  "features": ["5G", "AMOLED", "OIS"] // Key specs or features specified in the query
}

Keep all price values converted to standard numeric figures (assuming INR if not specified). Return only valid JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: chatModel,
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(content);

    return {
      category: data.category || "Product",
      useCase: data.useCase || null,
      maxPrice: typeof data.maxPrice === "number" ? data.maxPrice : null,
      minPrice: typeof data.minPrice === "number" ? data.minPrice : null,
      brand: data.brand || null,
      features: Array.isArray(data.features) ? data.features : []
    };
  } catch (err) {
    console.error("[ERROR] AI query parsing failed, applying fallback parser:", err);
    // Fallback regex parsing
    const maxPriceMatch = query.match(/(?:under|below|max|budget)\s*(?:₹|rs)?\s*([\d,]+)/i);
    const maxPrice = maxPriceMatch ? parseInt(maxPriceMatch[1].replace(/,/g, "")) : null;

    return {
      category: "Product",
      useCase: null,
      maxPrice,
      minPrice: null,
      brand: null,
      features: []
    };
  }
}
