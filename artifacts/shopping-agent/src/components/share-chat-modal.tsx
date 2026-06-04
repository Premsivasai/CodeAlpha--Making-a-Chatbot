import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Share2 } from "lucide-react";

interface ShareChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  summary: string;
  productCount: number;
  topProducts: { title: string; price: number; source: string }[];
}

export function ShareChatModal({ open, onOpenChange, query, summary, productCount, topProducts }: ShareChatModalProps) {
  const [copied, setCopied] = useState(false);
  const chatUrl = typeof window !== "undefined" ? `${window.location.origin}/?q=${encodeURIComponent(query)}` : "";

  const shareText = `🛍️ AI Shopping Search: "${query}"

Chat Link: ${chatUrl}

${summary}

Top ${Math.min(topProducts.length, 5)} results (${productCount} total found):
${topProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p.title} — ₹${p.price} (${p.source})`).join("\n")}

Searched with Goval AI Shopping Agent`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const handleTwitter = () => {
    const tweet = `🛍️ Found ${productCount} products for "${query}" using AI shopping!\n\nCheck out the results here: ${chatUrl}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Share this search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Share your search results with others</p>
            <Textarea
              readOnly
              rows={8}
              value={shareText}
              className="text-xs font-mono resize-none bg-muted/40 border-border"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCopy} variant="default" size="sm" className="gap-2 flex-1">
              {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy Text</>}
            </Button>
            <Button
              onClick={handleWhatsApp}
              variant="outline"
              size="sm"
              className="gap-2 flex-1 text-green-700 border-green-200 hover:bg-green-50"
            >
              📱 WhatsApp
            </Button>
            <Button
              onClick={handleTwitter}
              variant="outline"
              size="sm"
              className="gap-2 flex-1 text-sky-600 border-sky-200 hover:bg-sky-50"
            >
              𝕏 Twitter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
