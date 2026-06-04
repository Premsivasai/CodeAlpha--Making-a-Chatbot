import React, { useState, useRef, useEffect } from "react";
import { ProductCard } from "@/components/product-card";
import { FilterBar, DEFAULT_FILTERS, applyFilters, type FilterState } from "@/components/filter-bar";
import { Product } from "@workspace/api-client-react";
import {
  Send, Loader2, Sparkles, AlertCircle, Scale,
  Share2, RotateCcw, ShoppingBag, ChevronRight, X,
  Globe, ExternalLink, Search, TrendingUp, Zap,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { ShareChatModal } from "@/components/share-chat-modal";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

interface ClarifyQuestion {
  id: string;
  question: string;
  type: "choice" | "range" | "text";
  options?: string[];
  placeholder?: string;
}

interface WebSource {
  position: number;
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  favicon: string;
  date?: string;
}

interface SuggestionItem {
  emoji: string;
  text: string;
  category: string;
}

type SearchMode = "shopping" | "web";

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "ai"; text: string }
  | { role: "products"; products: Product[]; summary: string; query: string }
  | {
      role: "websearch";
      answer: string;
      sources: WebSource[];
      relatedQuestions: string[];
      query: string;
      products?: Product[];
      productQuery?: string;
      isProductSearch: boolean;
    };

type ChatStep = "idle" | "clarifying" | "searching" | "results";

const FALLBACK_SHOPPING: SuggestionItem[] = [
  { emoji: "🎧", text: "Wireless earphones under ₹1500", category: "Electronics" },
  { emoji: "👟", text: "Running shoes for men under ₹2000", category: "Sports" },
  { emoji: "💻", text: "Gaming laptop under ₹60000", category: "Electronics" },
  { emoji: "🍳", text: "Air fryer 4L for home", category: "Home" },
];

const WEB_SUGGESTIONS: SuggestionItem[] = [
  { emoji: "🤔", text: "What is quantum computing explained simply?", category: "Tech" },
  { emoji: "📈", text: "Best investment strategies for beginners in India", category: "Finance" },
  { emoji: "🌍", text: "Climate change impact on India in 2025", category: "News" },
  { emoji: "💡", text: "How does ChatGPT actually work?", category: "Tech" },
];

const CATEGORIES = ["All", "Electronics", "Fashion", "Home", "Sports", "Beauty", "Mobiles"];

function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part))
          return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        if (/^\[\d+\]$/.test(part))
          return (
            <sup key={i} className="text-[10px] font-bold text-[#06B6D4] bg-[#06B6D4]/10 rounded px-1 py-0.5 mx-0.5 cursor-pointer">
              {part}
            </sup>
          );
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (data?.session?.access_token) {
    headers["Authorization"] = `Bearer ${data.session.access_token}`;
  }
  return headers;
};

function useSearchQuery() {
  const [search, setSearch] = useState(() => typeof window !== "undefined" ? window.location.search : "");
  useEffect(() => {
    const handleLocationChange = () => {
      setSearch(window.location.search);
    };
    window.addEventListener("popstate", handleLocationChange);
    
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleLocationChange();
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleLocationChange();
    };
    
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);
  return search;
}

export default function ChatPage() {
  const [input, setInput]               = useState("");
  const [step, setStep]                 = useState<ChatStep>("idle");
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarifyQuestion[]>([]);
  const [clarifyAnswers, setClarifyAnswers]     = useState<Record<string, string>>({});
  const [currentQIdx, setCurrentQIdx]   = useState(0);
  const [textInput, setTextInput]       = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [allProducts, setAllProducts]   = useState<Product[]>([]);
  const [allSummary, setAllSummary]     = useState("");
  const [compareList, setCompareList]   = useState<Product[]>([]);
  const [shareOpen, setShareOpen]       = useState(false);
  const [filters, setFilters]           = useState<FilterState>(DEFAULT_FILTERS);
  const [searchMode, setSearchMode]     = useState<SearchMode>("shopping");
  const [suggestions, setSuggestions]   = useState<SuggestionItem[]>(FALLBACK_SHOPPING);
  const [activeCategory, setActiveCategory] = useState("All");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [, setLocation]                 = useLocation();

  const chatEndRef   = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const searchQuery = useSearchQuery();
  const params = new URLSearchParams(searchQuery);
  const activeConvoId = params.get("c");

  /* ── Load AI suggestions on mount & category change ── */
  useEffect(() => {
    if (searchMode !== "shopping") return;
    setSuggestionsLoading(true);
    const cat = activeCategory === "All" ? undefined : activeCategory;
    
    const fetchSuggestions = async () => {
      try {
        const headers = await getAuthHeaders();
        const r = await fetch(`/api/search/suggestions${cat ? `?category=${encodeURIComponent(cat)}` : ""}`, {
          headers,
        });
        const data = await r.json();
        if (data.trending?.length) setSuggestions(data.trending.slice(0, 8));
      } catch (err) {
        setSuggestions(FALLBACK_SHOPPING);
      } finally {
        setSuggestionsLoading(false);
      }
    };
    fetchSuggestions();
  }, [searchMode, activeCategory]);

  /* ── Load Conversation details if c is in URL ── */
  useEffect(() => {
    if (activeConvoId) {
      setIsLoading(true);
      const loadConversation = async () => {
        try {
          const headers = await getAuthHeaders();
          const r = await fetch(`/api/openai/conversations/${activeConvoId}`, {
            headers,
          });
          if (!r.ok) throw new Error("Conversation not found");
          const data = await r.json();

          const mappedMessages: ChatMessage[] = (data.messages || []).map((m: any) => {
            if (m.role === "user") {
              return { role: "user", text: m.content };
            } else if (m.role === "assistant" || m.role === "ai") {
              return { role: "ai", text: m.content };
            } else if (m.role === "products") {
              try {
                const parsed = JSON.parse(m.content);
                return { role: "products", products: parsed.products ?? [], summary: parsed.summary ?? "", query: parsed.query ?? "" };
              } catch (e) {
                return { role: "products", products: [], summary: m.content, query: "" };
              }
            } else if (m.role === "websearch") {
              try {
                const parsed = JSON.parse(m.content);
                return {
                  role: "websearch",
                  answer: parsed.answer ?? "",
                  sources: parsed.sources ?? [],
                  relatedQuestions: parsed.relatedQuestions ?? [],
                  query: parsed.query ?? "",
                  products: parsed.products,
                  productQuery: parsed.productQuery,
                  isProductSearch: parsed.isProductSearch ?? false,
                };
              } catch (e) {
                return {
                  role: "websearch",
                  answer: m.content,
                  sources: [],
                  relatedQuestions: [],
                  query: "",
                  isProductSearch: false,
                };
              }
            }
            return null;
          }).filter(Boolean) as ChatMessage[];

          setMessages(mappedMessages);
          setCurrentQuery(data.title ?? "");
          if (mappedMessages.length > 0) {
            setStep("results");
            // Find last products or websearch message to populate active search details
            const lastProductMsg = [...mappedMessages].reverse().find(m => m.role === "products");
            if (lastProductMsg && lastProductMsg.role === "products") {
              setAllProducts(lastProductMsg.products);
              setAllSummary(lastProductMsg.summary);
            } else {
              setAllProducts([]);
              setAllSummary("");
            }
          } else {
            setStep("idle");
          }
        } catch (err) {
          console.error(err);
          setLocation("/");
          resetChat();
        } finally {
          setIsLoading(false);
        }
      };
      loadConversation();
    } else {
      resetChat();
    }
  }, [activeConvoId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const pushMsg = (msg: ChatMessage) => setMessages(p => [...p, msg]);

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent | null, override?: string, modeOverride?: SearchMode) => {
    if (e) e.preventDefault();
    const query = (override ?? input).trim();
    if (!query || isLoading) return;
    const mode = modeOverride ?? searchMode;

    setInput("");
    setIsLoading(true);
    setCompareList([]);
    setCurrentQuery(query);
    pushMsg({ role: "user", text: query });

    // 1. Create conversation if it doesn't exist
    let convoId = activeConvoId;
    if (!convoId) {
      try {
        const headers = await getAuthHeaders();
        const createRes = await fetch("/api/openai/conversations", {
          method: "POST",
          headers,
          body: JSON.stringify({ title: query }),
        });
        if (createRes.ok) {
          const newConvo = await createRes.json();
          convoId = String(newConvo.id);
          window.history.pushState(null, "", `/?c=${convoId}`);
          window.dispatchEvent(new Event("popstate"));
        }
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    }

    // 2. Save user query to DB manual logs
    if (convoId) {
      try {
        const headers = await getAuthHeaders();
        await fetch(`/api/openai/conversations/${convoId}/messages/manual`, {
          method: "POST",
          headers,
          body: JSON.stringify({ role: "user", content: query }),
        });
      } catch (err) {
        console.error("Failed to log user query:", err);
      }
    }

    if (mode === "web") {
      await runWebSearch(query, convoId || undefined);
      return;
    }

    setStep("clarifying");
    try {
      const headers = await getAuthHeaders();
      const res  = await fetch("/api/shopping/clarify", {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
      });
      const data = await res.json() as {
        needsClarification: boolean;
        questions: ClarifyQuestion[];
        refinedQuery: string | null;
      };
      if (data.needsClarification && data.questions.length > 0) {
        setClarifyQuestions(data.questions);
        setClarifyAnswers({});
        setCurrentQIdx(0);
        setIsLoading(false);
        const question = data.questions[0]?.question ?? "";
        pushMsg({ role: "ai", text: question });

        // Save first AI clarification question to DB
        if (convoId) {
          try {
            await fetch(`/api/openai/conversations/${convoId}/messages/manual`, {
              method: "POST",
              headers,
              body: JSON.stringify({ role: "assistant", content: question }),
            });
          } catch (err) {
            console.error("Failed to log first AI question:", err);
          }
        }
      } else {
        await runSearch(data.refinedQuery ?? query, convoId || undefined);
      }
    } catch {
      await runSearch(query, convoId || undefined);
    }
  };

  // Auto-run query from URL param ?q=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get("q");
    const modeParam = params.get("mode") as SearchMode | null;
    if (queryParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (modeParam === "web" || modeParam === "shopping") {
        setSearchMode(modeParam);
      }
      setInput(queryParam);
      setTimeout(() => {
        handleSubmit(null, queryParam, modeParam || undefined);
      }, 50);
    }
  }, []);

  const answerQuestion = async (answer: string) => {
    const q = clarifyQuestions[currentQIdx];
    if (!q) return;
    const newAnswers = { ...clarifyAnswers, [q.id]: answer };
    setClarifyAnswers(newAnswers);
    pushMsg({ role: "user", text: answer });

    // Save user choice to DB
    if (activeConvoId) {
      try {
        const headers = await getAuthHeaders();
        await fetch(`/api/openai/conversations/${activeConvoId}/messages/manual`, {
          method: "POST",
          headers,
          body: JSON.stringify({ role: "user", content: answer }),
        });
      } catch (err) {
        console.error("Failed to save clarify choice:", err);
      }
    }

    const next = currentQIdx + 1;
    if (next < clarifyQuestions.length) {
      setCurrentQIdx(next);
      const nextQuestion = clarifyQuestions[next]?.question ?? "";
      pushMsg({ role: "ai", text: nextQuestion });

      // Save next AI question to DB
      if (activeConvoId) {
        try {
          const headers = await getAuthHeaders();
          await fetch(`/api/openai/conversations/${activeConvoId}/messages/manual`, {
            method: "POST",
            headers,
            body: JSON.stringify({ role: "assistant", content: nextQuestion }),
          });
        } catch (err) {
          console.error("Failed to save next question:", err);
        }
      }
    } else {
      const parts = [currentQuery];
      Object.values(newAnswers).forEach(v => {
        if (v && !["Any brand", "Both", "No limit", "No preference", "Any"].includes(v))
          parts.push(v);
      });
      await runSearch(parts.join(" "));
    }
  };

  const submitText = () => {
    const val = textInput.trim();
    if (!val) return;
    setTextInput("");
    answerQuestion(val);
  };

  /* ── Shopping search ── */
  const runSearch = async (query: string, existingConvoId?: string) => {
    setIsLoading(true);
    setStep("searching");
    setCurrentQuery(query);
    pushMsg({ role: "ai", text: "Searching Amazon, Flipkart & Google Shopping for real products…" });
    
    const convoId = existingConvoId || activeConvoId;
    try {
      const headers = await getAuthHeaders();
      const numericConvoId = convoId ? parseInt(convoId, 10) : null;
      const res  = await fetch("/api/shopping/search", {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          filters: { minPrice: null, maxPrice: null, category: null, sources: [] },
          conversationId: numericConvoId && !isNaN(numericConvoId) ? numericConvoId : null
        }),
      });
      const data = await res.json() as { products: Product[]; aiSummary: string };
      const products = data.products ?? [];
      const summary  = data.aiSummary ?? "";
      setAllProducts(products);
      setAllSummary(summary);
      setStep("results");
      setMessages(prev => [...prev.slice(0, -1), { role: "products", products, summary, query }]);

      // Save products message to db
      if (convoId) {
        try {
          await fetch(`/api/openai/conversations/${convoId}/messages/manual`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              role: "products",
              content: JSON.stringify({ products, summary, query }),
            }),
          });
        } catch (err) {
          console.error("Failed to log products message:", err);
        }
      }
    } catch {
      setStep("results");
      pushMsg({ role: "ai", text: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Web search ── */
  const runWebSearch = async (query: string, existingConvoId?: string) => {
    setStep("searching");
    pushMsg({ role: "ai", text: "Searching the web and synthesizing an answer…" });
    
    const convoId = existingConvoId || activeConvoId;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/search/web", {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
      });
      const data = await res.json() as {
        answer: string;
        sources: WebSource[];
        relatedQuestions: string[];
        query: string;
        products?: Product[];
        productQuery?: string;
        isProductSearch: boolean;
      };
      setStep("results");
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: "websearch",
          answer: data.answer ?? "",
          sources: data.sources ?? [],
          relatedQuestions: data.relatedQuestions ?? [],
          query,
          products: data.products,
          productQuery: data.productQuery,
          isProductSearch: data.isProductSearch ?? false,
        },
      ]);

      // Save websearch message to db
      if (convoId) {
        try {
          await fetch(`/api/openai/conversations/${convoId}/messages/manual`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              role: "websearch",
              content: JSON.stringify({
                answer: data.answer ?? "",
                sources: data.sources ?? [],
                relatedQuestions: data.relatedQuestions ?? [],
                query,
                products: data.products,
                productQuery: data.productQuery,
                isProductSearch: data.isProductSearch ?? false,
              }),
            }),
          });
        } catch (err) {
          console.error("Failed to log websearch message:", err);
        }
      }
    } catch {
      setStep("results");
      pushMsg({ role: "ai", text: "Web search failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Reset ── */
  const resetChat = () => {
    setStep("idle");
    setMessages([]);
    setCurrentQuery("");
    setClarifyQuestions([]);
    setClarifyAnswers({});
    setCurrentQIdx(0);
    setAllProducts([]);
    setAllSummary("");
    setCompareList([]);
    setFilters(DEFAULT_FILTERS);
    setInput("");
  };

  const toggleCompare = (product: Product, checked: boolean) =>
    setCompareList(prev => checked ? [...prev, product] : prev.filter(p => p.id !== product.id));

  const goCompare = () => {
    sessionStorage.setItem("compare_products", JSON.stringify(compareList));
    setLocation("/compare");
  };

  const switchMode = (mode: SearchMode) => {
    setSearchMode(mode);
    resetChat();
  };

  const currentQ = step === "clarifying" ? clarifyQuestions[currentQIdx] : null;
  const displaySuggestions = searchMode === "web" ? WEB_SUGGESTIONS : suggestions;

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#050816] text-white relative overflow-hidden">
        
        {/* Decorative Glowing Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293706_1px,transparent_1px),linear-gradient(to_bottom,#1f293706_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35" />
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-[#7C3AED]/5 rounded-full blur-[120px] opacity-40" />
          <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-[#06B6D4]/5 rounded-full blur-[100px] opacity-30" />
        </div>

        {/* ── Top bar ── */}
        <div className="h-14 shrink-0 border-b border-white/5 px-5 flex items-center justify-between gap-3 bg-[#050816]/70 backdrop-blur-md z-10 relative">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center shrink-0">
              {searchMode === "web"
                ? <Globe className="h-3.5 w-3.5 text-[#06B6D4]" />
                : <ShoppingBag className="h-3.5 w-3.5 text-[#7C3AED]" />}
            </div>
            <span className="text-sm font-semibold text-white truncate">
              {currentQuery ? `"${currentQuery}"` : searchMode === "web" ? "Web Search" : "Shopping Assistant"}
            </span>
            {step === "results" && allProducts.length > 0 && searchMode === "shopping" && (
              <span className="shrink-0 text-[11px] bg-[#7C3AED]/10 text-purple-300 font-semibold px-2.5 py-0.5 rounded-full border border-purple-500/20">
                {allProducts.length} results
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {step === "results" && allProducts.length > 0 && searchMode === "shopping" && (
              <button onClick={() => setShareOpen(true)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                <Share2 className="h-3.5 w-3.5" />Share Results
              </button>
            )}
            {step !== "idle" && (
              <button onClick={resetChat}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                <RotateCcw className="h-3.5 w-3.5" />New Search
              </button>
            )}
          </div>
        </div>

        {/* ── Chat area ── */}
        <div className="flex-1 overflow-y-auto relative z-10">
          {step === "idle" ? (
            /* ── Welcome / Suggestions ── */
            <div className="flex flex-col items-center justify-center min-h-full px-6 py-10 text-center relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/5">
                {searchMode === "web"
                  ? <Globe className="h-7 w-7 text-[#06B6D4]" />
                  : <Sparkles className="h-7 w-7 text-[#7C3AED]" />}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
                {searchMode === "web" ? "Search the web with AI" : "What are you shopping for?"}
              </h1>
              <p className="text-sm text-white/50 max-w-sm mb-6 leading-relaxed">
                {searchMode === "web"
                  ? "Ask any question — I'll search the web and give you a cited, synthesized answer. Product queries also show real shopping results."
                  : "Describe what you want in plain English — I'll search real products from Amazon, Flipkart & Google Shopping."}
              </p>

              {/* Category filter pills — shopping only */}
              {searchMode === "shopping" && (
                <div className="flex flex-wrap justify-center gap-2 mb-5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        activeCategory === cat
                          ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-md shadow-purple-500/10"
                          : "bg-white/5 text-white/60 border-white/10 hover:border-purple-500/40 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Suggestion cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {suggestionsLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse" />
                    ))
                  : displaySuggestions.slice(0, 8).map(s => (
                      <button
                        key={s.text}
                        onClick={() => handleSubmit(null, s.text)}
                        className="flex items-center gap-3 text-left px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:border-purple-500/30 hover:bg-[#7C3AED]/5 text-sm text-white/80 transition-all shadow-sm group backdrop-blur-md"
                      >
                        <span className="text-lg shrink-0">{s.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <span className="block truncate font-medium">{s.text}</span>
                          {s.category && (
                            <span className="text-[10px] text-white/30 font-semibold">{s.category}</span>
                          )}
                        </div>
                        <Zap className="h-3.5 w-3.5 text-white/20 group-hover:text-purple-400 transition-colors shrink-0" />
                      </button>
                    ))
                }
              </div>

              {/* Trending badge */}
              {searchMode === "shopping" && !suggestionsLoading && (
                <div className="mt-4 flex items-center gap-1.5 text-[11px] text-white/30 font-medium">
                  <TrendingUp className="h-3.5 w-3.5" />
                  AI-curated trending searches · refreshes on category change
                </div>
              )}
            </div>
          ) : (
            /* ── Messages ── */
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5 relative z-10">
              {messages.map((msg, i) => {
                if (msg.role === "user") return (
                  <div key={i} className="flex justify-end">
                    <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[85%] shadow-md leading-relaxed font-medium">
                      {msg.text}
                    </div>
                  </div>
                );

                if (msg.role === "ai") return (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-white/90 max-w-[85%] leading-relaxed shadow-sm backdrop-blur-md">
                      {msg.text}
                    </div>
                  </div>
                );

                /* ── Web search result ── */
                if (msg.role === "websearch") return (
                  <div key={i} className="space-y-4">
                    {/* Source pills */}
                    {msg.sources.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-2">
                          {msg.sources.length} Sources
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {msg.sources.slice(0, 6).map((src, idx) => (
                            <a key={idx} href={src.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 hover:border-purple-500/30 transition-colors text-xs text-white/70 hover:text-white shadow-sm max-w-[160px]">
                              <img src={src.favicon} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              <span className="truncate">{src.displayUrl}</span>
                              <span className="shrink-0 text-white/30">[{idx + 1}]</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Answer */}
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-white/90 leading-7 backdrop-blur-md">
                          {msg.answer.split("\n\n").map((para, pi) => (
                            <p key={pi} className={pi > 0 ? "mt-3" : ""}>
                              <AnswerText text={para} />
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Source cards */}
                    {msg.sources.length > 0 && (
                      <div className="ml-10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.sources.slice(0, 6).map((src, idx) => (
                          <a key={idx} href={src.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-purple-500/30 hover:bg-purple-950/10 hover:shadow-md transition-all group">
                            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/5 border border-white/5 shrink-0 mt-0.5">
                              <img src={src.favicon} alt="" className="w-4 h-4 rounded-sm"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-1">
                                <p className="text-xs font-bold text-white/80 line-clamp-2 leading-snug group-hover:text-[#06B6D4] transition-colors flex-1">
                                  {src.title}
                                </p>
                                <ExternalLink className="h-3 w-3 text-white/20 group-hover:text-[#06B6D4] transition-colors shrink-0 mt-0.5" />
                              </div>
                              <p className="text-[11px] text-white/40 truncate mt-0.5 font-medium">{src.displayUrl}</p>
                              {src.snippet && (
                                <p className="text-[11px] text-white/50 line-clamp-2 mt-1 leading-relaxed">{src.snippet}</p>
                              )}
                            </div>
                            <span className="shrink-0 text-[10px] font-bold text-white/25 mt-0.5">[{idx + 1}]</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* ── Product Recommendations (when query is product-related) ── */}
                    {msg.isProductSearch && msg.products && msg.products.length > 0 && (
                      <div className="ml-0 mt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <ShoppingBag className="h-3 w-3 text-amber-400" />
                          </div>
                          <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                            Recommended Products
                            {msg.productQuery && (
                              <span className="ml-1.5 normal-case font-medium text-white/40">
                                for "{msg.productQuery}"
                              </span>
                            )}
                          </p>
                          <span className="text-[11px] bg-amber-500/10 text-amber-400 font-semibold px-2 py-0.5 rounded-full border border-amber-500/20">
                            {msg.products.length} products
                          </span>
                        </div>
                        <div className="space-y-3">
                          {msg.products.map((product, idx) => (
                            <div key={product.id ?? idx}
                              className="animate-in fade-in slide-in-from-bottom-2"
                              style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}>
                              <ProductCard
                                product={product}
                                onCompareToggle={toggleCompare}
                                isCompared={compareList.some(s => s.id === product.id)}
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => { switchMode("shopping"); handleSubmit(null, msg.productQuery ?? msg.query, "shopping"); }}
                          className="mt-3 flex items-center gap-2 text-xs text-[#06B6D4] font-semibold hover:underline"
                        >
                          <Search className="h-3.5 w-3.5" />
                          Search more products in Shopping mode →
                        </button>
                      </div>
                    )}

                    {/* Related questions */}
                    {msg.relatedQuestions.length > 0 && (
                      <div className="ml-0 mt-2">
                        <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-2">
                          Related Questions
                        </p>
                        <div className="space-y-1">
                          {msg.relatedQuestions.map((q, qi) => (
                            <button key={qi}
                              onClick={() => handleSubmit(null, q, "web")}
                              className="flex items-center gap-2 w-full text-left text-sm text-white/70 hover:text-[#06B6D4] hover:bg-white/5 transition-all py-1.5 px-3 rounded-lg group">
                              <Search className="h-3.5 w-3.5 text-white/20 group-hover:text-[#06B6D4] transition-colors shrink-0" />
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );

                /* ── Shopping products ── */
                if (msg.role === "products") {
                  const filteredProducts = applyFilters(msg.products, filters) as Product[];
                  return (
                    <div key={i} className="space-y-4">
                      <div className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-white/90 max-w-[85%] leading-relaxed shadow-sm backdrop-blur-md">
                          {msg.summary || `Found ${msg.products.length} products for "${msg.query}".`}
                        </div>
                      </div>

                      {msg.products.length === 0 ? (
                        <div className="flex items-center gap-3 bg-red-950/15 border border-red-500/20 rounded-2xl p-4 text-sm text-red-300">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          No products found. Try a different or simpler query.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Filter bar — slides in with results */}
                          <FilterBar
                            filters={filters}
                            onChange={setFilters}
                            resultCount={msg.products.length}
                            filteredCount={filteredProducts.length}
                          />

                          {filteredProducts.length === 0 ? (
                            <div className="flex items-center gap-3 bg-amber-950/15 border border-[#F59E0B]/20 rounded-2xl p-4 text-sm text-amber-300">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              No products match the current filters. Try adjusting them.
                            </div>
                          ) : (
                            filteredProducts.map((product, idx) => (
                              <div key={product.id}
                                className="animate-in fade-in slide-in-from-bottom-2"
                                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}>
                                <ProductCard
                                  product={product}
                                  onCompareToggle={toggleCompare}
                                  isCompared={compareList.some(s => s.id === product.id)}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })}

              {/* Clarify options */}
              {step === "clarifying" && currentQ && !isLoading && (
                <div className="ml-10 space-y-3">
                  {currentQ.type === "choice" && currentQ.options && (
                    <div className="flex flex-wrap gap-2">
                      {currentQ.options.map(opt => (
                        <button key={opt} onClick={() => answerQuestion(opt)}
                          className="text-sm px-4 py-2 rounded-full border border-purple-500/30 text-purple-300 font-semibold bg-white/5 hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED] transition-all shadow-sm">
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                  {currentQ.type === "text" && (
                    <div className="flex gap-2 max-w-sm">
                      <input value={textInput} onChange={e => setTextInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && submitText()}
                        placeholder={currentQ.placeholder ?? "Type your answer…"}
                        className="flex-1 text-sm border border-white/10 bg-white/5 rounded-xl px-4 py-2 text-white outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                        autoFocus />
                      <button onClick={submitText}
                        className="w-9 h-9 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center hover:bg-[#6D28D9] transition-colors shrink-0">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center">
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                    <span className="text-xs text-white/40 ml-1 font-semibold">
                      {searchMode === "web" ? "Searching the web & finding products…" : "Searching real products…"}
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div className="border-t border-white/5 bg-[#050816] px-4 sm:px-6 py-4 shrink-0 relative z-10">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
              <button onClick={() => switchMode("shopping")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  searchMode === "shopping" ? "bg-[#7C3AED] text-white shadow-sm" : "text-white/60 hover:text-white"
                }`}>
                <ShoppingBag className="h-3.5 w-3.5" />Shopping
              </button>
              <button onClick={() => switchMode("web")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  searchMode === "web" ? "bg-[#06B6D4] text-black shadow-sm" : "text-white/60 hover:text-white"
                }`}>
                <Globe className="h-3.5 w-3.5" />Web Search
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/10 transition-all shadow-sm">
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  placeholder={
                    searchMode === "web"
                      ? "Ask anything — products, news, how-tos, reviews…"
                      : step === "idle"
                      ? "Search for anything… e.g. 'wireless earphones under ₹1500'"
                      : step === "clarifying"
                      ? "Answer the question above, or type here…"
                      : "Search for something else…"
                  }
                  className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-white/30"
                  disabled={isLoading || step === "clarifying"} />
                <button type="submit" disabled={!input.trim() || isLoading || step === "clarifying"}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0">
                  {isLoading
                    ? <Loader2 className="h-4 w-4 text-white animate-spin" />
                    : <Send className="h-4 w-4 text-white" />}
                </button>
              </div>
            </form>
            <p className="text-center text-[11px] text-white/30 font-medium">
              {searchMode === "web"
                ? "Web answers with citations · Product queries also show real shopping results"
                : "Real-time results from Amazon · Flipkart · Google Shopping"}
            </p>
          </div>
        </div>

        {/* ── Floating Compare bar ── */}
        {compareList.length > 0 && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-300 z-50">
            <div className="flex items-center gap-3 bg-[#080d24] text-white pl-4 pr-2 py-2 rounded-2xl shadow-2xl shadow-black/30 border border-white/10">
              <Scale className="h-4 w-4 text-[#06B6D4] shrink-0" />
              <span className="text-sm font-semibold whitespace-nowrap">
                {compareList.length} product{compareList.length > 1 ? "s" : ""} selected
              </span>
              <button onClick={goCompare} disabled={compareList.length < 2}
                className="ml-1 h-8 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors whitespace-nowrap">
                Compare {compareList.length < 2 ? "(need 2+)" : "→"}
              </button>
              <button onClick={() => setCompareList([])}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors">
                <X className="h-3.5 w-3.5 text-white/60" />
              </button>
            </div>
          </div>
        )}
      </div>

      {allProducts.length > 0 && (
        <ShareChatModal open={shareOpen} onOpenChange={setShareOpen}
          query={currentQuery} summary={allSummary} productCount={allProducts.length}
          topProducts={allProducts.slice(0, 5).map(p => ({ title: p.title, price: p.price, source: p.source }))}
        />
      )}
    </Layout>
  );
}
