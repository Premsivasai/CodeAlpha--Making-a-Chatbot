import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, MessageSquare, ArrowUpRight, FileText, ShieldCheck } from "lucide-react";

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidenceScore?: number;
  sources?: string[];
  recommendation?: string;
  suggestedFollowUps?: string[];
}

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your global AI Shopping Assistant. Ask me anything about product comparisons, spec reviews, buying decisions, or pricing!",
      confidenceScore: 99,
      sources: ["Shopping Index"],
      recommendation: "Buy Now",
      suggestedFollowUps: [
        "Best gaming phone under ₹20,000?",
        "Should I buy OnePlus 12R now?",
        "Compare Poco X6 with Narzo 70 Pro"
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || isTyping) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: queryText
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const history = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }));

      // Send to the assistant endpoint with a generic placeholder product
      const res = await fetch("/api/shopping/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          product: {
            title: "Selected Item",
            brand: "Brand",
            price: 15000,
            pros: ["Value for money", "Good performance"],
            cons: ["Average camera"]
          },
          history
        })
      });

      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();

      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer,
        confidenceScore: data.confidenceScore,
        sources: data.sources,
        recommendation: data.recommendation,
        suggestedFollowUps: data.suggestedFollowUps
      }]);
    } catch (err) {
      console.error("[ERROR] Floating assistant query failed:", err);
      setMessages(prev => [...prev, {
        id: `assistant-err-${Date.now()}`,
        role: "assistant",
        content: "I'm having trouble connecting to the AI helper right now. Try again shortly!",
        confidenceScore: 50
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center shadow-2xl hover:shadow-primary/30 hover:scale-105 transition-all animate-bounce"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white text-white">
            1
          </span>
        </button>
      )}

      {/* Expandable Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] sm:w-[420px] max-w-[95vw] h-[550px] max-h-[85vh] rounded-3xl bg-white border border-slate-150 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between text-white shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
              <div>
                <h3 className="text-xs font-black">AI Buying Companion</h3>
                <p className="text-[9px] opacity-80">Powered by Gemini 3.5</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick chip recommendations */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex gap-1.5 overflow-x-auto shrink-0 select-none no-scrollbar">
            {["Best Phone < ₹20k", "Is Poco X6 worth it?", "Wait for next sale?"].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSendMessage(chip)}
                className="text-[9px] font-bold bg-white border border-slate-200 hover:border-primary/20 text-slate-600 hover:text-primary rounded-full px-2.5 py-1 transition-all whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat message timeline */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`flex gap-2.5 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold border ${
                  msg.role === "user" ? "bg-slate-200 border-slate-350 text-slate-700" : "bg-primary/10 border-primary/20 text-primary"
                }`}>
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className={`rounded-2xl p-3 max-w-[82%] shadow-2xs space-y-2.5 ${
                  msg.role === "user" ? "bg-primary text-white rounded-tr-sm" : "bg-white border border-slate-150 rounded-tl-sm text-slate-800"
                }`}>
                  <p className="text-[11px] leading-relaxed whitespace-pre-line">{msg.content}</p>

                  {/* Recommendation/confidence */}
                  {msg.role === "assistant" && (msg.confidenceScore !== undefined || msg.recommendation !== undefined) && (
                    <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500 pt-1.5 border-t border-slate-100/60">
                      {msg.confidenceScore !== undefined && (
                        <span className="flex items-center gap-0.5"><ShieldCheck className="w-3 h-3 text-green-500" /> {msg.confidenceScore}% Certain</span>
                      )}
                      {msg.recommendation && (
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-extrabold">{msg.recommendation}</span>
                      )}
                    </div>
                  )}

                  {/* Citation sources */}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {msg.sources.map(s => (
                        <span key={s} className="inline-flex items-center gap-0.5 text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded border">
                          <FileText className="w-2.5 h-2.5 text-slate-400" /> {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Suggested followups */}
                  {msg.role === "assistant" && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-100/60">
                      {msg.suggestedFollowUps.slice(0, 2).map((follow, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSendMessage(follow)}
                          className="text-left text-[9px] text-primary hover:text-primary/95 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-lg px-2 py-0.5 transition-all truncate"
                        >
                          {follow}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 items-start animate-pulse">
                <div className="w-7 h-7 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-primary animate-spin" />
                </div>
                <div className="bg-white border border-slate-150 rounded-2xl rounded-tl-sm p-3.5 shadow-2xs max-w-[82%]">
                  <div className="flex gap-1 py-1">
                    {[0, 150, 300].map(delay => (
                      <span key={delay} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Sticky input */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
              className="flex gap-2 items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the AI expert anything..."
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/15"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
