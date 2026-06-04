import type { GeneratedProduct } from "./shopping-agent";

const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_BASE = "https://serpapi.com/search.json";

interface SerpProduct {
  position: number;
  title: string;
  product_id: string;
  product_link: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  old_price?: string;
  extracted_old_price?: number;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  delivery?: string;
}

function extractBrand(title: string, source?: string): string {
  const knownBrands = [
    "boAt", "JBL", "Sony", "Samsung", "Apple", "OnePlus", "Realme", "Redmi", "Xiaomi", "Noise",
    "Boat", "Sennheiser", "Bose", "Skullcandy", "Jabra", "Philips", "Panasonic", "LG",
    "Lenovo", "HP", "Dell", "Asus", "Acer", "MSI", "Logitech", "Corsair", "Razer",
    "Nike", "Adidas", "Puma", "Reebok", "Bata", "Woodland", "Lee", "Levi",
    "Allen Solly", "Van Heusen", "Peter England", "Arrow", "Raymond",
    "Prestige", "Havells", "Bajaj", "Crompton", "Usha", "Orient", "Wipro",
    "Titan", "Fastrack", "Casio", "Fossil", "Tommy Hilfiger",
    "Symbol", "Ambrane", "Portronics", "Mivi", "CrossBeats",
    "WD", "Seagate", "Sandisk", "Kingston",
    "Nykaa", "Mamaearth", "Biotique", "Himalaya", "Lakme", "L\'Oreal",
    "Milton", "Cello", "Pigeon", "Butterfly", "Lifelong",
  ];
  const titleLower = title.toLowerCase();
  for (const brand of knownBrands) {
    if (titleLower.startsWith(brand.toLowerCase()) || titleLower.includes(` ${brand.toLowerCase()} `)) {
      return brand;
    }
  }
  if (source && source !== "Multiple sources") return source;
  const firstWord = title.split(" ")[0] ?? title;
  return firstWord.length > 1 ? firstWord : "Unknown";
}

function parsePrice(priceStr?: string, extractedPrice?: number): number {
  if (extractedPrice && extractedPrice > 0) return extractedPrice;
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[₹$,\s]/g, "").replace(/[^\d.]/g, "");
  return parseFloat(cleaned) || 0;
}

function parseDiscount(oldPriceStr?: string, extractedOldPrice?: number, price?: number): { discount: number | null; originalPrice: number | null } {
  if (!oldPriceStr) return { discount: null, originalPrice: null };
  // old_price can be "10% off₹999" or "₹999"
  const percentMatch = oldPriceStr.match(/(\d+)%\s*off/);
  const priceMatch = oldPriceStr.match(/₹\s*([\d,]+)/);
  
  if (percentMatch) {
    const discountPct = parseInt(percentMatch[1]);
    const origPriceStr = priceMatch ? priceMatch[1].replace(",", "") : null;
    const origPrice = origPriceStr ? parseFloat(origPriceStr) : (price && discountPct ? price / (1 - discountPct / 100) : null);
    return { discount: discountPct, originalPrice: origPrice };
  }
  if (priceMatch) {
    const origPrice = parseFloat(priceMatch[1].replace(",", ""));
    const discount = price && origPrice > price ? Math.round((1 - price / origPrice) * 100) : null;
    return { discount, originalPrice: origPrice };
  }
  return { discount: null, originalPrice: null };
}

function serpToProduct(item: SerpProduct, index: number): GeneratedProduct {
  const price = parsePrice(item.price, item.extracted_price);
  const { discount, originalPrice } = parseDiscount(item.old_price, item.extracted_old_price, price);
  const brand = extractBrand(item.title, item.source);
  
  // Determine source platform from product_link or source field
  let source = "Google Shopping";
  if (item.product_link) {
    if (item.product_link.includes("amazon.in") || item.product_link.includes("amazon.com")) {
      source = "Amazon";
    } else if (item.product_link.includes("flipkart.com")) {
      source = "Flipkart";
    } else if (item.source) {
      source = item.source;
    }
  }

  // Rating between 0-10 for trust/quality/value scores
  const ratingBased = item.rating ? Math.min(10, item.rating * 2) : 7;
  const reviewBoost = item.reviews ? Math.min(1.5, Math.log10(item.reviews) / 3) : 0;
  
  return {
    id: item.product_id || `serp-${index}-${Date.now()}`,
    title: item.title,
    brand,
    price,
    originalPrice,
    currency: "₹",
    discount,
    rating: item.rating ?? null,
    reviewCount: item.reviews ?? null,
    imageUrl: item.thumbnail ?? `https://source.unsplash.com/400x400/?${encodeURIComponent(item.title.split(" ").slice(0, 3).join(","))}`,
    productUrl: item.product_link,
    source,
    category: "",
    description: null,
    deliveryInfo: item.delivery ?? null,
    inStock: true,
    trustScore: parseFloat((ratingBased + reviewBoost).toFixed(1)),
    qualityScore: parseFloat((ratingBased * 0.9 + Math.random() * 0.5).toFixed(1)),
    valueScore: parseFloat((discount ? ratingBased + discount / 20 : ratingBased).toFixed(1)),
    pros: [],
    cons: [],
  };
}

export async function searchGoogleShopping(query: string, maxResults = 15): Promise<GeneratedProduct[]> {
  if (!SERP_API_KEY) throw new Error("SERP_API_KEY not configured");

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    gl: "in",
    hl: "en",
    num: String(Math.min(maxResults, 20)),
    api_key: SERP_API_KEY,
  });

  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`);
  
  const data = await res.json() as { shopping_results?: SerpProduct[] };
  const results = data.shopping_results ?? [];
  
  return results.slice(0, maxResults).map((item, i) => serpToProduct(item, i));
}

export async function searchMultiplePlatforms(
  query: string,
  maxPerPlatform = 15
): Promise<{ products: GeneratedProduct[]; totalFound: number }> {
  // Run Amazon-specific and Flipkart-specific searches alongside generic Google Shopping
  const [googleResults, amazonResults, flipkartResults] = await Promise.allSettled([
    searchGoogleShopping(query, maxPerPlatform),
    searchGoogleShopping(`${query} site:amazon.in`, Math.ceil(maxPerPlatform / 2)),
    searchGoogleShopping(`${query} site:flipkart.com`, Math.ceil(maxPerPlatform / 2)),
  ]);

  const google = googleResults.status === "fulfilled" ? googleResults.value : [];
  const amazon = amazonResults.status === "fulfilled" ? amazonResults.value.map(p => ({ ...p, source: "Amazon" })) : [];
  const flipkart = flipkartResults.status === "fulfilled" ? flipkartResults.value.map(p => ({ ...p, source: "Flipkart" })) : [];

  // Merge and deduplicate by title similarity
  const seen = new Set<string>();
  const all: GeneratedProduct[] = [];

  // Prioritize platform-specific results
  for (const product of [...amazon, ...flipkart, ...google]) {
    const key = product.title.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 40);
    if (!seen.has(key)) {
      seen.add(key);
      all.push(product);
    }
  }

  return { products: all.slice(0, maxPerPlatform * 2), totalFound: all.length };
}
