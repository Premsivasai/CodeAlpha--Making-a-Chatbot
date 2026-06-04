import { useState, useEffect } from "react";
import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { supabase } from "@/lib/supabase";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import ChatPage from "@/pages/chat";
import SavedPage from "@/pages/saved";
import ComparePage from "@/pages/compare";
import PreferencesPage from "@/pages/preferences";

const queryClient = new QueryClient();

// Simple Auth listener hook
export function useAuthSession() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }: { data: any }) => {
      const session = data?.session ?? null;
      setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}

function Router() {
  const { session, loading } = useAuthSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-semibold text-white/50">Securing session...</p>
      </div>
    );
  }

  const isAuthenticated = !!session;

  return (
    <Switch>
      {/* Conditional Root Route */}
      <Route path="/">
        {isAuthenticated ? <ChatPage /> : <LandingPage />}
      </Route>

      {/* Auth Routes */}
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route path="/signup">
        {isAuthenticated ? <Redirect to="/" /> : <SignupPage />}
      </Route>

      {/* Protected App Routes */}
      <Route path="/saved">
        {isAuthenticated ? <SavedPage /> : <Redirect to="/login" />}
      </Route>
      <Route path="/compare">
        {isAuthenticated ? <ComparePage /> : <Redirect to="/login" />}
      </Route>
      <Route path="/preferences">
        {isAuthenticated ? <PreferencesPage /> : <Redirect to="/login" />}
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
