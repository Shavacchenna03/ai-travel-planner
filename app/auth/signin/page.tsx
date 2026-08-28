"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";

import { Compass, Loader } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/field";
import { sanitizeCallbackUrl } from "@/lib/security";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#faf8f5]"><Loader className="size-8 animate-spin text-[#f97316]" /></div>}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setError("Invalid email or password. Please try again.");
        setIsSubmitting(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      console.error("Sign in failed:", err);
      setError("Something went wrong while signing in. Please try again.");
      setIsSubmitting(false);
    }
  }

  function handleGoogleSignIn() {
    setIsGoogleSubmitting(true);
    signIn("google", { callbackUrl });
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] px-6 py-12 text-[#0f172a] font-sans flex flex-col justify-center items-center">
      {/* Brand Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-[#0f172a] group">
        <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-tr from-[#ea580c] to-[#f97316] text-white shadow-md shadow-orange-500/20 transition-transform duration-300 group-hover:scale-105">
          <Compass className="size-6" />
        </span>
        <span className="text-2xl font-black bg-gradient-to-r from-[#0f172a] to-[#ea580c] bg-clip-text text-transparent">
          Roamly
        </span>
      </Link>

      <div className="w-full max-w-md card-warm p-6 sm:p-8 bg-white">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-600">Sign in to access your saved travel itineraries.</p>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {/* Google OAuth Button */}
        <Button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleSubmitting || isSubmitting}
          size="lg"
          className="w-full bg-white hover:bg-[#f5f2ec] text-[#0f172a] font-extrabold rounded-2xl border border-[#eae4d9] shadow-xs flex items-center justify-center gap-3 py-5 transition-all"
        >
          {isGoogleSubmitting ? (
            <Loader className="size-4 animate-spin text-[#ea580c]" />
          ) : (
            <svg className="size-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Continue with Google</span>
        </Button>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 border-t border-[#eae4d9]" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">or sign in with email</span>
          <div className="flex-1 border-t border-[#eae4d9]" />
        </div>

        {/* Email & Password Form */}
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || isGoogleSubmitting}
            size="lg"
            className="mt-6 w-full bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white font-extrabold rounded-2xl shadow-md shadow-orange-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader className="size-4 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-8 border-t border-[#eae4d9] pt-6 text-center text-xs text-slate-600">
          Don’t have an account yet?{" "}
          <Link href="/auth/signup" className="font-bold text-[#ea580c] hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
