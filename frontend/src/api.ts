const TOKEN_KEY = "bold_token";
const USER_KEY = "bold_user";

export type User = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  authMethod: string | null;
  needsUsername: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
};

export type AuthSession = {
  token: string;
  expiresAt?: string;
  user: User;
  isNew?: boolean;
};

export type AuthConfig = {
  googleClientId: string | null;
  googleEnabled: boolean;
  googleMode?: "gis" | "firebase" | "dev" | "off";
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
    messagingSenderId?: string;
  } | null;
  firebaseReady: boolean;
  providers: {
    google: boolean;
    apple: boolean;
    github: boolean;
  };
  allowDevOAuth: boolean;
  otpLength: number;
  otpTtlSeconds: number;
  exposeOtp: boolean;
  smsReady: boolean;
  emailReady: boolean;
  smsSetupHint: string | null;
  emailSetupHint: string | null;
  googleSetupHint?: string | null;
  firebaseSetupHint?: string | null;
  devGoogleHint: string | null;
};

export type OtpStartResult = {
  challengeId: string;
  expiresAt: string;
  expiresInSeconds: number;
  destination: string;
  channel: string;
  message: string;
  deliveryProvider?: string;
  deliveryPreviewUrl?: string;
};

export type OAuthProvider = "google" | "apple" | "github";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  authConfig: () => request<AuthConfig>("/api/auth/config"),
  startOtp: (channel: "email" | "phone", destination: string) =>
    request<OtpStartResult>("/api/auth/otp/start", {
      method: "POST",
      body: JSON.stringify({ channel, destination }),
    }),
  verifyOtp: (challengeId: string, code: string) =>
    request<AuthSession>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ challengeId, code }),
    }),
  google: (idToken: string) =>
    request<AuthSession>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),
  firebase: (idToken: string, provider: OAuthProvider) =>
    request<AuthSession>("/api/auth/firebase", {
      method: "POST",
      body: JSON.stringify({ idToken, provider }),
    }),
  oauthDev: (provider: OAuthProvider, email: string, name?: string) =>
    request<AuthSession>("/api/auth/oauth/dev", {
      method: "POST",
      body: JSON.stringify({ provider, email, name }),
    }),
  setUsername: (username: string) =>
    request<{ user: User }>("/api/auth/username", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),
  me: () => request<{ user: User }>("/api/auth/me"),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  brainStatus: () => request<{ ready: boolean; model: string | null }>("/api/brain/status"),
  brainChat: (
    message: string,
    history: Array<{ role: "user" | "assistant"; content: string }> = []
  ) =>
    request<{ reply: string; model: string }>("/api/brain/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),
};

export function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
