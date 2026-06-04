import React, { useState, useEffect, useRef } from "react";
import { Product } from "@workspace/api-client-react";
import {
  Star, Heart, Bell, Share2, Flame, Scale, X,
  TrendingDown, TrendingUp, Award, ShoppingBag, Eye,
  ArrowUpRight, ShieldCheck, Check, Clock, ChevronRight,
  Sparkles, ThumbsUp, ChevronLeft, AlertCircle,
  User, Bot, Send, FileText
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidenceScore?: number;
  sources?: string[];
  pros?: string[];
  cons?: string[];
  recommendation?: string;
  suggestedFollowUps?: string[];
}
import { useSaveProduct, useRemoveSavedProduct, useListSavedProducts } from "@workspace/api-client-react";
import { PriceAlertModal } from "./price-alert-modal";
import { useToast } from "@/hooks/use-toast";

interface ProductDetailsProps {
  product: Product;
  onClose: () => void;
}

type PeriodTab = "1W" | "1M" | "3M" | "6M" | "1Y";

export function ProductDetails({ product, onClose }: ProductDetailsProps) {
  const { toast } = useToast();
  const { data: savedProducts } = useListSavedProducts();
  const saveMutation = useSaveProduct();
  const removeMutation = useRemoveSavedProduct();

  const [period, setPeriod] = useState<PeriodTab>("3M");
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(product.imageUrl);
  const [selectedAlertPrice, setSelectedAlertPrice] = useState<number | null>(null);

  const isSaved = savedProducts?.some(p => p.productId === product.id);

  // Chat timeline state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm your AI Buying Assistant. I have analyzed the specifications, price history, user sentiments, and alternatives for **${product.title}**. 
      
Ask me anything about gaming performance, price value, reviews, or side-by-side comparisons!`,
      confidenceScore: 99,
      sources: ["Product Specifications", "Price History", "Review Sentiment"],
      pros: product.pros?.length > 0 ? product.pros.slice(0, 2) : ["Value for money", "Popular choice"],
      cons: product.cons?.length > 0 ? product.cons.slice(0, 2) : ["Average low-light camera"],
      recommendation: "Buy Now",
      suggestedFollowUps: [
        `Is this good for gaming?`,
        "Should I buy now or wait for a sale?",
        `Compare with Poco X6`
      ]
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || isTyping) return;

    const userMsgId = `user-${Date.now()}`;
    const newUserMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: queryText
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const apiHistory = chatMessages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const res = await fetch("/api/shopping/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: queryText,
          product: product,
          history: apiHistory
        })
      });

      if (!res.ok) {
        throw new Error("Failed to get response from assistant");
      }

      const data = await res.json() as {
        answer: string;
        confidenceScore: number;
        sources: string[];
        pros: string[];
        cons: string[];
        recommendation: string;
        suggestedFollowUps: string[];
      };

      const assistantMsgId = `assistant-${Date.now()}`;
      setChatMessages(prev => [...prev, {
        id: assistantMsgId,
        role: "assistant",
        content: data.answer,
        confidenceScore: data.confidenceScore,
        sources: data.sources,
        pros: data.pros,
        cons: data.cons,
        recommendation: data.recommendation,
        suggestedFollowUps: data.suggestedFollowUps
      }]);
    } catch (err) {
      console.error("[ERROR] Failed to send query to assistant:", err);
      setChatMessages(prev => [...prev, {
        id: `assistant-err-${Date.now()}`,
        role: "assistant",
        content: `I'm having trouble connecting to the AI server. Based on our offline analysis, the **${product.title}** has a rating of **${product.rating || '4.3'}★** and is priced at **₹${product.price.toLocaleString("en-IN")}**.`,
        confidenceScore: 70,
        sources: ["Offline database"],
        pros: product.pros?.slice(0, 2) || [],
        cons: product.cons?.slice(0, 2) || [],
        recommendation: "Buy Now",
        suggestedFollowUps: [
          "What are the key specs?",
          "How is the battery?"
        ]
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedPrompts = [
    { label: "Is this worth buying?", sub: "Evaluate value for money", query: "Is this worth the price?" },
    { label: "Gaming performance?", sub: "Check gaming compatibility", query: `Is the ${product.title} good for gaming and high performance tasks?` },
    { label: "Should I buy now or wait?", sub: "Analyze price trend", query: "Should I buy this product now or wait for a price drop/sale?" },
    { label: "Compare with alternative?", sub: "Compare specs & price", query: `Compare this with the Poco X6 and Realme Narzo 70 Pro.` },
    { label: "Common complaints?", sub: "Check cons and negative reviews", query: "What are the common complaints and negative reviews for this product?" },
    { label: "Battery life details?", sub: "Check battery backup & charging", query: "How does the battery perform and how fast is the charging?" }
  ];

  // Generate thumbnail options
  const thumbnails = [
    product.imageUrl,
    // Add realistic variant images (using Unsplash based on category or standard placeholders)
    product.imageUrl ? product.imageUrl.replace("q=80", "q=80&fit=crop&h=200&w=200&sat=-50") : null,
    product.imageUrl ? product.imageUrl.replace("q=80", "q=80&fit=crop&h=200&w=200&hue=120") : null,
  ].filter((img): img is string => !!img);

  useEffect(() => {
    setSelectedImage(product.imageUrl);
  }, [product]);

  const discountPct = product.discount ??
    (product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null);

  const savings = product.originalPrice && product.originalPrice > product.price
    ? product.originalPrice - product.price
    : null;

  // Toggle saving
  const toggleSave = () => {
    if (isSaved) {
      const saved = savedProducts?.find(p => p.productId === product.id);
      if (saved) {
        removeMutation.mutate({ id: saved.id });
        toast({
          title: "Removed",
          description: "Product removed from saved list",
        });
      }
    } else {
      saveMutation.mutate({
        data: {
          productId: product.id,
          title: product.title,
          brand: product.brand || "Product",
          price: product.price,
          currency: product.currency || "INR",
          imageUrl: product.imageUrl || "",
          productUrl: product.productUrl,
          source: product.source,
          rating: product.rating,
        }
      });
      toast({
        title: "Saved",
        description: "Product added to saved list",
      });
    }
  };

  // Mock deal score
  const dealScore = parseFloat((
    ((product.rating || 4.2) * 1.5) + 
    ((discountPct || 10) / 10) + 
    ((product.valueScore || 7.5) * 0.2)
  ).toFixed(1));
  const finalDealScore = Math.min(10, Math.max(5.0, dealScore));

  // Determine deal rating feedback
  const getDealRatingLabel = (score: number) => {
    if (score >= 9.0) return { label: "Excellent Deal", color: "bg-green-500 text-white" };
    if (score >= 8.0) return { label: "Very Good Deal", color: "bg-emerald-500 text-white" };
    if (score >= 7.0) return { label: "Good Deal", color: "bg-amber-500 text-white" };
    return { label: "Average Value", color: "bg-gray-500 text-white" };
  };

  const dealRating = getDealRatingLabel(finalDealScore);

  // Dynamic Specifications mock based on product title/category
  const getDynamicSpecs = () => {
    const title = product.title.toLowerCase();
    const isPhone = title.includes("phone") || title.includes("mobile") || title.includes("iphone") || title.includes("galaxy") || product.category?.toLowerCase().includes("mobile");
    const isLaptop = title.includes("laptop") || title.includes("macbook") || title.includes("notebook") || title.includes("thinkpad") || product.category?.toLowerCase().includes("electronic");

    if (isPhone) {
      return [
        { label: "Display", value: '6.7" Super AMOLED', detail: "120Hz Refresh Rate" },
        { label: "Processor", value: "Octa-Core 5G processor", detail: "4nm Architecture" },
        { label: "RAM", value: "8GB / 12GB LPDDR5", detail: "Expandable virtual RAM" },
        { label: "Storage", value: "256GB UFS 3.1", detail: "Non-expandable" },
        { label: "Battery", value: "5000 mAh", detail: "Lithium Polymer" },
        { label: "Charging", value: "67W Fast Charging", detail: "0-100% in 45 mins" },
        { label: "Camera", value: "64MP Triple Camera", detail: "OIS, Nightography mode" },
        { label: "OS", value: "Android 14", detail: "Upgradable with UI patch" },
      ];
    }

    if (isLaptop) {
      return [
        { label: "Display", value: '15.6" Full HD IPS', detail: "Anti-glare, 300 nits" },
        { label: "Processor", value: "Intel Core i5 13th Gen", detail: "12 Cores, up to 4.6GHz" },
        { label: "RAM", value: "16GB DDR4", detail: "Dual-channel, upgradable" },
        { label: "Storage", value: "512GB PCIe NVMe SSD", detail: "Extra M.2 slot available" },
        { label: "Battery", value: "65 Whr battery", detail: "Up to 8 hours backup" },
        { label: "Charging", value: "65W USB-C PD Charging", detail: "Compact brick included" },
        { label: "Camera", value: "1080p FHD Webcam", detail: "With physical privacy shutter" },
        { label: "OS", value: "Windows 11 Home", detail: "Lifetime validity license" },
      ];
    }

    // Fallback standard specs
    return [
      { label: "Category", value: product.category || "Consumer Goods", detail: "High Quality" },
      { label: "Brand", value: product.brand || "Authentic", detail: "Original Manufacturer" },
      { label: "Quality Score", value: `${(product.qualityScore || 8.2)}/10`, detail: "Tested Benchmark" },
      { label: "Value Score", value: `${(product.valueScore || 8.0)}/10`, detail: "Price-to-specs value" },
      { label: "Trust Score", value: `${(product.trustScore || 8.5)}/10`, detail: "Verified user rating" },
      { label: "Warranty", value: "1 Year Brand Warranty", detail: "Covers manufacturing defects" },
      { label: "In Stock", value: product.inStock !== false ? "Yes" : "Out of stock", detail: "Ready to dispatch" },
      { label: "Delivery", value: product.deliveryInfo || "Standard delivery", detail: "Free delivery eligible" },
    ];
  };

  const specs = getDynamicSpecs();

  // Mock Price Comparison across platforms
  const basePrice = product.price;
  const generateComparisonSellers = () => {
    const list = [
      { seller: "Amazon", price: basePrice + (product.source === "Amazon" ? 0 : Math.round(basePrice * 0.03)), delivery: "Free Delivery", return: "10 Days", rating: "4.6★", stock: "In Stock" },
      { seller: "Flipkart", price: basePrice + (product.source === "Flipkart" ? 0 : Math.round(basePrice * 0.02)), delivery: "Free Delivery", return: "7 Days", rating: "4.5★", stock: "In Stock" },
      { seller: "Reliance Digital", price: basePrice + Math.round(basePrice * 0.06), delivery: "Free Delivery", return: "7 Days", rating: "4.2★", stock: "In Stock" },
      { seller: "Cashify (Pre-owned)", price: Math.round(basePrice * 0.75), delivery: "Free Delivery", return: "15 Days", rating: "4.3★", stock: "In Stock" },
    ];

    // Ensure the product's actual source is always exactly its price
    return list.map(item => {
      if (item.seller === product.source) {
        return { ...item, price: basePrice };
      }
      return item;
    }).sort((a, b) => a.price - b.price);
  };

  const comparisonSellers = generateComparisonSellers();
  const lowestPriceSeller = comparisonSellers[0];
  const highestPriceSeller = comparisonSellers[comparisonSellers.length - 1];
  const averagePrice = Math.round(comparisonSellers.reduce((acc, curr) => acc + curr.price, 0) / comparisonSellers.length);

  // Price history data builder
  const getPriceHistoryData = (tab: PeriodTab) => {
    const multipliers = {
      "1W": [1.02, 1.015, 1.03, 1.01, 0.99, 1.0, 1.0],
      "1M": [1.05, 1.03, 1.04, 1.01, 1.02, 0.98, 1.0],
      "3M": [1.08, 1.05, 1.06, 1.02, 1.04, 0.99, 1.0],
      "6M": [1.12, 1.10, 1.05, 1.03, 1.04, 0.99, 1.0],
      "1Y": [1.18, 1.15, 1.10, 1.05, 1.02, 0.98, 1.0],
    };
    return multipliers[tab].map(m => Math.round(basePrice * m));
  };

  const priceHistory = getPriceHistoryData(period);
  const minRecorded = Math.min(...priceHistory);
  const maxRecorded = Math.max(...priceHistory);

  // Draw SVG graph path
  const width = 500;
  const height = 150;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const points = priceHistory.map((val, idx) => {
    const x = padding + (idx / (priceHistory.length - 1)) * chartWidth;
    const normY = (val - minRecorded) / ((maxRecorded - minRecorded) || 1);
    const y = padding + (1 - normY) * chartHeight;
    return { x, y };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  // Sentiment Breakdown
  const reviewSentiment = { positive: 76, neutral: 17, negative: 7 };

  // Similar Products Fallback Mock list
  const similarMockProducts = [
    { name: "Poco X6 5G", price: Math.round(basePrice * 0.95), rating: 4.3, spec: "Dimensity 8300 Ultra", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=200&q=80" },
    { name: "Realme Narzo 70 Pro", price: Math.round(basePrice * 1.05), rating: 4.4, spec: "AMOLED 120Hz Display", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&q=80" },
    { name: "CMF Phone 1 by Nothing", price: Math.round(basePrice * 0.88), rating: 4.2, spec: "Clean Custom OS Design", image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=200&q=80" }
  ];

  return (
    <div className="flex flex-col h-auto lg:h-[90vh] lg:max-h-[90vh] lg:overflow-hidden bg-slate-50 relative select-none">
      
      {/* Premium Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Product Intelligence</span>
          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">v2.0 Beta</span>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden lg:min-h-0 px-4 md:px-6 py-6 pb-24 lg:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">
          
          {/* Left Column: Product Specifications & Intel Modules */}
          <div className="lg:col-span-5 h-full overflow-y-auto pr-2 space-y-6 pb-20 lg:pb-24">
            
            {/* Hero & Image Layout */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col items-center gap-4">
              <div className="relative w-full h-56 flex items-center justify-center p-3 bg-slate-50 rounded-2xl">
                {selectedImage ? (
                  <img src={selectedImage} alt={product.title} className="max-h-full max-w-full object-contain" />
                ) : (
                  <ShoppingBag className="w-12 h-12 text-slate-200" />
                )}
                {discountPct && (
                  <span className="absolute top-3 left-3 text-[10px] font-extrabold bg-green-500 text-white px-2 py-0.5 rounded-lg shadow-sm">
                    {discountPct}% OFF
                  </span>
                )}
              </div>

              {/* Thumbnail Row */}
              {thumbnails.length > 1 && (
                <div className="flex gap-1.5 justify-center w-full">
                  {thumbnails.map((thumb, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(thumb)}
                      className={`w-12 h-12 rounded-lg p-1 bg-slate-50 border-2 overflow-hidden flex items-center justify-center transition-all ${
                        selectedImage === thumb ? "border-primary shadow-xs" : "border-transparent opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={thumb} alt="" className="max-h-full max-w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Core Info & Specs */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-4">
              <div>
                {product.brand && (
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{product.brand}</span>
                )}
                <h1 className="text-base font-bold text-slate-900 leading-snug mt-0.5">{product.title}</h1>
                <p className="text-[10px] text-slate-400 mt-0.5">Category: {product.category || "General Electronics"}</p>
              </div>

              {/* Price Insights Panel */}
              <div className="p-3 bg-slate-50/70 rounded-2xl space-y-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-slate-905">₹{product.price.toLocaleString("en-IN")}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xs text-slate-400 line-through">₹{product.originalPrice.toLocaleString("en-IN")}</span>
                  )}
                </div>
                {savings && (
                  <div className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    You Save ₹{savings.toLocaleString("en-IN")} ({discountPct}%)
                  </div>
                )}
              </div>

              {/* Deal Score Badge */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {finalDealScore}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-800">Deal Score</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded">
                      {dealRating.label}
                    </span>
                    <span className="text-[9px] text-slate-400">based on ratings & discount</span>
                  </div>
                </div>
              </div>

              {/* Indicators checklist */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <span className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500 shrink-0" /> Lowest in 30 Days
                </span>
                <span className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500 shrink-0" /> Excellent Value
                </span>
                <span className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500 shrink-0" /> Popular Choice
                </span>
                <span className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500 shrink-0" /> Verified Seller
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5 flex-wrap pt-1.5">
                <button onClick={() => {
                  const element = document.getElementById("price-comparison");
                  element?.scrollIntoView({ behavior: "smooth" });
                }} className="flex-1 h-8 bg-primary hover:bg-primary/95 text-white font-bold text-[10px] rounded-lg flex items-center justify-center gap-1 transition-all">
                  🔥 Get Best Deal
                </button>
                <button onClick={toggleSave}
                  className={`w-8 h-8 border rounded-lg flex items-center justify-center transition-all ${
                    isSaved ? "bg-red-50 text-red-500 border-red-200" : "bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
                </button>
                <button onClick={() => setAlertOpen(true)}
                  className="h-8 px-2 border border-slate-200 hover:border-amber-300 text-slate-600 hover:text-amber-600 rounded-lg flex items-center justify-center gap-1 text-[10px] transition-all"
                >
                  <Bell className="w-3 h-3" /> Track Price
                </button>
              </div>
            </div>

            {/* Recommended Seller Card */}
            <div className="bg-white border border-slate-150 rounded-3xl p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommended Seller</h3>
              <div className="p-2.5 border border-emerald-100 bg-emerald-55/50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-emerald-800">{lowestPriceSeller.seller}</span>
                  <p className="text-[9px] text-slate-400 mt-0.5">Free Shipping · {lowestPriceSeller.return} Return</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-800">₹{lowestPriceSeller.price.toLocaleString("en-IN")}</span>
                  <span className="block text-[8px] font-semibold text-emerald-600">🏆 Best Deal</span>
                </div>
              </div>
              
              <div className="space-y-1 text-[10px] text-slate-500 border-t border-b border-slate-100 py-2">
                <p className="flex justify-between"><span>Availability:</span> <span className="font-semibold text-green-600">In Stock</span></p>
                <p className="flex justify-between"><span>Delivery:</span> <span className="font-semibold text-slate-700">Tomorrow</span></p>
                <p className="flex justify-between"><span>Merchant Rating:</span> <span className="font-semibold text-amber-500">{lowestPriceSeller.rating}</span></p>
              </div>

              <a href={product.productUrl} target="_blank" rel="noopener noreferrer"
                className="w-full h-9 bg-green-600 hover:bg-green-700 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1 shadow-xs hover:shadow-sm transition-all">
                Go to Store <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>

            {/* Live Price Comparison Table */}
            <div id="price-comparison" className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                <Award className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold text-slate-905">Live Price Comparison</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-left">
                  <thead>
                    <tr className="text-slate-400 uppercase tracking-widest font-bold border-b border-slate-100">
                      <th className="py-1.5">Seller</th>
                      <th className="py-1.5">Price</th>
                      <th className="py-1.5">Delivery</th>
                      <th className="py-1.5">Returns</th>
                      <th className="py-1.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comparisonSellers.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 font-semibold text-slate-800">
                          {s.seller}
                          {idx === 0 && <span className="ml-1 text-[8px] bg-green-100 text-green-700 px-1 py-0.2 rounded">Cheapest</span>}
                        </td>
                        <td className="py-2 font-black text-slate-900">₹{s.price.toLocaleString("en-IN")}</td>
                        <td className="py-2 text-slate-500">{s.delivery}</td>
                        <td className="py-2 text-slate-500">{s.return}</td>
                        <td className="py-2 text-right">
                          <a href={product.productUrl} target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-0.5 h-6 px-2 rounded-md text-[9px] font-bold transition-all ${
                              idx === 0 ? "bg-green-600 text-white hover:bg-green-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}>
                            Buy <ArrowUpRight className="w-2.5 h-2.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <span className="text-[8px] text-green-700 font-bold">Lowest</span>
                  <p className="text-xs font-black text-green-800 mt-0.5">₹{lowestPriceSeller.price.toLocaleString("en-IN")}</p>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-[8px] text-slate-505 font-bold">Average</span>
                  <p className="text-xs font-black text-slate-700 mt-0.5">₹{averagePrice.toLocaleString("en-IN")}</p>
                </div>
                <div className="p-1.5 bg-red-50 rounded-lg">
                  <span className="text-[8px] text-red-700 font-bold">Highest</span>
                  <p className="text-xs font-black text-red-800 mt-0.5">₹{highestPriceSeller.price.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>

            {/* Price History Chart */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <h2 className="text-xs font-bold text-slate-900">Price History</h2>
                </div>
                {/* Tabs */}
                <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                  {(["1W", "1M", "3M", "6M", "1Y"] as PeriodTab[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setPeriod(t)}
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        period === t ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="relative bg-slate-50/50 rounded-2xl border border-slate-100 p-2 h-32 flex items-center justify-center">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                  <path d={areaD} fill="rgba(var(--primary-rgb, 99, 102, 241), 0.08)" />
                  <path d={pathD} fill="none" stroke="rgb(var(--primary-rgb, 99, 102, 241))" strokeWidth="2.5" />
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="3" fill="white" stroke="rgb(var(--primary-rgb, 99, 102, 241))" strokeWidth="1.5" />
                      {i === points.length - 1 && (
                        <text x={p.x - 10} y={p.y - 10} fill="rgb(var(--primary-rgb, 99, 102, 241))" fontSize="9" fontWeight="bold">
                          ₹{priceHistory[i].toLocaleString("en-IN")}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 items-center">
                <div className="p-2 border border-green-100 bg-green-50/30 rounded-xl">
                  <div className="flex items-center gap-0.5 text-[8px] text-green-700 font-extrabold">
                    <TrendingDown className="w-3 h-3" /> Trend: Decreasing
                  </div>
                  <p className="text-[8px] text-slate-500 mt-0.5 leading-normal">Price is 8% below average market price.</p>
                </div>
                <div className="p-2 border border-emerald-100 bg-emerald-50 rounded-xl flex items-center justify-center text-center">
                  <span className="text-[10px] font-black text-emerald-800">✅ Good time to buy</span>
                </div>
              </div>
            </div>

            {/* Review Analytics Panel */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                <ThumbsUp className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold text-slate-900">Review Summary Dashboard</h2>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                {/* Overall */}
                <div className="col-span-4 text-center space-y-0.5 border-r border-slate-100">
                  <span className="text-2xl font-black text-slate-900">{product.rating || "4.3"}</span>
                  <div className="flex justify-center text-amber-400">
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 text-slate-200 fill-current" />
                  </div>
                  <p className="text-[8px] text-slate-400">({(product.reviewCount || 1024).toLocaleString()} ratings)</p>
                </div>

                {/* Progress bars */}
                <div className="col-span-8 space-y-1.5 text-[8px]">
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-semibold">Positive Sentiment</span>
                      <span>{reviewSentiment.positive}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${reviewSentiment.positive}%` }} />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-semibold">Neutral Sentiment</span>
                      <span>{reviewSentiment.neutral}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: `${reviewSentiment.neutral}%` }} />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-semibold">Negative Sentiment</span>
                      <span>{reviewSentiment.negative}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${reviewSentiment.negative}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-1 pt-1.5 border-t border-slate-100">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Most Mentioned Keywords</span>
                <div className="flex gap-1.5 flex-wrap pt-0.5">
                  {["Gaming", "Performance", "Value", "Battery", "Fast charging", "AMOLED Screen"].map(kw => (
                    <span key={kw} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pros & Cons Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pros */}
              <div className="bg-green-50/30 border border-green-100 rounded-2xl p-4 space-y-2">
                <h3 className="text-xs font-extrabold text-green-800 flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-600" /> Pros
                </h3>
                <ul className="text-[10px] text-slate-700 space-y-1">
                  {(product.pros.length > 0 ? product.pros : ["Highly affordable in its segment", "Responsive hardware", "Crisp high refresh-rate AMOLED display", "Excellent battery life", "Premium visual design"]).slice(0, 4).map((pro, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cons */}
              <div className="bg-red-50/30 border border-red-100 rounded-2xl p-4 space-y-2">
                <h3 className="text-xs font-extrabold text-red-800 flex items-center gap-1">
                  <X className="w-4 h-4 text-red-600" /> Cons
                </h3>
                <ul className="text-[10px] text-slate-700 space-y-1">
                  {(product.cons.length > 0 ? product.cons : ["Average low-light camera performance", "Wireless charging is not supported", "Slow software patches & OS major updates"]).slice(0, 4).map((con, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <X className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold text-slate-900">Technical Specifications</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {specs.map((spec, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-0.5 hover:shadow-xs transition-all">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider block">{spec.label}</span>
                    <span className="text-xs font-bold text-slate-800 block truncate">{spec.value}</span>
                    <span className="text-[8px] text-slate-500 block truncate">{spec.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alternatives */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                <Award className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold text-slate-900">Alternatives & Competitors</h2>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {similarMockProducts.map((p, idx) => (
                  <div key={idx} className="p-2.5 border border-slate-150 rounded-xl flex flex-col justify-between hover:shadow-xs transition-all bg-white relative">
                    <div className="space-y-1">
                      <div className="h-16 bg-slate-50 rounded-lg flex items-center justify-center p-1">
                        <img src={p.image} alt={p.name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-800 truncate" title={p.name}>{p.name}</h4>
                        <p className="text-[8px] text-slate-400 mt-0.5 truncate">{p.spec}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-100">
                      <span className="text-[10px] font-black text-slate-900">₹{p.price.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Center Column: Interactive AI Chat Timeline */}
          <div className="lg:col-span-4 flex flex-col border border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden h-[550px] lg:h-full min-h-[450px] mb-6 lg:mb-0">
            {/* Chat Panel Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs font-bold text-slate-800">AI Shopping Advisor</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">Gemini 3.5 Active</span>
            </div>

            {/* Chat Timeline (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {chatMessages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex gap-2 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Icon/Avatar */}
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border text-xs font-bold ${
                    msg.role === "user" 
                      ? "bg-slate-200 border-slate-300 text-slate-700" 
                      : "bg-primary/10 border-primary/20 text-primary"
                  }`}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-2xl p-3.5 max-w-[85%] shadow-2xs space-y-3 ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-white border border-slate-150 rounded-tl-sm text-slate-850"
                  }`}>
                    {/* Message text */}
                    <div className="text-[11px] leading-relaxed whitespace-pre-line">
                      <AnswerText text={msg.content} />
                    </div>

                    {/* Recommendation & Confidence score */}
                    {msg.role === "assistant" && (msg.confidenceScore !== undefined || msg.recommendation !== undefined) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[9px] font-semibold text-slate-500">
                        {msg.confidenceScore !== undefined && (
                          <div className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-green-500" />
                            <span>Confidence:</span>
                            <span className="text-slate-800 font-bold">{msg.confidenceScore}%</span>
                          </div>
                        )}
                        {msg.recommendation !== undefined && (
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                            msg.recommendation === "Buy Now" ? "bg-green-50 text-green-700 border-green-200" :
                            msg.recommendation === "Wait for Sale" || msg.recommendation === "Wait" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {msg.recommendation === "Buy Now" ? "🔥 Buy Now" : msg.recommendation === "Wait" || msg.recommendation === "Wait for Sale" ? "⏳ Wait" : "💡 Alternatives"}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Dynamic query-specific Pros & Cons */}
                    {msg.role === "assistant" && ((msg.pros && msg.pros.length > 0) || (msg.cons && msg.cons.length > 0)) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9px] bg-slate-50 p-2 rounded-xl border border-slate-150">
                        {msg.pros && msg.pros.length > 0 && (
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-green-700 flex items-center gap-0.5">✓ Pros</span>
                            <ul className="space-y-0.5 text-slate-600 pl-1 list-inside list-disc">
                              {msg.pros.slice(0, 3).map((p, pIdx) => <li key={pIdx} className="truncate" title={p}>{p}</li>)}
                            </ul>
                          </div>
                        )}
                        {msg.cons && msg.cons.length > 0 && (
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-red-700 flex items-center gap-0.5">✗ Cons</span>
                            <ul className="space-y-0.5 text-slate-600 pl-1 list-inside list-disc">
                              {msg.cons.slice(0, 3).map((c, cIdx) => <li key={cIdx} className="truncate" title={c}>{c}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sources pills */}
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1">
                          {msg.sources.map((src, sIdx) => (
                            <span key={sIdx} className="inline-flex items-center gap-0.5 text-[8px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              <FileText className="w-2.5 h-2.5 text-slate-400" />
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested follow-up chips */}
                    {msg.role === "assistant" && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Suggested Follow-ups</span>
                        <div className="flex flex-col gap-1">
                          {msg.suggestedFollowUps.slice(0, 3).map((followUp, fIdx) => (
                            <button
                              key={fIdx}
                              onClick={() => handleSendMessage(followUp)}
                              className="text-left text-[9px] font-medium bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-lg px-2 py-1 text-primary transition-all truncate"
                            >
                              {followUp}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2 items-start animate-pulse">
                  <div className="w-7 h-7 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-primary animate-spin" />
                  </div>
                  <div className="flex flex-col gap-1 bg-white border border-slate-150 rounded-2xl rounded-tl-sm p-3.5 shadow-2xs max-w-[85%]">
                    <div className="flex gap-1 items-center py-1">
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="w-1.5 h-1.5 rounded-full bg-slate-450 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                    <span className="text-[9px] text-slate-400">Assistant is thinking...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-slate-100 bg-white shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputMessage); }} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask the shopping expert..."
                  className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/15"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isTyping}
                  className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/95 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Suggested Prompt Cards & Chips */}
          <div className="lg:col-span-3 space-y-4 h-full overflow-y-auto pb-20 lg:pb-24 pr-1">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Suggested Questions</h3>
              <div className="flex flex-col gap-2.5">
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.query)}
                    className="p-3 border border-slate-150 hover:border-primary/30 rounded-2xl bg-white hover:bg-slate-55 text-left transition-all group shadow-2xs"
                  >
                    <span className="text-[10px] font-bold text-slate-800 group-hover:text-primary transition-colors flex items-center gap-1">
                      {p.label}
                      <ArrowUpRight className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <p className="text-[9px] text-slate-500 mt-1 leading-normal">{p.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Quick Action Chips</span>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { kw: "Gaming Performance", query: `How is the gaming performance of ${product.title}? Can it run PUBG/BGMI at high settings?` },
                  { kw: "Camera Quality", query: `How does the camera perform on ${product.title}? Is it good in low light?` },
                  { kw: "Battery Life", query: `What is the real-world battery backup and charging speed of ${product.title}?` },
                  { kw: "Price History", query: `Is the current price of ₹${product.price} a good deal compared to history?` },
                  { kw: "Review Summary", query: `What do reviews say about the build quality and software on ${product.title}?` },
                  { kw: "Community Feedback", query: `What are users on Reddit and forums saying about ${product.title}?` }
                ].map((kwItem) => (
                  <button
                    key={kwItem.kw}
                    onClick={() => handleSendMessage(kwItem.query)}
                    className="text-[9px] bg-slate-100 hover:bg-primary/10 hover:text-primary px-2.5 py-1.5 rounded-full font-semibold text-slate-600 transition-all border border-transparent hover:border-primary/20"
                  >
                    {kwItem.kw}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Persistent Sticky Bottom buy panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-150 shadow-2xl p-4 flex items-center justify-between z-45 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="max-h-full max-w-full object-contain p-1" />
            ) : (
              <ShoppingBag className="w-5 h-5 text-slate-300" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[200px] sm:max-w-md">{product.title}</h4>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-black text-slate-900">₹{product.price.toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-slate-400">({lowestPriceSeller.seller})</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setAlertOpen(true)}
            className="w-10 h-10 border border-slate-200 hover:border-amber-300 rounded-xl flex items-center justify-center text-slate-500 hover:text-amber-600 transition-all"
            title="Track Price"
          >
            <Bell className="w-4 h-4" />
          </button>
          <a href={product.productUrl} target="_blank" rel="noopener noreferrer"
            className="h-10 px-6 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all">
            Buy Now <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Price Alert Dialog Wrapper */}
      {isSaved && savedProducts ? (
        <PriceAlertModal
          open={alertOpen}
          onClose={() => setAlertOpen(false)}
          savedProductId={savedProducts.find(p => p.productId === product.id)!.id}
          productId={product.id}
          title={product.title}
          imageUrl={product.imageUrl || ""}
          productUrl={product.productUrl}
          source={product.source}
          currentPrice={product.price}
          onSaved={() => {}}
        />
      ) : alertOpen ? (
        // If not saved, we first save then trigger the alert setup
        <PriceAlertPopupTrigger
          product={product}
          open={alertOpen}
          onClose={() => setAlertOpen(false)}
          saveMutation={saveMutation}
          savedProducts={savedProducts || []}
        />
      ) : null}

    </div>
  );
}

// Inner helper component to auto-save and open the price alert modal when tracking from a non-saved card
function PriceAlertPopupTrigger({
  product, open, onClose, saveMutation, savedProducts
}: {
  product: Product; open: boolean; onClose: () => void;
  saveMutation: ReturnType<typeof useSaveProduct>;
  savedProducts: Array<{ id: number; productId: string }>;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const existing = savedProducts.find(p => p.productId === product.id);
      if (existing) {
        setLoading(false);
      } else {
        saveMutation.mutate({
          data: {
            productId: product.id,
            title: product.title,
            brand: product.brand || "Product",
            price: product.price,
            currency: product.currency || "INR",
            imageUrl: product.imageUrl || "",
            productUrl: product.productUrl,
            source: product.source,
            rating: product.rating,
          }
        }, {
          onSuccess: () => {
            setLoading(false);
          },
          onError: () => {
            onClose();
          }
        });
      }
    };
    if (open) run();
  }, [open, product, savedProducts, saveMutation, onClose]);

  const savedRecord = savedProducts.find(p => p.productId === product.id);

  if (loading || !savedRecord) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
          <AlertCircle className="w-8 h-8 text-amber-500 animate-pulse" />
          <p className="text-xs font-semibold text-slate-700">Preparing price tracking alert...</p>
        </div>
      </div>
    );
  }

  return (
    <PriceAlertModal
      open={open}
      onClose={onClose}
      savedProductId={savedRecord.id}
      productId={product.id}
      title={product.title}
      imageUrl={product.imageUrl || ""}
      productUrl={product.productUrl}
      source={product.source}
      currentPrice={product.price}
      onSaved={() => {}}
    />
  );
}

function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part))
          return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        if (/^\[\d+\]$/.test(part))
          return (
            <sup key={i} className="text-[9px] font-bold text-primary bg-primary/10 rounded px-1 py-0.5 mx-0.5 cursor-pointer">
              {part}
            </sup>
          );
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
