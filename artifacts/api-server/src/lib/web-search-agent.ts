import { openai, getChatModel } from "@workspace/integrations-openai-ai-server";
import { searchMultiplePlatforms } from "./serp-search";
import type { GeneratedProduct } from "./shopping-agent";

const MODEL_NAME = getChatModel("gpt-5.4");
const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_BASE = "https://serpapi.com/search.json";

export interface WebSource {
  position: number;
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  favicon: string;
  date?: string;
}

export interface WebSearchResult {
  answer: string;
  sources: WebSource[];
  relatedQuestions: string[];
  query: string;
  products?: GeneratedProduct[];
  productQuery?: string;
  isProductSearch: boolean;
}

interface SerpOrganicResult {
  position: number;
  title: string;
  link: string;
  displayed_link?: string;
  snippet?: string;
  date?: string;
  favicon?: string;
}

interface SerpRelatedQuestion {
  question: string;
}

interface SerpResponse {
  organic_results?: SerpOrganicResult[];
  related_questions?: SerpRelatedQuestion[];
  answer_box?: { answer?: string; snippet?: string; title?: string };
}

// Detect if a query is product/shopping related and extract the clean product query
async function detectProductIntent(query: string): Promise<{
  isProduct: boolean;
  productQuery: string | null;
  suggestion: string | null;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      max_completion_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are a query classifier. Determine if a query is asking about buying, finding, or recommending products/items to purchase.
Return JSON only.`,
        },
        {
          role: "user",
          content: `Query: "${query}"

Return JSON:
{
  "isProduct": true/false,
  "productQuery": "clean search query optimized for product search, or null if not product",
  "suggestion": "one sentence shopping tip for this query, or null if not product"
}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const clean = content.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn("[WARNING] detectProductIntent OpenAI call failed, using offline fallback:", err);
    return { isProduct: false, productQuery: null, suggestion: null };
  }
}

export async function searchWebOrganicResults(query: string, numResults = 8): Promise<{
  organicResults: WebSource[];
  answerBox: string | null;
  relatedQuestions: string[];
}> {
  if (!SERP_API_KEY) throw new Error("SERP_API_KEY not configured");

  const params = new URLSearchParams({
    engine: "google",
    q: query,
    gl: "in",
    hl: "en",
    num: String(numResults),
    api_key: SERP_API_KEY,
  });

  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`);

  const data = await res.json() as SerpResponse;

  const organicResults: WebSource[] = (data.organic_results ?? [])
    .slice(0, numResults)
    .map((item) => {
      let hostname = "";
      try { hostname = new URL(item.link).hostname; } catch { hostname = item.link; }
      return {
        position: item.position,
        title: item.title,
        url: item.link,
        displayUrl: item.displayed_link ?? hostname,
        snippet: item.snippet ?? "",
        favicon: item.favicon ?? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
        date: item.date,
      };
    });

  const answerBox = data.answer_box?.answer ?? data.answer_box?.snippet ?? null;
  const relatedQuestions = (data.related_questions ?? []).slice(0, 4).map(q => q.question);

  return { organicResults, answerBox, relatedQuestions };
}

export async function synthesizeWebAnswer(
  query: string,
  sources: WebSource[],
  answerBox: string | null,
  hasProducts: boolean
): Promise<string> {
  const sourceContext = sources
    .slice(0, 6)
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const answerBoxContext = answerBox ? `\nDirect Answer: ${answerBox}\n` : "";
  const productNote = hasProducts
    ? "\nNote: Product recommendations from Amazon, Flipkart & Google Shopping are shown below your answer — focus your answer on insights, reviews, and buying advice rather than listing product names."
    : "";

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are a knowledgeable AI assistant like Perplexity.
Synthesize information from web search results into a clear, well-structured answer.
- Write in flowing paragraphs, not bullet lists
- Cite sources using [1], [2], etc. inline naturally
- Be informative but concise (2-4 paragraphs max)
- Use **bold** for key terms only, no headers${productNote}`,
        },
        {
          role: "user",
          content: `Question: ${query}
${answerBoxContext}
Search Results:
${sourceContext}

Write a comprehensive answer citing the sources.`,
        },
      ],
    });

    return response.choices[0]?.message?.content ?? "I couldn't find a clear answer. Please check the sources below.";
  } catch (err) {
    console.warn("[WARNING] synthesizeWebAnswer OpenAI call failed, using offline fallback:", err);
    return "I found some search results but couldn't synthesize a summary because the AI model is currently offline. Please refer to the sources below.";
  }
}

export async function webSearch(query: string): Promise<WebSearchResult> {
  // Run web search and product intent detection in parallel
  const [webResults, intentResult] = await Promise.all([
    searchWebOrganicResults(query, 8),
    detectProductIntent(query),
  ]);

  const { organicResults, answerBox, relatedQuestions } = webResults;
  const { isProduct, productQuery } = intentResult;

  // If product query, fetch products in parallel with answer synthesis
  const [answer, productResults] = await Promise.all([
    synthesizeWebAnswer(query, organicResults, answerBox, isProduct),
    isProduct && productQuery
      ? searchMultiplePlatforms(productQuery, 6).then(r => r.products).catch(() => [])
      : Promise.resolve([] as GeneratedProduct[]),
  ]);

  return {
    answer,
    sources: organicResults,
    relatedQuestions,
    query,
    products: productResults.length > 0 ? productResults : undefined,
    productQuery: isProduct && productQuery ? productQuery : undefined,
    isProductSearch: isProduct,
  };
}

// Get trending/suggested queries for the shopping home screen
export async function getShoppingSuggestions(category?: string): Promise<{
  trending: Array<{ emoji: string; text: string; category: string }>;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      max_completion_tokens: 512,
      messages: [
        {
          role: "system",
          content: "You generate trending Indian shopping queries. Return only valid JSON.",
        },
        {
          role: "user",
          content: `Generate 8 diverse, trending shopping search queries for Indian consumers in 2025.
${category ? `Focus on: ${category}` : "Cover electronics, fashion, home, sports, beauty categories."}
Each should be specific with budget (in ₹) when relevant.

Return JSON:
{
  "trending": [
    { "emoji": "🎧", "text": "query text", "category": "Electronics" },
    ...
  ]
}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const clean = content.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn("[WARNING] getShoppingSuggestions OpenAI call failed, using offline fallback:", err);
    return {
      trending: [
        { emoji: "🎧", text: "Wireless earphones under ₹1500", category: "Electronics" },
        { emoji: "👟", text: "Running shoes for men under ₹2000", category: "Sports" },
        { emoji: "💻", text: "Gaming laptop under ₹60000", category: "Electronics" },
        { emoji: "🍳", text: "Air fryer 4L for home", category: "Home" },
        { emoji: "📱", text: "Best smartphone under ₹15000", category: "Electronics" },
        { emoji: "👗", text: "Summer dresses for women", category: "Fashion" },
        { emoji: "🎮", text: "Gaming chair under ₹10000", category: "Furniture" },
        { emoji: "💄", text: "Best vitamin C serum India", category: "Beauty" },
      ],
    };
  }
}
