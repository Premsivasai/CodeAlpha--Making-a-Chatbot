import type { GeneratedProduct } from "../../lib/shopping-agent";

export interface ProductProvider {
  name: string;
  search(query: string): Promise<GeneratedProduct[]>;
  getProduct(productId: string): Promise<GeneratedProduct | null>;
  getPrice(productId: string): Promise<number>;
}
