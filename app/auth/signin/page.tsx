"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";

import { Compass, Loader } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#f7f5f1]"><Loader className="size-8 animate-spin text-[#187764]" /></div>}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/trips";

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

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      console.error("Sign in failed:", err);
      setError("Something went wrong while signing in. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f1] px-6 py-12 text-slate-800 sm:px-10 flex flex-col justify-center items-center">
      {/* Brand Header */}
      <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold text-[#16324f]">
        <Compass className="size-8 text-[#187764]" />
        <span>Roamly</span>
      </Link>

      <div className="w-full max-w-md rounded-3xl border border-[#e8e3db] bg-white p-6 sm:p-8 shadow-[0_18px_55px_-35px_rgba(22,50,79,0.3)]">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#16324f]">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to access your saved travel itineraries.</p>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-200">
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
            className="mt-6 w-full bg-[#187764] hover:bg-[#126653] text-white shadow-xs font-bold"
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

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-600">
          Don’t have an account yet?{" "}
          <Link href="/auth/signup" className="font-bold text-[#187764] hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
