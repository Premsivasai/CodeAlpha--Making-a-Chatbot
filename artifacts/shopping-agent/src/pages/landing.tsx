import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ShoppingBag, Search, Sparkles, Flame, ShieldAlert,
  ArrowRight, ShieldCheck, Play, ArrowUpRight, Zap, Check,
  ChevronDown, MessageSquare, GitCompare, History, HelpCircle,
  Volume2, Eye, Camera, Star, Award, TrendingUp, AlertTriangle,
  Github, Twitter, Linkedin
} from "lucide-react";

// --- HELPERS ---
function Counter({ value, duration = 2 }: { value: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const target = parseInt(value.replace(/[^0-9]/g, ""));
  const suffix = value.replace(/[0-9]/g, "");

  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) return;

    const totalMiliseconds = duration * 1000;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 20);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
  const [, navigate] = useLocation();
  
  // Mouse position tracking for moving glowing orbs
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // --- SHOWCASE 1: AI ASSISTANT DEMO ---
  const [chatDemoStep, setChatDemoStep] = useState(0);
  const [chatOutput, setChatOutput] = useState("");
  const chatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fullAiResponse = `{
  "answer": "The best gaming phone under ₹20,000 is the Poco X6 Pro. It packs the MediaTek Dimensity 8300 Ultra, delivering flagship-level AnTuTu scores exceeding 1.4 million. For display, you get an immersive 120Hz AMOLED panel with 1800 nits peak brightness. Battery-wise, it houses a 5000mAh cell with 67W turbo charging.",
  "confidenceScore": 96,
  "recommendation": "Buy Now",
  "pros": ["MediaTek Dimensity 8300 Ultra (Best-in-class performance)", "1.5K 120Hz CrystalRes Flow AMOLED screen"],
  "cons": ["Plastic build frames", "Pre-installed bloatware (can be disabled)"]
}`;

  useEffect(() => {
    if (chatDemoStep === 0) {
      setChatOutput("");
      const timer = setTimeout(() => setChatDemoStep(1), 1000);
      return () => clearTimeout(timer);
    }

    if (chatDemoStep === 1) {
      // Typewriter prompt: "Best gaming phone under ₹20,000"
      let currentText = "";
      const targetText = "Best gaming phone under ₹20,000";
      let charIdx = 0;
      const interval = setInterval(() => {
        currentText += targetText[charIdx];
        setChatOutput(currentText);
        charIdx++;
        if (charIdx === targetText.length) {
          clearInterval(interval);
          setTimeout(() => {
            setChatDemoStep(2);
            setChatOutput("");
          }, 1200);
        }
      }, 60);
      return () => clearInterval(interval);
    }

    if (chatDemoStep === 2) {
      // Stream AI JSON answer
      let index = 0;
      chatIntervalRef.current = setInterval(() => {
        if (index < fullAiResponse.length) {
          setChatOutput((prev) => prev + fullAiResponse.charAt(index));
          index += 3; // Type 3 chars at a time for streaming feel
        } else {
          if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
          setTimeout(() => {
            setChatDemoStep(0);
          }, 6000); // Wait 6s before restarting loop
        }
      }, 25);
      return () => {
        if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
      };
    }
    return () => {};
  }, [chatDemoStep]);

  // --- SHOWCASE 2: COMPARE Badges ---
  const [activeCompareTab, setActiveCompareTab] = useState("perf");

  // --- SHOWCASE 3: DEAL ANALYZER ---
  const [dealTimeframe, setDealTimeframe] = useState<"30" | "90" | "180">("90");

  // --- TESTIMONIALS CAROUSEL ---
  const testimonials = [
    {
      name: "Aarav Mehta",
      role: "Tech Enthusiast",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
      rating: 5,
      comment: "Goval saved me ₹4,500 on my Sony WH-1000XM5 purchase. The AI summary of Reddit comments cut through all the sponsored YouTube reviews instantly."
    },
    {
      name: "Priya Sharma",
      role: "Casual Shopper",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
      rating: 5,
      comment: "I used to open ten tabs to compare prices across Amazon, Flipkart, and Croma. Goval's comparative view does it in a single click, and Rufus-style chatbot explains specs like I'm five."
    },
    {
      name: "Karan Johar",
      role: "Budget Optimizer",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
      rating: 4,
      comment: "The deal analyzer score is spot on. Verified that a 'Big Billion Days' discount was actually an inflated base price. Buying only when the AI says 'Buy Now' from now on."
    }
  ];
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // --- FAQ ACCORDION ---
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const faqs = [
    {
      q: "How does Goval compare prices across stores?",
      a: "Goval uses advanced search intelligence (including SerpAPI and real-time scrapers) to query major Indian e-commerce stores (Amazon, Flipkart, Reliance Digital, Croma, Vijay Sales, and more) simultaneously, converting taxes and delivery costs dynamically to present the final net price."
    },
    {
      q: "What makes the AI Assistant different from standard search?",
      a: "Unlike standard keyword search, Goval's AI assistant reads and synthesizes product data, specifications, user reviews, Reddit discussions, and expert review articles. It understands intent like 'best gaming phone under 20k with good battery' and provides structured pros, cons, and direct purchase advice."
    },
    {
      q: "How does the Deal Score work?",
      a: "Our algorithm tracks the historical pricing of a product over 180 days. We calculate a weighted average and compare the current listing price against it. A score of 80+ indicates the product is priced significantly below its average, making it a great time to purchase."
    },
    {
      q: "Is Goval free to use?",
      a: "Yes! Goval is completely free for shoppers. We search unbiasedly to find you the absolute lowest price. We may earn a small affiliate commission from some stores, but this never affects our price rankings or recommendations."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-x-hidden font-sans relative">
      
      {/* ── Background Mesh & Glowing Orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Animated grid mesh */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        
        {/* Glowing Orbs following/reacting to mouse */}
        <motion.div
          animate={{
            x: mousePos.x - 300,
            y: mousePos.y - 300,
          }}
          transition={{ type: "spring", damping: 30, stiffness: 50, mass: 0.8 }}
          className="absolute w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.12)_0%,rgba(0,0,0,0)_70%)] blur-3xl"
        />
        <motion.div
          animate={{
            x: mousePos.x - 150,
            y: mousePos.y - 150,
          }}
          transition={{ type: "spring", damping: 40, stiffness: 60, mass: 1.2 }}
          className="absolute w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.1)_0%,rgba(0,0,0,0)_70%)] blur-3xl"
        />

        {/* Static Aurora Orbs */}
        <div className="absolute top-[-10%] left-[5%] w-[800px] h-[600px] bg-[#7c3aed]/10 rounded-full blur-[140px] opacity-60" />
        <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-[#06b6d4]/10 rounded-full blur-[120px] opacity-40" />
        <div className="absolute bottom-[10%] left-[-10%] w-[700px] h-[700px] bg-[#f59e0b]/5 rounded-full blur-[160px] opacity-30" />
      </div>

      {/* ── HEADER / NAV ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 bg-[#050816]/70 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShoppingBag className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              Goval
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">AI Showcase</a>
            <a href="#compare" className="hover:text-white transition-colors">Compare</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all active:scale-95">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 text-center flex flex-col items-center">
        
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-purple-300 text-xs font-semibold mb-6 backdrop-blur-md"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#06B6D4]" />
          <span>Next-Gen Product Intelligence Platform</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl"
        >
          Find The Best Product. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] via-[#C084FC] to-[#06B6D4]">
            Powered By AI.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-base sm:text-xl text-white/60 max-w-2xl leading-relaxed"
        >
          Search millions of products, compare prices across stores,
          analyze reviews, and get AI-powered buying advice instantly.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center"
        >
          <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#06B6D4] text-white font-bold rounded-2xl flex items-center justify-center gap-2 group hover:shadow-xl hover:shadow-purple-500/10 transition-all active:scale-[0.98]">
            <span>Get Started</span>
            <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#demo" className="w-full sm:w-auto px-6 py-4 bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/15 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all">
            <Sparkles className="h-4.5 w-4.5 text-[#06B6D4]" />
            <span>Try AI Assistant</span>
          </a>
          <button className="w-full sm:w-auto px-6 py-4 text-white/70 hover:text-white font-semibold flex items-center justify-center gap-2 transition-colors">
            <Play className="h-4 w-4 fill-white/20" />
            <span>Watch Demo</span>
          </button>
        </motion.div>

        {/* Hero Visual: 3D AI Shopping Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="w-full mt-16 max-w-5xl rounded-2xl border border-white/10 bg-[#080d24]/60 p-2 md:p-3 relative shadow-2xl shadow-purple-500/5 backdrop-blur-xl overflow-hidden group"
        >
          {/* Decorative frame borders */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10 opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
          
          {/* Main Visual */}
          <div className="bg-[#050816] rounded-xl border border-white/5 p-4 md:p-6 overflow-hidden flex flex-col md:flex-row gap-6 text-left relative">
            
            {/* Dashboard left column (Listings & Deal Score) */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white/40">Market Intelligence</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live indexing
                </span>
              </div>

              {/* Product Card */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 backdrop-blur-md relative overflow-hidden">
                <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <ShoppingBag className="h-8 w-8 text-[#06B6D4] opacity-80" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">iPhone 16 Pro (256GB, Titanium)</h4>
                  <p className="text-xs text-white/40 mt-0.5">Best store: Amazon India</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-extrabold text-base">₹1,14,900</span>
                    <span className="text-xs text-white/40 line-through">₹1,19,900</span>
                    <span className="text-xs text-emerald-400 font-medium">Save 4%</span>
                  </div>
                </div>
                <div className="absolute right-4 top-4 flex flex-col items-center">
                  <span className="text-[10px] text-white/40 uppercase font-semibold">Deal Score</span>
                  <div className="w-10 h-10 rounded-full border-2 border-emerald-500 flex items-center justify-center font-bold text-xs text-emerald-400 mt-1">
                    88
                  </div>
                </div>
              </div>

              {/* Price comparison cards list */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-white/40 font-bold block">Amazon</span>
                    <span className="font-extrabold text-sm text-white mt-0.5">₹1,14,900</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Lowest</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-white/40 font-bold block">Flipkart</span>
                    <span className="font-extrabold text-sm text-white mt-0.5">₹1,16,200</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[10px] font-semibold">+₹1,300</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-white/40 font-bold block">Reliance Digital</span>
                    <span className="font-extrabold text-sm text-white mt-0.5">₹1,17,990</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[10px] font-semibold">+₹3,090</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-white/40 font-bold block">Croma</span>
                    <span className="font-extrabold text-sm text-white mt-0.5">₹1,18,000</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[10px] font-semibold">+₹3,100</span>
                </div>
              </div>
            </div>

            {/* Dashboard right column (Floating AI Assistant reply UI) */}
            <div className="w-full md:w-[380px] bg-purple-950/15 border border-purple-500/15 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-md">
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#7C3AED]/20 rounded-full blur-2xl pointer-events-none" />
              
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-purple-400 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-bold tracking-tight text-white/95">Goval AI buying advisor</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed bg-[#050816]/70 border border-white/5 p-3 rounded-lg">
                  💡 <strong>Analysis</strong>: The current price is ₹1,14,900. Our price charts show a drop of ₹5,000 occurred yesterday. With an 88 deal score and positive sentiment from reviews, this is a <strong>Strong Buy</strong>.
                </p>
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-[10px] text-purple-300 font-medium">92% Positive Sentiment</span>
                  <span className="px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-[10px] text-cyan-300 font-medium">Price Drop Alert</span>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-white/30 font-semibold uppercase">Advice confidence</span>
                <span className="text-xs text-[#06B6D4] font-bold">96% Reliable</span>
              </div>
            </div>

          </div>
        </motion.div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.01] backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]">
              <Counter value="10M+" />
            </h3>
            <p className="text-xs md:text-sm text-white/40 mt-1 font-semibold">Products Indexed</p>
          </div>
          <div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-cyan-400">
              <Counter value="500K+" />
            </h3>
            <p className="text-xs md:text-sm text-white/40 mt-1 font-semibold">Reviews Analyzed</p>
          </div>
          <div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-[#F59E0B]">
              <Counter value="100+" />
            </h3>
            <p className="text-xs md:text-sm text-white/40 mt-1 font-semibold">Stores Compared</p>
          </div>
          <div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
              <Counter value="95%" />
            </h3>
            <p className="text-xs md:text-sm text-white/40 mt-1 font-semibold">User Satisfaction</p>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Features Built For <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]">
              Intelligent Shopping.
            </span>
          </h2>
          <p className="text-white/60 mt-4 text-sm md:text-base">
            Everything you need to bypass artificial reviews, hidden trackers, and deceptive sales tricks.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Feature 1: Multi-Store Search */}
          <div className="md:col-span-2 bg-[#080d24]/40 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-white/10 transition-all group backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
                <Search className="h-5 w-5 text-[#7C3AED]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Multi-Store Search</h3>
              <p className="text-white/60 text-sm leading-relaxed max-w-md">
                Search Amazon, Flipkart, Reliance Digital, Croma, Vijay Sales, and more simultaneously. Get final delivery-inclusive prices without switching tabs.
              </p>
            </div>
            <div className="mt-8 flex gap-3 text-xs font-semibold text-white/40">
              <span className="px-2.5 py-1 rounded bg-white/5">Amazon</span>
              <span className="px-2.5 py-1 rounded bg-white/5">Flipkart</span>
              <span className="px-2.5 py-1 rounded bg-white/5">Reliance Digital</span>
              <span className="px-2.5 py-1 rounded bg-white/5">Croma</span>
            </div>
          </div>

          {/* Feature 2: AI Buying Assistant */}
          <div className="bg-[#080d24]/40 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-white/10 transition-all group backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#06B6D4]/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <Sparkles className="h-5 w-5 text-[#06B6D4]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Buying Assistant</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Ask shopping questions naturally. Get back expert answers backed by data and specifications.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-1.5 text-xs text-[#06B6D4] font-bold">
              <span>Chat live below</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Feature 3: Price Comparison */}
          <div className="bg-[#080d24]/40 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-white/10 transition-all group backdrop-blur-md">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                <GitCompare className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Price Comparison</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Compare price, delivery details, warranty, and return policies of any product across all platforms instantly.
              </p>
            </div>
          </div>

          {/* Feature 4: Price History */}
          <div className="bg-[#080d24]/40 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-white/10 transition-all group backdrop-blur-md">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                <History className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Price History</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Track dynamic price patterns over 30, 90, or 180 days to avoid purchasing when prices are temporarily marked up.
              </p>
            </div>
          </div>

          {/* Feature 5: Deal Analyzer */}
          <div className="bg-[#080d24]/40 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-white/10 transition-all group backdrop-blur-md">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <Flame className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Deal Analyzer</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Know if a sale price is genuinely a deal or if the product has been cheaper in the past. Receive a simple buy/wait recommendation.
              </p>
            </div>
          </div>

          {/* Feature 6: Review Intelligence */}
          <div className="bg-[#080d24]/40 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-white/10 transition-all group backdrop-blur-md">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Review Intelligence</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Our AI aggregates thousands of user reviews and detects bot-generated ones to deliver a unified pros/cons summary you can trust.
              </p>
            </div>
          </div>

          {/* Feature 7: Community Insights */}
          <div className="bg-[#080d24]/40 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-white/10 transition-all group backdrop-blur-md">
            <div>
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                <MessageSquare className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Community Insights</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Get unfiltered real-world discussions from Reddit, YouTube reviews, and specialized tech forums summarized dynamically.
              </p>
            </div>
          </div>

          {/* Feature 8: Visual Search */}
          <div className="bg-[#080d24]/40 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-white/10 transition-all group backdrop-blur-md">
            <div>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
                <Camera className="h-5 w-5 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Visual Search</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Upload a screenshot or photo of an item you saw elsewhere, and we will find the exact product and lowest price index.
              </p>
            </div>
          </div>

          {/* Feature 9: Voice Search */}
          <div className="bg-[#080d24]/40 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-white/10 transition-all group backdrop-blur-md">
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6">
                <Volume2 className="h-5 w-5 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Voice Search</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Speak naturally to search for products. 'Find noise-cancelling headphones under five thousand' translates instantly into filtered results.
              </p>
            </div>
          </div>

          {/* Feature 10: Price Alerts */}
          <div className="md:col-span-3 bg-[#080d24]/40 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between hover:border-white/10 transition-all group backdrop-blur-md items-start md:items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="max-w-xl">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Price Alerts</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Set a target budget for any item. The moment the product price drops below your limit on any monitored site, Goval will notify you immediately via email or browser notification.
              </p>
            </div>
            <button className="mt-6 md:mt-0 px-6 py-3 border border-[#F59E0B]/30 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] text-sm font-bold rounded-xl transition-all">
              Setup Alert
            </button>
          </div>

        </div>
      </section>

      {/* ── SHOWCASE 1: AI ASSISTANT IN ACTION ── */}
      <section id="demo" className="relative z-10 border-t border-white/5 py-20 md:py-28 bg-gradient-to-b from-transparent to-[#080d24]/40">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 text-xs font-semibold mb-6">
              <Sparkles className="h-3 w-3" />
              <span>Interactive Simulator</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Ask AI Buying Assistant <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#06B6D4] to-cyan-300">
                Anything.
              </span>
            </h2>
            <p className="text-white/60 mt-4 text-sm md:text-base leading-relaxed">
              Bypass generic product landing pages. Type what you are looking for, and watch the AI synthesize specifications, Reddit posts, and price charts into direct buying advice.
            </p>
            <div className="mt-8 space-y-4 font-medium text-sm text-white/80">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
                <span>Unbiased recommendations based on specifications</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
                <span>Summary of pros & cons from verified reviewers</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
                <span>Automatic detection of deceptive review bots</span>
              </div>
            </div>
            <div className="mt-10">
              <Link href="/signup" className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] font-bold rounded-xl flex items-center gap-2 w-fit active:scale-95 transition-transform">
                <span>Try It Yourself</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* AI Simulator Window */}
          <div className="w-full rounded-2xl border border-purple-500/20 bg-[#050816] p-4 relative shadow-2xl overflow-hidden min-h-[400px] flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-10 bg-white/[0.02] border-b border-white/5 px-4 flex items-center gap-2 justify-between">
              <div className="flex gap-1.5">
                <div className="w-3 w-3 h-3 rounded-full bg-rose-500/30" />
                <div className="w-3 w-3 h-3 rounded-full bg-amber-500/30" />
                <div className="w-3 w-3 h-3 rounded-full bg-emerald-500/30" />
              </div>
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Live Simulator</span>
              <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-ping" />
            </div>

            {/* Chat Content Body */}
            <div className="flex-1 mt-10 space-y-4 overflow-y-auto pr-1">
              {/* User Prompt */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-xs font-bold text-white/70">
                  U
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-white/90">
                  {chatDemoStep >= 1 ? "Best gaming phone under ₹20,000" : <span className="opacity-40 animate-pulse">Typing prompt...</span>}
                </div>
              </div>

              {/* AI Streaming Response */}
              {chatDemoStep === 2 && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-purple-950/20 border border-purple-500/10 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs font-mono text-[#E9D5FF] leading-relaxed whitespace-pre-wrap flex-1 max-w-[90%]">
                    {chatOutput}
                    <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-0.5 animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            {/* Simulated Input Bar */}
            <div className="mt-4 border-t border-white/5 pt-3 flex gap-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/30 flex items-center justify-between">
                <span>{chatDemoStep === 0 ? "Analyzing specs..." : "Wait for response..."}</span>
                <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-spin" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── SHOWCASE 2: PRODUCT COMPARISON ── */}
      <section id="compare" className="relative z-10 border-t border-white/5 py-20 md:py-28 bg-[#050816]">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-950/20 text-amber-300 text-xs font-semibold mb-6">
                <GitCompare className="h-3 w-3" />
                <span>Smart Comparison Matrix</span>
              </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Compare Products <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-[#F59E0B]">
                Side-by-Side.
              </span>
            </h2>
            <p className="text-white/60 mt-4 text-sm md:text-base">
              Review specifications and benchmark testing. The AI calculates category winners so you can buy with clarity.
            </p>
          </div>

          {/* Comparison Cards Grid */}
          <div className="bg-[#080d24]/50 border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-md max-w-4xl mx-auto">
            
            <div className="grid grid-cols-3 border-b border-white/5 pb-4 mb-4 font-bold text-center">
              <div className="text-left text-white/40 text-xs uppercase tracking-wider">Features</div>
              <div className="text-purple-300 text-sm">Product A: OnePlus 12</div>
              <div className="text-cyan-300 text-sm">Product B: Galaxy S24</div>
            </div>

            {/* Performance Winner Row */}
            <div className="grid grid-cols-3 items-center py-4 border-b border-white/5 text-center">
              <div className="text-left font-medium text-sm text-white/70">Performance</div>
              <div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold">Winner</span>
                <span className="block text-[10.5px] text-white/50 mt-0.5">Snapdragon 8 Gen 3</span>
              </div>
              <div className="text-white/40 text-xs">Exynos 2400</div>
            </div>

            {/* Battery Winner Row */}
            <div className="grid grid-cols-3 items-center py-4 border-b border-white/5 text-center">
              <div className="text-left font-medium text-sm text-white/70">Battery Life</div>
              <div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold">Winner</span>
                <span className="block text-[10.5px] text-white/50 mt-0.5">5400mAh, 100W Charging</span>
              </div>
              <div className="text-white/40 text-xs">4000mAh, 25W Charging</div>
            </div>

            {/* Camera Winner Row */}
            <div className="grid grid-cols-3 items-center py-4 border-b border-white/5 text-center">
              <div className="text-left font-medium text-sm text-white/70">Camera</div>
              <div className="text-white/40 text-xs">Hasselblad 50MP Triple</div>
              <div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold">Winner</span>
                <span className="block text-[10.5px] text-white/50 mt-0.5">50MP + 3x Zoom (Color Accuracy)</span>
              </div>
            </div>

            {/* Value Winner Row */}
            <div className="grid grid-cols-3 items-center py-4 text-center">
              <div className="text-left font-medium text-sm text-white/70">Value for Money</div>
              <div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold">Winner</span>
                <span className="block text-[10.5px] text-white/50 mt-0.5">₹64,999 (Better baseline price)</span>
              </div>
              <div className="text-white/40 text-xs">₹74,999</div>
            </div>

          </div>

        </div>
      </section>

      {/* ── SHOWCASE 3: DEAL ANALYZER & CHARTS ── */}
      <section className="relative z-10 border-t border-white/5 py-20 md:py-28 bg-gradient-to-b from-transparent to-[#080d24]/30">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Animated SVG Chart Widget */}
          <div className="bg-[#080d24]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[350px]">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <h4 className="font-extrabold text-sm text-white">Price History Chart</h4>
                <span className="text-[10px] text-white/40 font-semibold">iPad Air (M2, 11-inch)</span>
              </div>
              <div className="flex gap-1">
                {(["30", "90", "180"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDealTimeframe(t)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      dealTimeframe === t ? "bg-[#06B6D4] text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {t}D
                  </button>
                ))}
              </div>
            </div>

            {/* Glowing SVG Price Chart */}
            <div className="flex-1 flex items-center justify-center relative py-6">
              <svg viewBox="0 0 400 150" className="w-full h-36">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Average price baseline */}
                <line x1="0" y1="65" x2="400" y2="65" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" strokeDasharray="4 4" />
                <text x="350" y="60" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">AVG: ₹57,990</text>
                
                {/* SVG path curve based on selected timeframe */}
                {dealTimeframe === "30" && (
                  <path d="M 0 50 Q 50 20 100 80 T 200 40 T 300 120 T 400 100 L 400 150 L 0 150 Z" fill="url(#chartGradient)" />
                )}
                {dealTimeframe === "30" && (
                  <path d="M 0 50 Q 50 20 100 80 T 200 40 T 300 120 T 400 100" fill="none" stroke="#06B6D4" strokeWidth="2.5" />
                )}

                {dealTimeframe === "90" && (
                  <path d="M 0 80 Q 50 30 100 110 T 200 70 T 300 130 T 400 60 L 400 150 L 0 150 Z" fill="url(#chartGradient)" />
                )}
                {dealTimeframe === "90" && (
                  <path d="M 0 80 Q 50 30 100 110 T 200 70 T 300 130 T 400 60" fill="none" stroke="#06B6D4" strokeWidth="2.5" />
                )}

                {dealTimeframe === "180" && (
                  <path d="M 0 100 Q 50 50 100 130 T 200 90 T 300 50 T 400 110 L 400 150 L 0 150 Z" fill="url(#chartGradient)" />
                )}
                {dealTimeframe === "180" && (
                  <path d="M 0 100 Q 50 50 100 130 T 200 90 T 300 50 T 400 110" fill="none" stroke="#06B6D4" strokeWidth="2.5" />
                )}
                
                {/* Dot markers */}
                <circle cx="400" cy={dealTimeframe === "30" ? "100" : dealTimeframe === "90" ? "60" : "110"} r="4" fill="#06B6D4" />
                <circle cx="400" cy={dealTimeframe === "30" ? "100" : dealTimeframe === "90" ? "60" : "110"} r="8" fill="none" stroke="#06B6D4" strokeWidth="1.5" className="animate-ping" />
              </svg>
            </div>

            {/* Bottom Details */}
            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2">
              <div>
                <span className="text-[10px] text-white/40 block font-semibold uppercase">Current Price</span>
                <span className="font-extrabold text-sm text-emerald-400">₹53,990</span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 block font-semibold uppercase">Deal Rating</span>
                <span className="font-extrabold text-sm text-[#F59E0B]">92/100 (Strong Buy)</span>
              </div>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs font-semibold mb-6">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Price Tracker & Analyzer</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Know Exactly When <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
                To Buy.
              </span>
            </h2>
            <p className="text-white/60 mt-4 text-sm md:text-base leading-relaxed">
              Ecommerce sites use dynamic pricing to push sales. Goval tracks the average history to give you an objective Deal Score. If it's inflated, we tell you to wait. If it's a real discount, we recommend buying.
            </p>
            <div className="mt-8 flex gap-6 text-sm">
              <div>
                <span className="font-extrabold text-white text-xl">₹3,200</span>
                <p className="text-xs text-white/40 mt-0.5">Average savings per item</p>
              </div>
              <div className="border-l border-white/10 pl-6">
                <span className="font-extrabold text-white text-xl">180 Days</span>
                <p className="text-xs text-white/40 mt-0.5">Continuous tracking data</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── TESTIMONIALS CAROUSEL SECTION ── */}
      <section className="relative z-10 py-20 md:py-28 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center">
          
          <h2 className="text-3xl md:text-5xl font-extrabold mb-12">
            Loved By <br className="sm:hidden" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]">
              Thousands of Shoppers.
            </span>
          </h2>

          <div className="max-w-2xl mx-auto relative h-60 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.4 }}
                className="bg-white/[0.02] border border-white/5 p-6 md:p-8 rounded-2xl backdrop-blur-md shadow-lg text-center flex flex-col items-center justify-between"
              >
                {/* Stars */}
                <div className="flex gap-1 text-amber-400 mb-4 justify-center">
                  {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="h-4.5 w-4.5 fill-amber-400" />
                  ))}
                </div>

                <p className="text-sm md:text-base text-white/80 leading-relaxed italic mb-6">
                  "{testimonials[activeTestimonial].comment}"
                </p>

                {/* Profile info */}
                <div className="flex items-center gap-3 mt-auto">
                  <img
                    src={testimonials[activeTestimonial].avatar}
                    alt={testimonials[activeTestimonial].name}
                    className="w-10 h-10 rounded-full border border-white/15"
                  />
                  <div className="text-left">
                    <span className="block text-sm font-bold text-white">{testimonials[activeTestimonial].name}</span>
                    <span className="block text-[11px] text-white/40">{testimonials[activeTestimonial].role}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTestimonial(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  activeTestimonial === idx ? "bg-[#06B6D4] w-6" : "bg-white/20"
                }`}
              />
            ))}
          </div>

        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section id="faq" className="relative z-10 py-20 md:py-28 border-t border-white/5 bg-[#050816]">
        <div className="max-w-4xl mx-auto px-6">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-purple-300 text-xs font-semibold mb-6">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Common Questions</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-white/5 bg-white/[0.01] rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-sm md:text-base hover:bg-white/[0.02] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-white/55 transition-transform duration-300 ${
                      faqOpen === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                
                <AnimatePresence>
                  {faqOpen === index && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-xs md:text-sm text-white/60 leading-relaxed border-t border-white/5 pt-3 bg-white/[0.005]">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="relative z-10 border-t border-white/5 py-24 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#7C3AED]/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 flex flex-col items-center">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Start Shopping Smarter Today
          </h2>
          <p className="mt-6 text-base sm:text-lg text-white/50 max-w-xl leading-relaxed">
            Create a free account, set price drops, and let our AI handle the comparison analysis for you.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center w-full sm:w-auto">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-white/90 font-bold rounded-2xl transition-all shadow-xl active:scale-[0.98] block text-center">
              Create Free Account
            </Link>
            <a href="#demo" className="w-full sm:w-auto px-6 py-4 bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/15 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all">
              <Sparkles className="h-4.5 w-4.5 text-[#06B6D4]" />
              <span>Try AI Assistant</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/5 bg-[#030611] py-16 text-xs text-white/40">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8">
          
          {/* Logo column */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#06B6D4] flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white">Goval</span>
            </div>
            <p className="max-w-xs leading-relaxed">
              Goval is a premium AI-powered shopping intelligence platform designed to find the absolute lowest prices and summarize unbiased product value metrics.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="hover:text-white transition-colors"><Twitter className="h-4.5 w-4.5" /></a>
              <a href="#" className="hover:text-white transition-colors"><Github className="h-4.5 w-4.5" /></a>
              <a href="#" className="hover:text-white transition-colors"><Linkedin className="h-4.5 w-4.5" /></a>
            </div>
          </div>

          {/* Company links */}
          <div>
            <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-[10px]">Company</h4>
            <ul className="space-y-3 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Affiliate Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Features links */}
          <div>
            <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-[10px]">Features</h4>
            <ul className="space-y-3 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Multi-Store Search</a></li>
              <li><a href="#" className="hover:text-white transition-colors">AI Advisor</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Price Charts</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Deal Score</a></li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-[10px]">Resources</h4>
            <ul className="space-y-3 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Sitemap</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-center">
          <span>&copy; {new Date().getFullYear()} Goval AI Shopping Inc. All rights reserved.</span>
          <span>Designed with Apple & Perplexity aesthetic languages.</span>
        </div>
      </footer>

    </div>
  );
}
