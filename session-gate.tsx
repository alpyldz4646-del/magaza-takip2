import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { authClient, beginCredentialLogin, credentialLoginEpoch, getBearerToken, markPasswordAccepted, setBearerToken } from "@/lib/auth/client";
import { LoginPage } from "@/routes/login";

const AppShell = lazy(() =>
  import("@/components/app-shell").then((mod) => ({ default: mod.AppShell })),
);

export function SessionGate({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false);
  const signedIn = useRef(false);

  useEffect(() => {
    const token = getBearerToken();
    const epoch = credentialLoginEpoch();
    if (!token) return;

    let cancelled = false;
    void authClient
      .getSession()
      .then((session) => {
        if (cancelled || signedIn.current || credentialLoginEpoch() !== epoch) return;
        if (getBearerToken() !== token) return;
        if (session.data?.user) {
          markPasswordAccepted();
          setEntered(true);
          return;
        }
        setBearerToken(null);
      })
      .catch(() => {
        /* doğrulanamayan eski oturumu silme; giriş formu açık kalır */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!entered) {
    return (
      <LoginPage
        onEntered={() => {
          signedIn.current = true;
          beginCredentialLogin();
          markPasswordAccepted();
          setEntered(true);
        }}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-bg px-6">
          <p className="text-sm text-muted">Saha Defteri açılıyor…</p>
        </main>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}