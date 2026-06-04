import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Product } from "@workspace/api-client-react";
import { useCompareProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ComparePage() {
  const [productsToCompare, setProductsToCompare] = useState<Product[]>([]);
  const compareMutation = useCompareProducts();
  const [hasCompared, setHasCompared] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("compare_products");
      if (stored) {
        const products = JSON.parse(stored) as Product[];
        setProductsToCompare(products);
        if (products.length > 1 && !hasCompared) {
          compareMutation.mutate({
            data: {
              productIds: products.map(p => p.id),
              products: products
            }
          });
          setHasCompared(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [hasCompared, compareMutation]);

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <List className="h-6 w-6 text-primary" /> Product Comparison
          </h1>
          {productsToCompare.length > 0 && (
            <Button variant="outline" onClick={() => {
              sessionStorage.removeItem("compare_products");
              setProductsToCompare([]);
              setHasCompared(false);
            }}>
              Clear Comparison
            </Button>
          )}
        </div>

        {productsToCompare.length < 2 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border p-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">Not enough products</h2>
            <p>Select at least two products from the chat results to compare them side by side.</p>
          </div>
        ) : compareMutation.isPending ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>AI is analyzing and comparing these products...</p>
          </div>
        ) : compareMutation.data ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {compareMutation.data.winner && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary text-primary-foreground p-3 rounded-full">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-primary mb-1">AI Recommendation</h2>
                      <p className="text-sm font-medium mb-2">Winner: {compareMutation.data.winner}</p>
                      <p className="text-sm text-muted-foreground">{compareMutation.data.winnerReason}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {productsToCompare.map(p => (
                <div key={p.id}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30">
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Feature Comparison
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <tbody>
                    {compareMutation.data.comparisonTable.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10">
                        <th className="p-4 font-medium bg-muted/20 w-48 shrink-0 align-top">
                          {row.attribute}
                        </th>
                        {row.values.map((val, j) => (
                          <td key={j} className="p-4 align-top border-l border-border first:border-l-0 min-w-[200px]">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-destructive">
            Failed to generate comparison.
          </div>
        )}
      </div>
    </Layout>
  );
}

// Ensure List is imported
import { List } from "lucide-react";
