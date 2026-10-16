import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, authEnabled, beginCredentialLogin, getBearerToken, setBearerToken } from "@/lib/auth/client";
import { assertSignupRole, resolveLoginEmail, saveManagerProfile } from "@/lib/server/hr";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function rememberToken(token?: string | null) {
  setBearerToken(token ?? null);
}

function accountEmail(value: string) {
  const raw = value.trim().toLocaleLowerCase("tr");
  if (!raw) return "";
  if (raw.includes("@")) return raw;
  const local = raw.replace(/[^\p{L}\p{N}._-]+/gu, ".").replace(/^\.|\.$/g, "");
  return `${local || "kullanici"}@saha.defteri`;
}

function turkishAuthError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("invalid email or password") || text.includes("invalid_email_or_password")) {
    return "Kullanıcı adı veya şifre hatalı.";
  }
  if (text.includes("invalid email")) return "Kullanıcı adı geçersiz.";
  if (text.includes("invalid origin")) return "Giriş kaynağı kabul edilmedi. Sayfayı yenileyip tekrar deneyin.";
  if (text.includes("already") || text.includes("exists")) return "Bu kullanıcı adı zaten kayıtlı.";
  if (text.includes("password") && text.includes("short")) return "Şifre en az 8 karakter olmalı.";
  return message || "Giriş yapılamadı.";
}

const FIELD_PREFIX = "saha-field:";

function rememberField(id: string, value: string) {
  try {
    sessionStorage.setItem(FIELD_PREFIX + id, value);
  } catch {
    /* ignore */
  }
}

function savedField(id: string) {
  try {
    return sessionStorage.getItem(FIELD_PREFIX + id) ?? "";
  } catch {
    return "";
  }
}

function clearRememberedFields() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(FIELD_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

function PasswordField({
  id,
  name,
  autoComplete,
}: {
  id: string;
  name: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <Input
        ref={ref}
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className="pr-11"
        onInput={(event) => rememberField(id, event.currentTarget.value)}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-subtle hover:text-ink"
        aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          const current = ref.current?.value ?? "";
          setVisible((value) => !value);
          requestAnimationFrame(() => {
            if (ref.current && current) ref.current.value = current;
          });
        }}
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}

async function dropLocalCredential() {
  const previous = getBearerToken();
  rememberToken(null);
  return previous;
}

function fieldText(id: string) {
  const node = document.getElementById(id);
  return node instanceof HTMLInputElement ? node.value.trim() : "";
}

async function openSession(email: string, password: string, signUpName?: string) {
  const previous = await dropLocalCredential();
  let headerToken: string | null = null;
  const fetchOptions = {
    onSuccess(ctx: { response: Response }) {
      headerToken = ctx.response.headers.get("set-auth-token");
    },
  };
  try {
    const result = signUpName
      ? await authClient.signUp.email({
          name: signUpName,
          email,
          password,
          fetchOptions,
        })
      : await authClient.signIn.email({
          email,
          password,
          fetchOptions,
        });
    if (result.error) throw new Error(turkishAuthError(result.error.message ?? ""));
    const token = result.data?.token || headerToken;
    const user = result.data?.user;
    if (!token || !user) throw new Error("Oturum açılamadı. Tekrar deneyin.");
    rememberToken(token);
  } catch (error) {
    if (previous && !getBearerToken()) rememberToken(previous);
    throw error;
  }
}

export function LoginPage({ onEntered }: { onEntered?: () => void }) {
  const [pending, setPending] = useState<
    "manager" | "partner" | "manager-create" | "partner-create" | null
  >(null);
  const [createOpen, setCreateOpen] = useState<"manager" | "partner" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLInputElement>("input[id]");
    for (const input of nodes) {
      const saved = savedField(input.id);
      if (saved && !input.value) input.value = saved;
    }
    const onInput = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.id) rememberField(target.id, target.value);
    };
    document.addEventListener("input", onInput);
    return () => document.removeEventListener("input", onInput);
  }, []);

  async function enter(door: "manager" | "partner", username: string, password: string) {
    beginCredentialLogin();
    if (!authEnabled) {
      toast.error("Giriş henüz açık değil.");
      return;
    }
    const email =
      (await resolveLoginEmail({ data: { username } }).catch(() => null))?.email ||
      accountEmail(username);
    if (!email || password.length < 8) {
      const message = "Kullanıcı adı ve en az 8 karakterlik şifre girin.";
      setError(message);
      toast.error(message);
      return;
    }
    setError("");
    setPending(door);
    try {
      await openSession(email, password);
      if (onEntered) onEntered();
      else if (window.location.pathname === "/login") window.location.replace("/");
      clearRememberedFields();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Giriş yapılamadı";
      setError(message);
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  async function createAccount(
    role: "manager" | "partner",
    name: string,
    username: string,
    password: string,
  ) {
    beginCredentialLogin();
    if (!authEnabled) {
      toast.error("Giriş henüz açık değil.");
      return;
    }
    const email = accountEmail(username);
    if (name.trim().length < 2) {
      toast.error(role === "partner" ? "İş Ortağı adını yazın." : "İş Ortağı Müdürü adını yazın.");
      return;
    }
    if (!email || password.length < 8) {
      const message = "Kullanıcı adı ve en az 8 karakterlik şifre girin.";
      setError(message);
      toast.error(message);
      return;
    }
    setError("");
    setPending(role === "manager" ? "manager-create" : "partner-create");
    try {
      await assertSignupRole({ data: { name: name.trim(), role, email } });
      await openSession(email, password, name.trim());
      await saveManagerProfile({ data: { managerName: name.trim(), role } });
      if (onEntered) onEntered();
      else if (window.location.pathname === "/login") window.location.replace("/");
      clearRememberedFields();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hesap açılamadı";
      setError(message);
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-subtle uppercase">
            İK İş Ortağı Müdürlüğü
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-tight">Saha Defteri</h1>
          <a
            href="/tanitim.html"
            className="mt-3 inline-flex w-fit rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-fg"
          >
            Tanıtım videosunu izle
          </a>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="grid content-start gap-4 rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)]">
            <div>
              <h2 className="font-display text-2xl tracking-tight">İş Ortağı Müdürü</h2>
              <p className="mt-1 text-sm text-muted">
                Kullanıcı adınızı ya da kayıtlı adınızı yazın.
              </p>
            </div>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void enter(
                  "manager",
                  String(data.get("username") ?? "").trim() || fieldText("manager-user"),
                  String(data.get("password") ?? "") || fieldText("manager-password"),
                );
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="manager-user">Kullanıcı</Label>
                <Input id="manager-user" name="username" autoComplete="username" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager-password">Şifre</Label>
                <PasswordField id="manager-password" name="password" autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={pending !== null}>
                {pending === "manager" ? "Giriliyor…" : "Giriş Yap"}
              </Button>
              {error ? <p className="text-sm text-bad">{error}</p> : null}
            </form>
            <Button
              type="button"
              variant="outline"
              disabled={pending !== null}
              onClick={() => setCreateOpen((current) => (current === "manager" ? null : "manager"))}
            >
              Hesap Oluştur
            </Button>
            {createOpen === "manager" ? (
            <form
              className="grid gap-4 border-t border-line pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                void createAccount(
                  "manager",
                  fieldText("manager-name"),
                  fieldText("manager-new-user"),
                  fieldText("manager-new-password"),
                );
              }}
            >
              <h3 className="font-medium">Hesap Oluştur</h3>
              <div className="grid gap-2">
                <Label htmlFor="manager-name">İş Ortağı Müdürü</Label>
                <Input id="manager-name" name="name" autoComplete="name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager-new-user">Kullanıcı</Label>
                <Input id="manager-new-user" name="username" autoComplete="off" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager-new-password">Şifre</Label>
                <PasswordField id="manager-new-password" name="password" autoComplete="new-password" />
              </div>
              <Button type="submit" variant="outline" disabled={pending !== null}>
                {pending === "manager-create" ? "Açılıyor…" : "Hesap Aç"}
              </Button>
            </form>
            ) : null}
          </section>

          <section className="grid content-start gap-4 rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)]">
            <div>
              <h2 className="font-display text-2xl tracking-tight">İş Ortağı</h2>
              <p className="mt-1 text-sm text-muted">
                Kullanıcı adınızı ya da kayıtlı adınızı yazın.
              </p>
            </div>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void enter(
                  "partner",
                  String(data.get("username") ?? "").trim() || fieldText("partner-user"),
                  String(data.get("password") ?? "") || fieldText("partner-password"),
                );
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="partner-user">Kullanıcı</Label>
                <Input id="partner-user" name="username" autoComplete="username" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-password">Şifre</Label>
                <PasswordField id="partner-password" name="password" autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={pending !== null}>
                {pending === "partner" ? "Giriliyor…" : "Giriş Yap"}
              </Button>
              {error ? <p className="text-sm text-bad">{error}</p> : null}
            </form>
            <Button
              type="button"
              variant="outline"
              disabled={pending !== null}
              onClick={() => setCreateOpen((current) => (current === "partner" ? null : "partner"))}
            >
              Hesap Oluştur
            </Button>
            {createOpen === "partner" ? (
            <form
              className="grid gap-4 border-t border-line pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                void createAccount(
                  "partner",
                  fieldText("partner-name"),
                  fieldText("partner-new-user"),
                  fieldText("partner-new-password"),
                );
              }}
            >
              <h3 className="font-medium">Hesap Oluştur</h3>
              <div className="grid gap-2">
                <Label htmlFor="partner-name">İş Ortağı</Label>
                <Input id="partner-name" name="name" autoComplete="name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-new-user">Kullanıcı</Label>
                <Input id="partner-new-user" name="username" autoComplete="off" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-new-password">Şifre</Label>
                <PasswordField id="partner-new-password" name="password" autoComplete="new-password" />
              </div>
              <Button type="submit" variant="outline" disabled={pending !== null}>
                {pending === "partner-create" ? "Açılıyor…" : "Hesap Aç"}
              </Button>
            </form>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
