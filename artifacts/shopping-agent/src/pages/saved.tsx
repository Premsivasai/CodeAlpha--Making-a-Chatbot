import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useListSavedProducts, useRemoveSavedProduct } from "@workspace/api-client-react";
import { PriceAlertModal } from "@/components/price-alert-modal";
import {
  Trash2, ArrowUpRight, Loader2, Bell, BellRing,
  TrendingDown, Heart, Package, Star, AlertTriangle, X,
} from "lucide-react";

interface PriceAlert {
  id: number;
  savedProductId: number;
  productId: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  source: string;
  savedPrice: number;
  targetPrice: number;
  currentPrice: number | null;
  isTriggered: boolean;
  triggeredAt: string | null;
}

const SOURCE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Amazon":          { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "Flipkart":        { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Google Shopping": { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
};

export default function SavedPage() {
  const { data: savedProducts, isLoading, refetch } = useListSavedProducts();
  const removeMutation = useRemoveSavedProduct();

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [triggered, setTriggered] = useState<PriceAlert[]>([]);
  const [checking, setChecking] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<{
    savedProductId: number;
    productId: string;
    title: string;
    imageUrl: string;
    productUrl: string;
    source: string;
    price: number;
  } | null>(null);

  // Load alerts
  const loadAlerts = async () => {
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json() as PriceAlert[];
      setAlerts(data);
      return data;
    } catch {
      return [];
    }
  };

  // Check prices for all active alerts
  const checkPrices = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/alerts/check", { method: "POST" });
      const data = await res.json() as { checked: number; triggered: PriceAlert[] };
      if (data.triggered?.length > 0) setTriggered(data.triggered);
      await loadAlerts();
    } catch {
      // silent
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadAlerts().then((data) => {
      // Auto-check prices on page load if there are active alerts
      const hasActive = data.some(a => !a.isTriggered);
      if (hasActive) checkPrices();
    });
  }, []);

  const openAlertModal = (p: {
    id: number;
    productId: string;
    title: string;
    imageUrl: string;
    productUrl: string;
    source: string;
    price: number;
  }) => {
    setModalProduct({
      savedProductId: p.id,
      productId: p.productId,
      title: p.title,
      imageUrl: p.imageUrl,
      productUrl: p.productUrl,
      source: p.source,
      price: p.price,
    });
    setModalOpen(true);
  };

  const getAlert = (savedProductId: number) =>
    alerts.find(a => a.savedProductId === savedProductId) ?? null;

  const undismissedTriggered = triggered.filter(t => !dismissedIds.has(t.id));

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <Heart className="h-5 w-5 text-red-400 fill-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Saved Items</h1>
              <p className="text-[12px] text-gray-400">
                {savedProducts?.length ?? 0} item{savedProducts?.length !== 1 ? "s" : ""} · {alerts.filter(a => !a.isTriggered).length} active alert{alerts.filter(a => !a.isTriggered).length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {alerts.filter(a => !a.isTriggered).length > 0 && (
            <button
              onClick={checkPrices}
              disabled={checking}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-60"
            >
              {checking
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking prices…</>
                : <><BellRing className="h-3.5 w-3.5" />Check Price Drops</>}
            </button>
          )}
        </div>

        {/* Triggered alert banners */}
        {undismissedTriggered.map(alert => (
          <div key={alert.id}
            className="mb-4 flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-2xl animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <TrendingDown className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-800">Price drop alert! 🎉</p>
              <p className="text-xs text-green-700 mt-0.5 line-clamp-1">{alert.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Now ₹{alert.currentPrice?.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-green-600">
                  ↓ from ₹{alert.savedPrice.toLocaleString("en-IN")} · target was ₹{alert.targetPrice.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={alert.productUrl} target="_blank" rel="noopener noreferrer"
                className="h-8 px-3 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-green-700 transition-colors">
                Buy now <ArrowUpRight className="h-3 w-3" />
              </a>
              <button onClick={() => setDismissedIds(s => new Set([...s, alert.id]))}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-green-100 transition-colors">
                <X className="h-3.5 w-3.5 text-green-500" />
              </button>
            </div>
          </div>
        ))}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : savedProducts && savedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedProducts.map(p => {
              const alert = getAlert(p.id);
              const srcStyle = SOURCE_STYLES[p.source] ?? { bg: "#f9fafb", text: "#374151", border: "#e5e7eb" };
              const [imgErr, setImgErr] = React.useState(false);

              return (
                <div key={p.id}
                  className="group bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md rounded-2xl overflow-hidden transition-all flex flex-col">
                  {/* Image */}
                  <div className="relative h-44 bg-gray-50 flex items-center justify-center p-4">
                    {!imgErr && p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.title}
                        className="max-h-full max-w-full object-contain"
                        onError={() => setImgErr(true)} />
                    ) : (
                      <Package className="h-12 w-12 text-gray-200" />
                    )}
                    {/* Alert badge */}
                    {alert && (
                      <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        alert.isTriggered
                          ? "bg-green-500 text-white"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}>
                        {alert.isTriggered
                          ? <><TrendingDown className="h-3 w-3" />Dropped!</>
                          : <><Bell className="h-3 w-3" />₹{alert.targetPrice.toLocaleString("en-IN")}</>}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                        style={{ background: srcStyle.bg, color: srcStyle.text, borderColor: srcStyle.border }}>
                        {p.source}
                      </span>
                      {p.rating && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold">
                          <Star className="h-3 w-3 fill-current" />{p.rating}
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{p.title}</h3>
                    <p className="text-lg font-bold text-gray-900 mt-auto">
                      ₹{p.price.toLocaleString("en-IN")}
                    </p>

                    {/* Alert progress bar */}
                    {alert && !alert.isTriggered && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Target ₹{alert.targetPrice.toLocaleString("en-IN")}</span>
                          {alert.currentPrice && (
                            <span>Current ₹{alert.currentPrice.toLocaleString("en-IN")}</span>
                          )}
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(5,
                                (1 - (alert.targetPrice / alert.savedPrice)) /
                                (1 - ((alert.currentPrice ?? alert.savedPrice) / alert.savedPrice) || 0.001) * 100
                              ))}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-100 mt-1">
                      <button
                        onClick={() => openAlertModal({
                          id: p.id,
                          productId: p.productId,
                          title: p.title,
                          imageUrl: p.imageUrl,
                          productUrl: p.productUrl,
                          source: p.source,
                          price: p.price,
                        })}
                        className={`flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-semibold border transition-all ${
                          alert
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                        }`}
                      >
                        <Bell className="h-3.5 w-3.5" />
                        {alert ? "Edit Alert" : "Set Alert"}
                      </button>
                      <button
                        onClick={() => removeMutation.mutate({ id: p.id })}
                        className="h-8 w-8 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-400 transition-all"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <a href={p.productUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 h-8 rounded-xl bg-primary text-white text-[11px] font-bold hover:bg-primary/90 transition-colors">
                        Buy <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Heart className="h-10 w-10 text-gray-200 mb-3" />
            <p className="font-semibold text-gray-500">No saved items yet</p>
            <p className="text-sm text-gray-400 mt-1">Heart a product in the chat to save it here</p>
          </div>
        )}
      </div>

      {/* Price Alert Modal */}
      {modalProduct && (
        <PriceAlertModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          savedProductId={modalProduct.savedProductId}
          productId={modalProduct.productId}
          title={modalProduct.title}
          imageUrl={modalProduct.imageUrl}
          productUrl={modalProduct.productUrl}
          source={modalProduct.source}
          currentPrice={modalProduct.price}
          existingAlert={getAlert(modalProduct.savedProductId) ?? null}
          onSaved={() => { loadAlerts(); refetch(); }}
        />
      )}
    </Layout>
  );
}
