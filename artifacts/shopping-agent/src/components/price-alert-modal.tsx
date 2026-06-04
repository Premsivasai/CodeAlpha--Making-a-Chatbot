import React, { useState } from "react";
import { Bell, BellOff, Target, TrendingDown, X, Loader2, Check } from "lucide-react";

interface PriceAlertModalProps {
  open: boolean;
  onClose: () => void;
  savedProductId: number;
  productId: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  source: string;
  currentPrice: number;
  existingAlert?: { id: number; targetPrice: number } | null;
  onSaved: () => void;
}

export function PriceAlertModal({
  open, onClose,
  savedProductId, productId, title, imageUrl, productUrl, source,
  currentPrice, existingAlert, onSaved,
}: PriceAlertModalProps) {
  const [targetPrice, setTargetPrice] = useState(
    existingAlert ? String(existingAlert.targetPrice) : String(Math.floor(currentPrice * 0.9))
  );
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "deleting">("idle");

  if (!open) return null;

  const parsedTarget = parseFloat(targetPrice);
  const validPrice = !isNaN(parsedTarget) && parsedTarget > 0;
  const savingPct = validPrice && currentPrice > 0
    ? Math.round((1 - parsedTarget / currentPrice) * 100)
    : null;

  const handleSave = async () => {
    if (!validPrice) return;
    setStatus("saving");
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedProductId, productId, title, imageUrl, productUrl, source,
          savedPrice: currentPrice,
          targetPrice: parsedTarget,
        }),
      });
      setStatus("done");
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch {
      setStatus("idle");
    }
  };

  const handleDelete = async () => {
    if (!existingAlert) return;
    setStatus("deleting");
    try {
      await fetch(`/api/alerts/${existingAlert.id}`, { method: "DELETE" });
      onSaved();
      onClose();
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
          <X className="h-4 w-4 text-gray-400" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Price Drop Alert</h2>
            <p className="text-[11px] text-gray-400">Get notified when the price drops</p>
          </div>
        </div>

        {/* Product preview */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl mb-5">
          {imageUrl && (
            <img src={imageUrl} alt={title}
              className="w-12 h-12 object-contain rounded-xl bg-white border border-gray-100 p-1 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{title}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{source}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-gray-400">Current</p>
            <p className="text-sm font-bold text-gray-900">₹{currentPrice.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Target price input */}
        <div className="mb-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
            Alert me when price drops to
          </label>
          <div className="flex items-center gap-2 bg-gray-50 border-2 border-gray-200 focus-within:border-amber-400 rounded-2xl px-4 py-3 transition-colors">
            <span className="text-lg font-bold text-gray-400">₹</span>
            <input
              type="number"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              className="flex-1 bg-transparent text-xl font-bold text-gray-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Enter target price"
              min={1}
            />
          </div>
        </div>

        {/* Saving indicator */}
        {savingPct !== null && savingPct > 0 && (
          <div className="flex items-center gap-2 mb-5 px-1">
            <TrendingDown className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <p className="text-[12px] text-green-600 font-semibold">
              You'll save {savingPct}% (₹{(currentPrice - parsedTarget).toLocaleString("en-IN")})
            </p>
          </div>
        )}
        {savingPct !== null && savingPct <= 0 && validPrice && (
          <div className="mb-5 px-1">
            <p className="text-[12px] text-amber-600 font-semibold">
              Target is above or equal to current price — set a lower target to track drops
            </p>
          </div>
        )}

        {/* Quick presets */}
        <div className="flex gap-2 mb-5">
          {[5, 10, 20, 30].map(pct => (
            <button key={pct}
              onClick={() => setTargetPrice(String(Math.floor(currentPrice * (1 - pct / 100))))}
              className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold border border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all">
              -{pct}%
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button onClick={handleSave}
            disabled={!validPrice || status === "saving" || status === "done"}
            className="w-full h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            {status === "saving" ? <><Loader2 className="h-4 w-4 animate-spin" />Setting alert…</>
              : status === "done" ? <><Check className="h-4 w-4" />Alert set!</>
              : <><Target className="h-4 w-4" />{existingAlert ? "Update Alert" : "Set Alert"}</>}
          </button>

          {existingAlert && (
            <button onClick={handleDelete}
              disabled={status === "deleting"}
              className="w-full h-10 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              {status === "deleting"
                ? <><Loader2 className="h-4 w-4 animate-spin" />Removing…</>
                : <><BellOff className="h-4 w-4" />Remove Alert</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
