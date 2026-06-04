import { openai, getChatModel } from "@workspace/integrations-openai-ai-server";

const MODEL_NAME = getChatModel("gpt-5.4");

export interface ClarifyResult {
  needsClarification: boolean;
  questions: ClarifyQuestion[];
  refinedQuery: string | null;
}

export interface ClarifyQuestion {
  id: string;
  question: string;
  type: "choice" | "range" | "text";
  options?: string[];
  placeholder?: string;
}

export async function checkIfNeedsClarification(query: string): Promise<ClarifyResult> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are a smart Indian e-commerce shopping assistant that decides whether to ask clarifying questions before searching.

Rules:
- If the query is vague (e.g. "earphones", "shoes", "laptop"), ask 2-3 focused clarifying questions
- If the query is already specific (e.g. "boAt Bassheads 100 wired earphones under ₹500"), set needsClarification=false and refine the query
- Keep questions concise and relevant to Indian shopping (price in ₹)
- Only ask about things that matter for a search: brand, type, budget, key feature

Return valid JSON only.`,
        },
        {
          role: "user",
          content: `Shopping query: "${query}"

Return JSON:
{
  "needsClarification": boolean,
  "questions": [
    {
      "id": "brand",
      "question": "Which brand do you prefer?",
      "type": "choice",
      "options": ["boAt", "JBL", "Sony", "Any brand"]
    },
    {
      "id": "connectivity",
      "question": "Wired or wireless?",
      "type": "choice",
      "options": ["Wired", "Wireless/Bluetooth", "Both"]
    },
    {
      "id": "budget",
      "question": "What's your budget?",
      "type": "choice",
      "options": ["Under ₹500", "₹500–₹1000", "₹1000–₹3000", "₹3000+", "No limit"]
    }
  ],
  "refinedQuery": null
}

If needsClarification=false, set questions=[] and provide refinedQuery as an optimized search query string for Google Shopping India.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as ClarifyResult;
  } catch (err) {
    console.warn("[WARNING] checkIfNeedsClarification OpenAI call failed, using offline fallback:", err);
    return { needsClarification: false, questions: [], refinedQuery: query };
  }
}

export function buildRefinedQuery(originalQuery: string, answers: Record<string, string>): string {
  const parts = [originalQuery];
  
  for (const [key, value] of Object.entries(answers)) {
    if (!value || value === "Any brand" || value === "Both" || value === "No limit") continue;
    
    if (key === "budget") {
      // Extract number from "Under ₹500" → "under 500"
      const match = value.match(/₹?([\d,]+)/g);
      if (match) {
        const nums = match.map(m => parseInt(m.replace(/[₹,]/g, "")));
        if (value.toLowerCase().includes("under") && nums[0]) {
          parts.push(`under ₹${nums[0]}`);
        } else if (nums.length >= 2) {
          parts.push(`₹${nums[0]} to ₹${nums[1]}`);
        } else if (nums[0]) {
          parts.push(`above ₹${nums[0]}`);
        }
      }
    } else {
      parts.push(value);
    }
  }

  return parts.join(" ");
}

export async function generateAiSummary(query: string, productCount: number, topProducts: { title: string; price: number; rating: number | null; source: string }[]): Promise<string> {
  const productList = topProducts.slice(0, 5).map(p =>
    `- ${p.title} at ₹${p.price} (${p.source}, rating: ${p.rating ?? "N/A"})`
  ).join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: "You are a helpful Indian e-commerce shopping assistant. Write a brief, friendly 2-3 sentence summary of search results.",
        },
        {
          role: "user",
          content: `Query: "${query}"\nFound ${productCount} products. Top results:\n${productList}\n\nWrite a helpful 2-3 sentence summary highlighting the best picks and value for money. Use ₹ for prices.`,
        },
      ],
    });

    return response.choices[0]?.message?.content ?? `Found ${productCount} products matching "${query}". Here are the best options across Amazon and Flipkart.`;
  } catch (err) {
    console.warn("[WARNING] generateAiSummary OpenAI call failed, using offline fallback:", err);
    return `Found ${productCount} products matching "${query}". Here are the best options across Amazon and Flipkart.`;
  }
}
