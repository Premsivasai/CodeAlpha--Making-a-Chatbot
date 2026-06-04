import React, { useState } from "react";
import { Product } from "@workspace/api-client-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Heart, ArrowUpRight, Package, Truck } from "lucide-react";
import { useSaveProduct, useRemoveSavedProduct, useListSavedProducts } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ProductDetails } from "./product-details";

interface ProductCardProps {
  product: Product;
  onCompareToggle?: (product: Product, checked: boolean) => void;
  isCompared?: boolean;
}

const SOURCE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Amazon":         { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "Flipkart":       { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Google Shopping":{ bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
};

export function ProductCard({ product, onCompareToggle, isCompared }: ProductCardProps) {
  const { data: savedProducts } = useListSavedProducts();
  const saveMutation = useSaveProduct();
  const removeMutation = useRemoveSavedProduct();
  const [imgError, setImgError] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isSaved = savedProducts?.some(p => p.productId === product.id);
  const srcStyle = SOURCE_STYLES[product.source] ?? { bg: "#f9fafb", text: "#374151", border: "#e5e7eb" };

  const discountPct = product.discount ??
    (product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null);

  const toggleSave = () => {
    if (isSaved) {
      const saved = savedProducts?.find(p => p.productId === product.id);
      if (saved) removeMutation.mutate({ id: saved.id });
    } else {
      saveMutation.mutate({
        data: {
          productId: product.id,
          title: product.title,
          brand: product.brand,
          price: product.price,
          currency: product.currency,
          imageUrl: product.imageUrl,
          productUrl: product.productUrl,
          source: product.source,
          rating: product.rating,
        }
      });
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all overflow-hidden">
      <div className="flex gap-0">
        {/* Image */}
        <div className="w-32 sm:w-40 shrink-0 bg-gray-50 flex items-center justify-center p-3 relative self-stretch">
          {!imgError && product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-28 object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-28 flex items-center justify-center text-gray-300">
              <Package className="h-10 w-10" />
            </div>
          )}
          {discountPct && discountPct > 0 && (
            <span className="absolute top-2 left-2 text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-md">
              -{discountPct}%
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
              style={{ background: srcStyle.bg, color: srcStyle.text, borderColor: srcStyle.border }}
            >
              {product.source}
            </span>
            <button
              onClick={toggleSave}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors shrink-0 -mt-0.5"
              title={isSaved ? "Remove from saved" : "Save"}
            >
              <Heart className={`h-4 w-4 transition-colors ${isSaved ? "fill-red-500 text-red-500" : "text-gray-300 group-hover:text-gray-400"}`} />
            </button>
          </div>

          {/* Brand + Title */}
          <div>
            {product.brand && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-tight">{product.brand}</p>
            )}
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mt-0.5">
              {product.title}
            </h3>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900">
              ₹{product.price > 0 ? product.price.toLocaleString("en-IN") : "—"}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-gray-400 line-through">
                ₹{product.originalPrice.toLocaleString("en-IN")}
              </span>
            )}
            {discountPct && discountPct > 0 && (
              <span className="text-xs font-semibold text-green-600">{discountPct}% off</span>
            )}
          </div>

          {/* Rating + delivery */}
          <div className="flex items-center gap-3 text-[11px]">
            {product.rating && (
              <div className="flex items-center gap-1 text-amber-500 font-semibold">
                <Star className="h-3 w-3 fill-current" />
                {product.rating}
                {product.reviewCount && (
                  <span className="text-gray-400 font-normal">({product.reviewCount.toLocaleString()})</span>
                )}
              </div>
            )}
            {product.deliveryInfo && (
              <div className="flex items-center gap-1 text-gray-500">
                <Truck className="h-3 w-3" />
                {product.deliveryInfo}
              </div>
            )}
          </div>

          {/* Pros/Cons inline */}
          {(product.pros.length > 0 || product.cons.length > 0) && (
            <div className="flex gap-2">
              {product.pros.length > 0 && (
                <div className="flex-1 bg-green-50 rounded-lg px-2.5 py-1.5 text-[11px] text-green-700">
                  <p className="font-semibold mb-0.5">✓ Pros</p>
                  <ul className="space-y-0.5">
                    {product.pros.slice(0, 2).map((pro, i) => <li key={i} className="line-clamp-1">{pro}</li>)}
                  </ul>
                </div>
              )}
              {product.cons.length > 0 && (
                <div className="flex-1 bg-red-50 rounded-lg px-2.5 py-1.5 text-[11px] text-red-600">
                  <p className="font-semibold mb-0.5">✗ Cons</p>
                  <ul className="space-y-0.5">
                    {product.cons.slice(0, 2).map((con, i) => <li key={i} className="line-clamp-1">{con}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
            {onCompareToggle ? (
              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                <Checkbox
                  checked={isCompared}
                  onCheckedChange={c => onCompareToggle(product, c as boolean)}
                  className="h-3.5 w-3.5"
                />
                Add to Compare
              </label>
            ) : <div />}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogTrigger asChild>
                <button
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer transition-colors"
                >
                  View Deal <ArrowUpRight className="h-3 w-3" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[95vw] h-[90vh] md:max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-slate-50 border-none gap-0">
                <ProductDetails product={product} onClose={() => setDetailsOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
