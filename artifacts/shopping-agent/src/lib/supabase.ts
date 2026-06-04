import { createClient } from "@supabase/supabase-js";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const isUUID = (str: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

const base64UrlEncode = (str: string) => {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

if (typeof window !== "undefined") {
  try {
    const sessionStr = localStorage.getItem("sb-mock-session");
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      const userId = session?.user?.id;
      if (userId && !isUUID(userId)) {
        localStorage.removeItem("sb-mock-session");
        localStorage.removeItem("sb-mock-profiles");
      }
    }
  } catch (err) {
    // silent
  }
}

// Attempt to load credentials from environment
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

const isRealSupabaseConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("PLACEHOLDER") &&
  !supabaseAnonKey.includes("PLACEHOLDER");

// --- MOCK SUPABASE CLIENT IMPLEMENTATION ---
interface MockSession {
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  expires_at?: number;
}

class MockAuth {
  private listeners: Array<(event: string, session: MockSession | null) => void> = [];

  constructor() {
    // Listen to storage changes to keep tabs synchronized
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === "sb-mock-session") {
          this.trigger("SIGNED_IN", this.getSessionSync());
        }
      });
    }
  }

  private trigger(event: string, session: MockSession | null) {
    this.listeners.forEach((cb) => cb(event, session));
  }

  private getSessionSync(): MockSession | null {
    try {
      const s = localStorage.getItem("sb-mock-session");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }

  async getSession() {
    return { data: { session: this.getSessionSync() }, error: null };
  }

  async getUser() {
    const session = this.getSessionSync();
    return { data: { user: session ? session.user : null }, error: null };
  }

  async signInWithOtp(params: { email: string; options?: { shouldCreateUser?: boolean; data?: any } }) {
    console.log(`[Mock Supabase Auth] OTP requested for ${params.email}`);
    
    // Simulate rate-limiting (e.g. max request speed, error out if clicked too fast)
    const lastRequest = localStorage.getItem(`sb-mock-otp-time-${params.email}`);
    const now = Date.now();
    if (lastRequest && now - parseInt(lastRequest) < 15000) {
      return {
        data: null,
        error: { message: "Please wait 15 seconds before requesting another OTP." }
      };
    }
    localStorage.setItem(`sb-mock-otp-time-${params.email}`, now.toString());

    // Generate a fixed or random 6-digit OTP code (defaulting to 123456 for ease of testing)
    const otp = "123456"; 
    localStorage.setItem(`sb-mock-otp-${params.email}`, JSON.stringify({
      code: otp,
      expiry: now + 5 * 60 * 1000, // 5 minute expiry
      metadata: params.options?.data || {}
    }));

    // Alert the tester of the OTP code
    console.log(`%c[Mock Supabase Auth] OTP Code for ${params.email} is: ${otp}`, "color: #7C3AED; font-weight: bold; font-size: 14px;");

    return { data: { user: null, session: null }, error: null };
  }

  async verifyOtp(params: { email: string; token: string; type: string }) {
    const storedStr = localStorage.getItem(`sb-mock-otp-${params.email}`);
    if (!storedStr) {
      return { data: { session: null, user: null }, error: { message: "No OTP request found for this email." } };
    }

    const { code, expiry, metadata } = JSON.parse(storedStr);
    if (Date.now() > expiry) {
      return { data: { session: null, user: null }, error: { message: "OTP has expired. Please request a new one." } };
    }

    if (params.token !== code) {
      return { data: { session: null, user: null }, error: { message: "Invalid OTP code. Try 123456." } };
    }

    // Success! Clear OTP code
    localStorage.removeItem(`sb-mock-otp-${params.email}`);

    // Create profile if it does not exist
    const profiles = JSON.parse(localStorage.getItem("sb-mock-profiles") || "[]");
    let profile = profiles.find((p: any) => p.email.toLowerCase() === params.email.toLowerCase());
    
    let userId = profile?.id;
    if (!userId || !isUUID(userId)) {
      userId = generateUUID();
      if (profile) {
        profile.id = userId;
        localStorage.setItem("sb-mock-profiles", JSON.stringify(profiles));
      }
    }
    
    if (!profile) {
      profile = {
        id: userId,
        email: params.email,
        full_name: metadata?.full_name || params.email.split("@")[0],
        avatar_url: metadata?.avatar_url || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      profiles.push(profile);
      localStorage.setItem("sb-mock-profiles", JSON.stringify(profiles));
    }

    const payload = base64UrlEncode(JSON.stringify({ sub: userId, email: params.email }));
    const mockToken = `mock-token.${payload}.mock-signature`;

    const session: MockSession & { access_token: string } = {
      access_token: mockToken,
      user: {
        id: userId,
        email: params.email,
        user_metadata: {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        }
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };

    localStorage.setItem("sb-mock-session", JSON.stringify(session));
    this.trigger("SIGNED_IN", session);

    return { data: { session, user: session.user }, error: null };
  }

  async signOut() {
    localStorage.removeItem("sb-mock-session");
    this.trigger("SIGNED_OUT", null);
    return { error: null };
  }

  onAuthStateChange(callback: (event: string, session: MockSession | null) => void) {
    callback("INITIAL_SESSION", this.getSessionSync());
    this.listeners.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter((cb) => cb !== callback);
          }
        }
      }
    };
  }

  async signInWithOAuth(params: { provider: string }) {
    console.log(`[Mock Supabase Auth] OAuth initiated with ${params.provider}`);
    // Immediately log in with a mock profile
    const userId = generateUUID();
    const email = `oauth-${params.provider}@example.com`;
    const payload = base64UrlEncode(JSON.stringify({ sub: userId, email }));
    const mockToken = `mock-token.${payload}.mock-signature`;
    const session: MockSession & { access_token: string } = {
      access_token: mockToken,
      user: {
        id: userId,
        email,
        user_metadata: {
          full_name: `${params.provider.charAt(0).toUpperCase() + params.provider.slice(1)} Tester`,
          avatar_url: ""
        }
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };
    localStorage.setItem("sb-mock-session", JSON.stringify(session));
    this.trigger("SIGNED_IN", session);
    return { data: { session }, error: null };
  }
}

class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private getData(): any[] {
    try {
      const dataStr = localStorage.getItem(`sb-mock-${this.tableName}`);
      return dataStr ? JSON.parse(dataStr) : [];
    } catch {
      return [];
    }
  }

  private saveData(data: any[]) {
    localStorage.setItem(`sb-mock-${this.tableName}`, JSON.stringify(data));
  }

  select(columns?: string) {
    return this;
  }

  insert(data: any | any[]) {
    const current = this.getData();
    const rows = Array.isArray(data) ? data : [data];
    const inserted = rows.map((row) => ({
      id: Math.floor(Math.random() * 1000000),
      created_at: new Date().toISOString(),
      ...row
    }));
    this.saveData([...current, ...inserted]);

    return {
      data: inserted,
      error: null,
      then: (resolve: any) => resolve({ data: inserted, error: null })
    };
  }

  update(data: any) {
    return {
      eq: (column: string, value: any) => {
        const current = this.getData();
        const updated = current.map((item) => {
          if (item[column] === value) {
            return { ...item, ...data, updated_at: new Date().toISOString() };
          }
          return item;
        });
        this.saveData(updated);
        return {
          data: updated.filter(item => item[column] === value),
          error: null,
          then: (resolve: any) => resolve({ data: updated.filter(item => item[column] === value), error: null })
        };
      }
    };
  }

  delete() {
    return {
      eq: (column: string, value: any) => {
        const current = this.getData();
        const deleted = current.filter((item) => item[column] === value);
        const remaining = current.filter((item) => item[column] !== value);
        this.saveData(remaining);
        return {
          data: deleted,
          error: null,
          then: (resolve: any) => resolve({ data: deleted, error: null })
        };
      }
    };
  }

  eq(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  single() {
    return {
      then: (resolve: any) => {
        const data = this.getData();
        const filtered = data.filter((item) => this.filters.every((f) => f(item)));
        resolve({ data: filtered[0] || null, error: filtered[0] ? null : { message: "Not found" } });
      }
    };
  }

  // Allow direct await of the MockQueryBuilder
  then(resolve: any) {
    const data = this.getData();
    const filtered = data.filter((item) => this.filters.every((f) => f(item)));
    resolve({ data: filtered, error: null });
  }
}

const mockSupabase = {
  auth: new MockAuth(),
  from: (table: string) => new MockQueryBuilder(table),
};

// --- INITIALIZATION ---
export const supabase = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (mockSupabase as any);

// Auto-register token getter for API client calls
setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
});

console.log(
  `[Supabase System] Initialized using: ${
    isRealSupabaseConfigured ? "REAL Supabase Connection" : "LOCAL Fallback Mock Client"
  }`
);
