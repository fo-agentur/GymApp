"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail, validateUsername, validatePassword } from "@/lib/username";
import { TOK, TYPE, ACCENT, Btn } from "@/lib/design";

export default function SignInPage() {
  const router = useRouter();
  const db = React.useMemo(() => createClient(), []);
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setError(null);
    const uErr = validateUsername(username);
    if (uErr) return setError(uErr);
    const pErr = validatePassword(password);
    if (pErr) return setError(pErr);

    setBusy(true);
    const email = usernameToEmail(username);
    try {
      if (mode === "signup") {
        const { error } = await db.auth.signUp({ email, password });
        if (error) {
          setError(humanError(error.message));
          return;
        }
        // Email confirmation must be disabled in Supabase for instant login.
        const signin = await db.auth.signInWithPassword({ email, password });
        if (signin.error) {
          setError(
            signin.error.message.toLowerCase().includes("not confirmed")
              ? "Account created, but e-mail confirmation is still ON in Supabase. Ask the admin to turn it off (Auth → Providers → Email → Confirm email)."
              : humanError(signin.error.message)
          );
          return;
        }
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) {
          setError(humanError(error.message));
          return;
        }
      }
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 52,
    padding: "0 16px",
    background: TOK.surface,
    border: "none",
    borderRadius: 12,
    color: TOK.text,
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 500,
    letterSpacing: "-0.01em",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div className="stage">
      <div className="phone">
        <div className="phone-dynamic-island" />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: TOK.bg,
            display: "flex",
            flexDirection: "column",
            padding: "60px 28px 40px",
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: TOK.text, letterSpacing: "-0.04em", lineHeight: 1 }}>
                GymApp
              </div>
              <div style={{ fontSize: 13, color: TOK.dim, marginTop: 14, letterSpacing: "-0.01em" }}>
                The strength tracker that respects your data.
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy) submit();
              }}
            >
              <label style={{ ...TYPE.col, color: TOK.dim, marginBottom: 8, display: "block" }}>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourname"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={inputStyle}
              />
              <div style={{ height: 12 }} />
              <label style={{ ...TYPE.col, color: TOK.dim, marginBottom: 8, display: "block" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />

              {error && (
                <div style={{ fontSize: 12, color: TOK.fail, marginTop: 12, lineHeight: 1.5 }}>{error}</div>
              )}

              <div style={{ height: 16 }} />
              <Btn variant="primary" size="lg" full accent={ACCENT} type="submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Btn>
            </form>

            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: TOK.muted,
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 500,
                padding: 8,
                marginTop: 18,
                textAlign: "center",
              }}
            >
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
        <div className="home-indicator" />
      </div>
    </div>
  );
}

function humanError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Wrong username or password.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "That username is taken. Try signing in instead.";
  if (m.includes("not confirmed")) return "E-mail confirmation is enabled — ask the admin to disable it.";
  return msg;
}
