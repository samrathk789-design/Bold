type CredentialResponse = { credential?: string };

type GoogleAccountsId = {
  initialize: (cfg: {
    client_id: string;
    callback: (res: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: (cb?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: string;
      size?: string;
      width?: number;
      text?: string;
      shape?: string;
    }
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gis="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function startGoogleSignIn(
  clientId: string,
  onCredential: (idToken: string) => void | Promise<void>
): Promise<void> {
  await loadGoogleIdentityScript();
  if (!window.google?.accounts?.id) {
    throw new Error("Google Identity Services unavailable");
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (res) => {
      if (res.credential) void onCredential(res.credential);
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  window.google.accounts.id.prompt();
}

export async function renderGoogleButton(
  parent: HTMLElement,
  clientId: string,
  onCredential: (idToken: string) => void | Promise<void>
): Promise<void> {
  await loadGoogleIdentityScript();
  if (!window.google?.accounts?.id) {
    throw new Error("Google Identity Services unavailable");
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (res) => {
      if (res.credential) void onCredential(res.credential);
    },
  });

  parent.innerHTML = "";
  window.google.accounts.id.renderButton(parent, {
    theme: "outline",
    size: "large",
    width: 320,
    text: "continue_with",
    shape: "rectangular",
  });
}
