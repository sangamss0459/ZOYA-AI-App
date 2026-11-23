import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { GmailFullMessage, GmailMessageSummary } from "../types/assistant";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of GMAIL_SCOPES) {
  provider.addScope(scope);
}

// Strict in-memory token cache (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export function initGmailAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthSignedOut?: () => void
) {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      onAuthSignedOut?.();
    }
  });
}

export async function signInWithGmail(): Promise<{
  user: User;
  accessToken: string;
}> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Could not obtain Gmail authorization token.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getCachedGmailToken(): string | null {
  return cachedAccessToken;
}

export async function signOutGmail(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

export async function fetchGmailMessages(
  query = "",
  maxResults = 5
): Promise<GmailMessageSummary[]> {
  if (!cachedAccessToken) {
    throw new Error("Gmail is not connected. Please sign in with Google first.");
  }
  const params = new URLSearchParams({
    maxResults: String(maxResults),
  });
  if (query) params.set("q", query);

  const res = await fetch(`/api/gmail/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${cachedAccessToken}` },
  });
  if (!res.ok) {
    if (res.status === 401) {
      cachedAccessToken = null;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Unable to fetch Gmail messages.");
  }
  const data = (await res.json()) as { messages: GmailMessageSummary[] };
  return data.messages ?? [];
}

export async function fetchGmailMessageById(
  messageId: string
): Promise<GmailFullMessage> {
  if (!cachedAccessToken) {
    throw new Error("Gmail is not connected. Please sign in with Google first.");
  }
  const res = await fetch(`/api/gmail/messages/${encodeURIComponent(messageId)}`, {
    headers: { Authorization: `Bearer ${cachedAccessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Unable to read email.");
  }
  return (await res.json()) as GmailFullMessage;
}

export async function sendConfirmedGmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ sent: boolean; id?: string }> {
  if (!cachedAccessToken) {
    throw new Error("Gmail is not connected. Please sign in with Google first.");
  }
  const res = await fetch("/api/gmail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...params, confirmed: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to send email.");
  }
  return (await res.json()) as { sent: boolean; id?: string };
}
