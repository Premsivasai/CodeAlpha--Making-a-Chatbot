import { openai, isModelFarm, getChatModel } from "@workspace/integrations-openai-ai-server";

const MODEL_NAME = getChatModel();

export interface ParsedIntent {
  productType: string;
  attributes: string[];
  budget: number | null;
}

export interface GeneratedProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  currency: string;
  discount: number | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string;
  productUrl: string;
  source: string;
  category: string;
  description: string | null;
  deliveryInfo: string | null;
  inStock: boolean;
  trustScore: number | null;
  qualityScore: number | null;
  valueScore: number | null;
  pros: string[];
  cons: string[];
}

function getMockImageUrl(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("laptop") || t.includes("computer")) {
    return "https://images.unsplash.com/photo-1496181130204-755241524eab?w=400&q=80";
  }
  if (t.includes("phone") || t.includes("mobile") || t.includes("iphone")) {
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80";
  }
  if (t.includes("shoe") || t.includes("sneaker") || t.includes("slipper")) {
    return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";
  }
  if (t.includes("shirt") || t.includes("tshirt") || t.includes("clothing")) {
    return "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&q=80";
  }
  if (t.includes("camera") || t.includes("lens")) {
    return "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80";
  }
  if (t.includes("watch")) {
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80";
  }
  return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80"; // headphones
}

function getOfflineProducts(query: string, intent: ParsedIntent, budgetConstraint: number | null): GeneratedProduct[] {
  const productType = intent.productType || query || "Product";
  const brands = ["Sony", "Dell", "ASUS", "HP", "Samsung", "Boat", "Puma", "Adidas", "Apple", "Levi's", "Lenovo", "OnePlus"];
  const selectedBrands = intent.attributes.filter(attr => brands.some(b => b.toLowerCase() === attr.toLowerCase()));
  const productBrands = selectedBrands.length > 0 ? selectedBrands : brands.slice(0, 5);

  const mockProducts: GeneratedProduct[] = [];
  const count = 8;
  const basePrice = budgetConstraint ? Math.min(budgetConstraint * 0.8, 50000) : 15000;

  for (let i = 0; i < count; i++) {
    const brand = productBrands[i % productBrands.length];
    const source = i % 2 === 0 ? "Amazon" : "Flipkart";
    const rating = parseFloat((4.0 + (i * 0.13) % 0.9).toFixed(1));
    const price = Math.round(basePrice * (0.7 + (i * 0.15) % 0.6));
    const originalPrice = Math.round(price * 1.25);
    const discount = 20;

    mockProducts.push({
      id: `offline-prod-${i}-${Date.now()}`,
      title: `${brand} Elite Series ${productType} v${i + 1}`,
      brand,
      price,
      originalPrice,
      currency: "INR",
      discount,
      rating,
      reviewCount: 150 + i * 230,
      imageUrl: getMockImageUrl(productType),
      productUrl: source === "Amazon" 
        ? `https://www.amazon.in/dp/B07M${i}XXXX` 
        : `https://www.flipkart.com/item/itm${i}XXXX`,
      source,
      category: productType,
      description: `A premium quality ${brand} ${productType} featuring advanced design, comfortable fit, and excellent value.`,
      deliveryInfo: i % 2 === 0 ? "Free delivery by tomorrow" : "Delivery in 2-3 days",
      inStock: true,
      trustScore: parseFloat((7.5 + (i * 0.3) % 2.5).toFixed(1)),
      qualityScore: parseFloat((8.0 + (i * 0.2) % 2.0).toFixed(1)),
      valueScore: parseFloat((7.8 + (i * 0.3) % 2.2).toFixed(1)),
      pros: ["High quality materials", "Excellent brand reliability", "Great value for money"],
      cons: ["Slightly heavier than alternatives", "Limited color options"]
    });
  }

  return mockProducts.sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0));
}

function getOfflineComparison(products: GeneratedProduct[]) {
  const winner = products[0] || { title: "None", brand: "Unknown" };
  const comparisonTable = [
    { attribute: "Price", values: products.map(p => `₹${p.price.toLocaleString("en-IN")}`) },
    { attribute: "Rating", values: products.map(p => `${p.rating}/5`) },
    { attribute: "Brand", values: products.map(p => p.brand) },
    { attribute: "Value for Money", values: products.map(p => p.valueScore ? `${p.valueScore}/10` : "N/A") },
    { attribute: "Best For", values: products.map((p, i) => i === 0 ? "Best overall performance" : "Budget-friendly alternative") }
  ];
  return {
    winner: winner.title,
    winnerReason: `The ${winner.title} stands out as the winner due to its superior quality rating and excellent value-for-money score.`,
    comparisonTable
  };
}

export async function parseIntent(query: string): Promise<ParsedIntent> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      max_completion_tokens: 512,
      messages: [
        {
          role: "system",
          content: `You are a shopping query parser. Extract intent from user queries. Return only valid JSON.`,
        },
        {
          role: "user",
          content: `Parse this shopping query: "${query}"
Return JSON with:
- productType: string (e.g. "T-shirt", "laptop", "headphones")
- attributes: string[] (e.g. ["black", "oversized", "cotton"])
- budget: number | null (max budget in INR, or null if not specified)

Return only the JSON object, no markdown.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as ParsedIntent;
  } catch (err) {
    console.warn("[WARNING] parseIntent OpenAI call failed, using offline fallback:", err);
    const budgetMatch = query.match(/(?:under|below|max|budget of)?\s*(?:₹|rs\.?)?\s*(\d+(?:,\d+)*)/i);
    const budget = budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, "")) : null;
    return {
      productType: query.split(" ").slice(-1)[0] || "product",
      attributes: query.split(" ").slice(0, -1),
      budget,
    };
  }
}

export async function generateProducts(
  query: string,
  intent: ParsedIntent,
  filters: { minPrice: number | null; maxPrice: number | null; category: string | null; sources: string[] }
): Promise<{ products: GeneratedProduct[]; aiSummary: string }> {
  const sources = filters.sources.length > 0 ? filters.sources : ["Amazon", "Flipkart"];
  const budgetConstraint = filters.maxPrice ?? intent.budget;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are a shopping intelligence engine for Indian e-commerce (Amazon India and Flipkart). Generate realistic product listings for user queries. Return valid JSON only, no markdown.`,
        },
        {
          role: "user",
          content: `Generate 8-12 realistic product listings for: "${query}"

Intent: ${JSON.stringify(intent)}
Sources: ${sources.join(", ")}
${budgetConstraint ? `Max budget: ₹${budgetConstraint}` : ""}
${filters.minPrice ? `Min price: ₹${filters.minPrice}` : ""}
${filters.category ? `Category: ${filters.category}` : ""}

Return a JSON object with:
{
  "products": [
    {
      "id": "unique-id-string",
      "title": "Full product title",
      "brand": "Brand name",
      "price": number (INR),
      "originalPrice": number | null (if discounted),
      "currency": "INR",
      "discount": number | null (percentage),
      "rating": number (3.5-5.0),
      "reviewCount": number (100-50000),
      "imageUrl": "https://source.unsplash.com/400x400/?{2-3 comma-separated keywords relevant to the specific product, e.g. 'tshirt,cotton,fashion' or 'laptop,computer,technology'}",
      "productUrl": "https://www.amazon.in/dp/XXXXX" or "https://www.flipkart.com/XXXXX",
      "source": "Amazon" or "Flipkart",
      "category": "category string",
      "description": "2-3 sentence description",
      "deliveryInfo": "Delivery in X days" or "Free delivery by ...",
      "inStock": true or false,
      "trustScore": number 0-10,
      "qualityScore": number 0-10,
      "valueScore": number 0-10,
      "pros": ["pro1", "pro2", "pro3"],
      "cons": ["con1", "con2"]
    }
  ],
  "aiSummary": "2-3 sentence conversational summary of what was found and the best recommendation"
}

Make products diverse: mix brands, prices (within budget if specified), sources. Include well-known Indian e-commerce brands. Make ratings, reviews, scores realistic. Sort by value score descending.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { products: GeneratedProduct[]; aiSummary: string };
    return parsed;
  } catch (err) {
    console.warn("[WARNING] generateProducts OpenAI call failed, using offline fallback:", err);
    const products = getOfflineProducts(query, intent, budgetConstraint);
    return {
      products,
      aiSummary: `I searched for "${query}" and found these top choices from Amazon and Flipkart. The ${products[0]?.brand} ${products[0]?.category} offers the best balance of value and reviews.`,
    };
  }
}

export async function compareProductsAI(
  products: GeneratedProduct[]
): Promise<{ winner: string; winnerReason: string; comparisonTable: { attribute: string; values: string[] }[] }> {
  const productList = products.map((p, i) => `${i + 1}. ${p.title} (${p.brand}) - ₹${p.price}`).join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      max_completion_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You are a product comparison expert. Compare products and return valid JSON only.`,
        },
        {
          role: "user",
          content: `Compare these products:\n${productList}\n\nReturn JSON:
{
  "winner": "product title of the best overall pick",
  "winnerReason": "2-3 sentence explanation of why this is the best pick",
  "comparisonTable": [
    { "attribute": "Price", "values": ["₹XXX", "₹YYY", ...] },
    { "attribute": "Rating", "values": ["X.X/5", "Y.Y/5", ...] },
    { "attribute": "Brand", "values": [...] },
    { "attribute": "Value for Money", "values": ["Excellent", "Good", ...] },
    { "attribute": "Best For", "values": [...] }
  ]
}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as { winner: string; winnerReason: string; comparisonTable: { attribute: string; values: string[] }[] };
  } catch (err) {
    console.warn("[WARNING] compareProductsAI OpenAI call failed, using offline fallback:", err);
    return getOfflineComparison(products);
  }
}
