"use client";

import { useState } from "react";
import Link from "next/link";
import { useLogin } from "./hooks";
import styles from "./Login.module.css";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 12.3 3 3 12.3 3 24s9.3 21 21 21 21-9.3 21-21c0-1.4-.1-2.7-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 16.1 3 9.2 7.5 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.3 26.7 37 24 37c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.1 40.4 16 45 24 45z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C36.9 39.1 45 33 45 24c0-1.4-.1-2.7-.4-3.5z"
    />
  </svg>
);

export default function LoginPage() {
  const [showCredForm, setShowCredForm] = useState(false);
  const [email, setEmail] = useState("demo@sonrat.ai");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [googleNote, setGoogleNote] = useState<string | null>(null);
  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({
        email: email || "demo@sonrat.ai",
        password: password || "Password123!",
      });
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className={styles.loginContainer}>
      <section className={styles.formPanel}>
        <div className={styles.contentWrapper}>
          <h2 className={styles.title}>Welcome!</h2>

          {!showCredForm ? (
            <div className={styles.credForm}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setGoogleNote("Google sign-in will be wired next. Use Login for demo access.");
                }}
                disabled={login.isPending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.625rem",
                  marginTop: 0,
                }}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className={styles.divider}>or</div>

              <button
                type="button"
                className={styles.loginButton}
                style={{ marginTop: 0 }}
                onClick={() => {
                  setShowCredForm(true);
                  setGoogleNote(null);
                  setError(null);
                }}
              >
                Login
              </button>

              {googleNote ? <div className={styles.errorMessage}>{googleNote}</div> : null}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.credForm}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@sonrat.ai"
                  disabled={login.isPending}
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password123!"
                  disabled={login.isPending}
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className={styles.loginButton} disabled={login.isPending}>
                {login.isPending ? "Signing in…" : "Sign in"}
              </button>

              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  setShowCredForm(false);
                  setError(null);
                }}
                disabled={login.isPending}
              >
                Back
              </button>

              {error ? <div className={styles.errorMessage}>{error}</div> : null}
            </form>
          )}

          <p className={styles.footNote}>Demo: demo@sonrat.ai / Password123!</p>
          <p className={styles.footNote} style={{ marginTop: "0.75rem" }}>
            No account?{" "}
            <Link href="/register" style={{ color: "#1662dd", textDecoration: "underline" }}>
              Register
            </Link>
          </p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.scopelyBadge} src="/sonrat-logo.png" alt="Sonrat" />
      </section>

      <aside className={styles.rightCard}>
        <div className={styles.rightCardInner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sonrat-logo.png"
            alt="Sonrat"
            className={`${styles.rightHeroLogo} ${styles.introHero}`}
          />
        </div>
      </aside>
    </div>
  );
}
