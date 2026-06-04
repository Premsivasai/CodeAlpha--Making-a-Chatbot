import React, { useState } from "react";
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Star } from "lucide-react";

export interface FilterState {
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  stores: string[];
  sortBy: "relevance" | "price_asc" | "price_desc" | "rating";
}

export const DEFAULT_FILTERS: FilterState = {
  minPrice: null,
  maxPrice: null,
  minRating: null,
  stores: [],
  sortBy: "relevance",
};

const PRICE_PRESETS = [
  { label: "Under ₹500",    min: null, max: 500 },
  { label: "₹500–₹1,500",  min: 500,  max: 1500 },
  { label: "₹1,500–₹5,000",min: 1500, max: 5000 },
  { label: "₹5,000–₹15k",  min: 5000, max: 15000 },
  { label: "₹15k–₹50k",    min: 15000,max: 50000 },
  { label: "Above ₹50k",   min: 50000, max: null },
];

const RATING_OPTIONS = [
  { label: "4★ & above", value: 4 },
  { label: "3★ & above", value: 3 },
  { label: "Any rating",  value: null },
];

const SORT_OPTIONS: { label: string; value: FilterState["sortBy"] }[] = [
  { label: "Best match",    value: "relevance" },
  { label: "Price: Low→High", value: "price_asc" },
  { label: "Price: High→Low", value: "price_desc" },
  { label: "Highest rated", value: "rating" },
];

const STORES = ["Amazon", "Flipkart", "Google Shopping"];

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  resultCount: number;
  filteredCount: number;
}

export function FilterBar({ filters, onChange, resultCount, filteredCount }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const isActive =
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.minRating !== null ||
    filters.stores.length > 0 ||
    filters.sortBy !== "relevance";

  const activeCount = [
    filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0,
    filters.minRating !== null ? 1 : 0,
    filters.stores.length > 0 ? 1 : 0,
    filters.sortBy !== "relevance" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const reset = () => onChange({ ...DEFAULT_FILTERS });

  const toggleStore = (store: string) => {
    const next = filters.stores.includes(store)
      ? filters.stores.filter(s => s !== store)
      : [...filters.stores, store];
    onChange({ ...filters, stores: next });
  };

  const setPrice = (min: number | null, max: number | null) => {
    const alreadyActive = filters.minPrice === min && filters.maxPrice === max;
    onChange({ ...filters, minPrice: alreadyActive ? null : min, maxPrice: alreadyActive ? null : max });
  };

  const isPriceActive = (min: number | null, max: number | null) =>
    filters.minPrice === min && filters.maxPrice === max;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Filters
          {activeCount > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {activeCount}
            </span>
          )}
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
            : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </button>

        {/* Sort — always visible */}
        <div className="flex items-center gap-1 ml-2">
          {SORT_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => onChange({ ...filters, sortBy: s.value })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                filters.sortBy === s.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-gray-400">
            {filteredCount < resultCount
              ? <><span className="font-semibold text-gray-700">{filteredCount}</span> of {resultCount}</>
              : <span className="font-semibold text-gray-700">{resultCount}</span>} results
          </span>
          {isActive && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 font-semibold transition-colors"
            >
              <X className="h-3 w-3" />Clear
            </button>
          )}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Price */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Price Range</p>
            <div className="flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setPrice(p.min, p.max)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    isPriceActive(p.min, p.max)
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Min Rating</p>
            <div className="flex flex-col gap-1.5">
              {RATING_OPTIONS.map(r => (
                <button
                  key={r.label}
                  onClick={() => onChange({ ...filters, minRating: r.value })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                    filters.minRating === r.value
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-white text-gray-600 border-gray-200 hover:border-amber-200 hover:text-amber-600"
                  }`}
                >
                  <Star className={`h-3 w-3 ${filters.minRating === r.value ? "fill-amber-500 text-amber-500" : "text-gray-300"}`} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Store */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Store</p>
            <div className="flex flex-col gap-1.5">
              {STORES.map(store => {
                const colors: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
                  "Amazon":          { bg: "bg-white", text: "text-gray-600", border: "border-gray-200", activeBg: "bg-orange-50 text-orange-700 border-orange-200" },
                  "Flipkart":        { bg: "bg-white", text: "text-gray-600", border: "border-gray-200", activeBg: "bg-blue-50 text-blue-700 border-blue-200" },
                  "Google Shopping": { bg: "bg-white", text: "text-gray-600", border: "border-gray-200", activeBg: "bg-green-50 text-green-700 border-green-200" },
                };
                const c = colors[store]!;
                const active = filters.stores.includes(store);
                return (
                  <button
                    key={store}
                    onClick={() => toggleStore(store)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                      active ? c.activeBg : `${c.bg} ${c.text} ${c.border} hover:border-primary/30 hover:text-primary`
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${active ? "bg-current" : "bg-gray-300"}`} />
                    {store}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Apply filters + sort to a product list client-side
export function applyFilters(
  products: Array<{ price: number; rating?: number | null; source: string }>,
  filters: FilterState,
) {
  let result = [...products];

  if (filters.stores.length > 0)
    result = result.filter(p => filters.stores.includes(p.source));

  if (filters.minPrice !== null)
    result = result.filter(p => p.price >= filters.minPrice!);

  if (filters.maxPrice !== null)
    result = result.filter(p => p.price <= filters.maxPrice!);

  if (filters.minRating !== null)
    result = result.filter(p => (p.rating ?? 0) >= filters.minRating!);

  if (filters.sortBy === "price_asc")
    result.sort((a, b) => a.price - b.price);
  else if (filters.sortBy === "price_desc")
    result.sort((a, b) => b.price - a.price);
  else if (filters.sortBy === "rating")
    result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return result;
}
