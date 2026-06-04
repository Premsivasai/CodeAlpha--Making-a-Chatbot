import { providers } from "./providers";
import type { GeneratedProduct } from "../../lib/shopping-agent";

export async function aggregateMultiSourceSearch(
  query: string
): Promise<{ products: GeneratedProduct[]; totalFound: number }> {
  // Run searches in parallel for all providers
  const searchPromises = providers.map(provider =>
    provider.search(query).catch(err => {
      console.error(`[ERROR] Multi-source provider search failed for ${provider.name}:`, err);
      return [] as GeneratedProduct[];
    })
  );

  const results = await Promise.all(searchPromises);
  const flatProducts = results.flat();

  // Simple token-based deduplication
  const seen = new Set<string>();
  const deduplicated: GeneratedProduct[] = [];

  for (const product of flatProducts) {
    const brandPrefix = product.brand ? product.brand.toLowerCase() : "";
    const cleanTitle = product.title.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 35);
    const key = `${brandPrefix}-${cleanTitle}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(product);
    }
  }

  // Sort by value score descending
  deduplicated.sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0));

  return {
    products: deduplicated,
    totalFound: deduplicated.length
  };
}
