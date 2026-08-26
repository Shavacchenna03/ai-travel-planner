"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      window.location.href = callbackUrl;
    } catch (err) {
      console.error("Sign in failed:", err);
      setError("Something went wrong while signing in. Please try again.");
      setIsSubmitting(false);
    }
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
            disabled={isSubmitting}
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
