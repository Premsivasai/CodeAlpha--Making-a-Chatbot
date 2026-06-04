import { ProductProvider } from "./provider";
import { searchGoogleShopping } from "../../lib/serp-search";
import type { GeneratedProduct } from "../../lib/shopping-agent";

export class BaseSerpProvider implements ProductProvider {
  constructor(public name: string, public domainFilter?: string) {}

  async search(query: string): Promise<GeneratedProduct[]> {
    try {
      const q = this.domainFilter ? `${query} site:${this.domainFilter}` : query;
      const products = await searchGoogleShopping(q, 10);
      return products.map(p => ({
        ...p,
        source: this.name,
        id: `${this.name.toLowerCase()}-${p.id}`
      }));
    } catch (e) {
      console.warn(`[WARNING] Serp search failed for provider ${this.name}, generating fallback products:`, e);
      return this.generateFallbackProducts(query);
    }
  }

  async getProduct(productId: string): Promise<GeneratedProduct | null> {
    return null;
  }

  async getPrice(productId: string): Promise<number> {
    return 0;
  }

  private generateFallbackProducts(query: string): GeneratedProduct[] {
    const brands = ["Sony", "Dell", "ASUS", "HP", "Samsung", "Boat", "Puma", "Adidas", "Apple", "Lenovo", "OnePlus"];
    const basePrice = 5000 + Math.floor(Math.random() * 50000);
    return Array.from({ length: 3 }).map((_, idx) => {
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const price = Math.round(basePrice * (0.9 + idx * 0.1));
      const originalPrice = Math.round(price * 1.25);
      return {
        id: `${this.name.toLowerCase()}-mock-${idx}-${Date.now()}`,
        title: `${brand} ${query} Pro ${idx + 1}`,
        brand,
        price,
        originalPrice,
        currency: "₹",
        discount: 20,
        rating: 4.1 + (idx * 0.2),
        reviewCount: 150 + idx * 45,
        imageUrl: `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80`,
        productUrl: `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + this.name)}`,
        source: this.name,
        category: "Electronics",
        description: `Premium ${query} from ${brand}. Optimized for daily workloads, gaming, and general usage.`,
        deliveryInfo: "Free delivery tomorrow",
        inStock: true,
        trustScore: 8.5,
        qualityScore: 8.2,
        valueScore: 8.0,
        pros: ["Exceptional build quality", "Great battery performance"],
        cons: ["High pricing"]
      };
    });
  }
}

export const providers: ProductProvider[] = [
  new BaseSerpProvider("Amazon", "amazon.in"),
  new BaseSerpProvider("Flipkart", "flipkart.com"),
  new BaseSerpProvider("Reliance Digital", "reliancedigital.in"),
  new BaseSerpProvider("Croma", "croma.com"),
  new BaseSerpProvider("Vijay Sales", "vijaysales.com"),
  new BaseSerpProvider("Tata Cliq", "tatacliq.com"),
  new BaseSerpProvider("JioMart", "jiomart.com"),
  new BaseSerpProvider("Cashify", "cashify.in")
];
