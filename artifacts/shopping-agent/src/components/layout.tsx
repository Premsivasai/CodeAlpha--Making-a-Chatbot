import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag, Settings, Heart, GitCompare,
  Plus, Settings2, Search, ChevronRight, LogOut, ChevronLeft,
  MessageSquare, ChevronDown, MoreHorizontal, UserPlus, Library,
  Pin, Archive, Trash2, Check, Share2
} from "lucide-react";
import { UserProfileModal, loadUserProfile, getUserInitials, type UserProfile } from "./user-profile-modal";
import { cn } from "@/lib/utils";
import { FloatingAssistant } from "./floating-assistant";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/saved",       icon: Heart,      label: "Saved"       },
  { href: "/compare",     icon: GitCompare, label: "Compare"     },
  { href: "/preferences", icon: Settings,   label: "Preferences" },
];

function ConversationMenu({ convo, onDeleteSuccess }: { convo: any; onDeleteSuccess: () => void }) {
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const chatUrl = `${window.location.origin}/?c=${convo.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Shopping Assistant Chat`,
          text: `Check out my Goval shopping assistant chat: "${convo.title}"`,
          url: chatUrl,
        });
        return;
      } catch (err) {
        // ignore
      }
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(chatUrl);
      } else {
        // Fallback for non-secure HTTP contexts
        const textArea = document.createElement("textarea");
        textArea.value = chatUrl;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      alert("Chat link copied to clipboard!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    try {
      const res = await fetch(`/api/openai/conversations/${convo.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleteSuccess();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-[#090d16] border border-white/10 text-white/80 z-50">
        <DropdownMenuItem
          onClick={handleShare}
          className="flex items-center gap-2 text-xs py-2 hover:bg-white/5 hover:text-white cursor-pointer focus:bg-white/5 focus:text-white"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Share chat</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          className="flex items-center gap-2 text-xs py-2 hover:bg-rose-500/10 text-rose-400 hover:text-rose-350 cursor-pointer focus:bg-rose-500/10 focus:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ name: "", email: "", city: "" });
  const [user, setUser] = useState<any>(null);
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar_collapsed");
      return saved === "true";
    }
    return false;
  });

  const [conversations, setConversations] = useState<any[]>([]);
  const [recentsExpanded, setRecentsExpanded] = useState(true);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem("sidebar_collapsed", String(newVal));
      return newVal;
    });
  };

  const loadConversations = async () => {
    const { data } = await supabase.auth.getSession();
    const activeUser = data?.session?.user;
    if (!activeUser) {
      setConversations([]);
      return;
    }
    try {
      const res = await fetch("/api/openai/conversations", {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`
        }
      });
      if (res.ok) {
        const list = await res.json();
        setConversations(list);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  useEffect(() => {
    setProfile(loadUserProfile());

    supabase.auth.getSession().then(({ data }: { data: any }) => {
      const session = data?.session ?? null;
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadConversations();
  }, [user, location]);

  useEffect(() => {
    const handlePopstate = () => {
      loadConversations();
    };
    window.addEventListener("popstate", handlePopstate);

    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      loadConversations();
    };

    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      loadConversations();
    };

    return () => {
      window.removeEventListener("popstate", handlePopstate);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  const initials = user
    ? getUserInitials(user.user_metadata?.full_name || user.email || "User")
    : getUserInitials(profile.name);
  const name = user ? (user.user_metadata?.full_name || user.email?.split("@")[0]) : profile.name;
  const email = user ? user.email : profile.email;
  const hasProfile = Boolean(name);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#050816]">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "shrink-0 flex flex-col h-full bg-[#060814] border-r border-white/5 transition-all duration-300 ease-in-out relative z-20",
          isCollapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* Floating Toggle Button on the border */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-[#060814] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all z-30 cursor-pointer shadow-md shadow-black/40 hover:border-white/20"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        {/* Brand */}
        <div className={cn("flex items-center px-4 py-3.5 border-b border-white/5", isCollapsed ? "justify-center px-0" : "gap-2.5")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#06B6D4] flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/10">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-extrabold text-[15px] tracking-tight text-white animate-in fade-in duration-300">Goval</span>
          )}
        </div>

        {/* New Search */}
        <div className="px-3 pt-3">
          {isCollapsed ? (
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center justify-center p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white transition-all cursor-pointer"
              title="New Search"
            >
              <Plus className="h-4 w-4 text-white/60 group-hover:text-white" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/95 hover:bg-white/10 transition-all border border-white/10 group cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0 text-white/50 group-hover:text-white transition-colors" />
              New Search
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="px-3 mt-2 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors",
                isCollapsed && "justify-center px-0",
                location === href
                  ? "bg-white/15 text-white font-semibold"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              )}
              title={isCollapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        {/* Collapsible Recents Chat History Dropdown */}
        {!isCollapsed && (
          <div className="mt-5 flex-1 flex flex-col min-h-0 overflow-hidden px-3 animate-in fade-in duration-300">
            <button
              onClick={() => setRecentsExpanded(!recentsExpanded)}
              className="flex items-center gap-1.5 px-2 mb-3 text-sm font-semibold text-white/75 hover:text-white transition-colors text-left cursor-pointer"
            >
              <span>Recents</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 text-white/50", !recentsExpanded && "-rotate-90")} />
            </button>
            
            {recentsExpanded && (
              <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
                {conversations.length > 0 ? (
                  conversations.map(convo => {
                    const params = new URLSearchParams(window.location.search);
                    const activeConvoId = params.get("c");
                    const isActive = activeConvoId === String(convo.id);
                    
                    return (
                      <div
                        key={convo.id}
                        className={cn(
                          "group relative flex items-center w-full rounded-lg transition-colors",
                          isActive ? "bg-[#202020]" : "hover:bg-white/5"
                        )}
                      >
                        <button
                          onClick={() => navigate(`/?c=${convo.id}`)}
                          className={cn(
                            "flex-1 flex items-center px-3.5 py-2.5 text-left text-[13px] transition-colors truncate cursor-pointer pr-10",
                            isActive ? "text-white font-medium" : "text-white/70 hover:text-white"
                          )}
                          title={convo.title}
                        >
                          <span className="truncate">{convo.title}</span>
                        </button>

                        {/* Dropdown Menu Option Trigger */}
                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ConversationMenu convo={convo} onDeleteSuccess={loadConversations} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="px-3 py-2 text-[11px] text-white/30 italic">No recent chats</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* ── User Profile Card ── */}
        <div className="p-3 border-t border-white/5 space-y-1.5 flex flex-col items-center">
          {hasProfile ? (
            /* Filled profile */
            <>
              <button
                onClick={() => setProfileOpen(true)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors group text-left cursor-pointer",
                  isCollapsed && "justify-center px-0"
                )}
                title={isCollapsed ? name : "Profile Settings"}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                  {initials}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                    <p className="text-sm font-semibold text-white truncate leading-tight">
                      {name}
                    </p>
                    <p className="text-[11px] text-white/40 truncate leading-tight mt-0.5">
                      {user ? email : (profile.city ? `${profile.city}` : email)}
                    </p>
                  </div>
                )}
                {!isCollapsed && <Settings2 className="h-3.5 w-3.5 text-white/25 group-hover:text-white/60 transition-colors shrink-0" />}
              </button>

              <button
                onClick={async () => {
                  queryClient.clear();
                  await supabase.auth.signOut();
                  navigate("/");
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors mt-0.5 cursor-pointer",
                  isCollapsed && "justify-center px-0"
                )}
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                {!isCollapsed && <span>Sign Out</span>}
              </button>
            </>
          ) : (
            /* Empty state — prompt user to set up */
            <button
              onClick={() => setProfileOpen(true)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-dashed border-white/15 hover:border-white/30 hover:bg-white/5 transition-all group text-left cursor-pointer",
                isCollapsed && "justify-center p-2.5"
              )}
              title={isCollapsed ? "Set up your profile" : undefined}
            >
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <span className="text-white/50 text-sm font-bold">U</span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                  <p className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                    Set up your profile
                  </p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    Save your details
                  </p>
                </div>
              )}
              {!isCollapsed && <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/50 transition-colors shrink-0 animate-in fade-in duration-300" />}
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#050816]">
        {children}
      </main>

      <UserProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onSave={p => setProfile(p)}
      />
      <FloatingAssistant />
    </div>
  );
}
