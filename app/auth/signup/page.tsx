"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

import { Compass, Loader } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const payload = await res.json();

      if (!res.ok) {
        if (payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        }
        setError(payload.error || "Failed to create account. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Account created -> automatically sign in
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!signInRes || signInRes.error) {
        router.push("/auth/signin?registered=true");
        return;
      }

      router.push("/trips");
      router.refresh();
    } catch (err) {
      console.error("Registration failed:", err);
      setError("Something went wrong while creating your account. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] px-4 py-8 sm:px-6 sm:py-12 text-[#0f172a] font-sans flex flex-col justify-center items-center">
      {/* Brand Logo */}
      <Link href="/" className="mb-6 sm:mb-8 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-[#0f172a] group">
        <span className="grid size-9 sm:size-10 place-items-center rounded-2xl bg-gradient-to-tr from-[#ea580c] to-[#f97316] text-white shadow-md shadow-orange-500/20 transition-transform duration-300 group-hover:scale-105">
          <Compass className="size-5 sm:size-6" />
        </span>
        <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[#0f172a] to-[#ea580c] bg-clip-text text-transparent">
          Roamly
        </span>
      </Link>

      <div className="w-full max-w-md card-warm p-5 sm:p-8 bg-white">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">Create your account</h1>
          <p className="mt-1.5 text-sm text-slate-600">Start planning and saving personalized travel itineraries.</p>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Alex Smith"
              required
            />
            <FieldError message={fieldErrors.name?.[0]} />
          </div>

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
            <FieldError message={fieldErrors.email?.[0]} />
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
              placeholder="At least 6 characters"
              required
            />
            <FieldError message={fieldErrors.password?.[0]} />
          </div>

          <div>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              placeholder="Re-enter password"
              required
            />
            <FieldError message={fieldErrors.confirmPassword?.[0]} />
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
                <span>Creating account…</span>
              </>
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>

        <div className="mt-8 border-t border-[#eae4d9] pt-6 text-center text-xs text-slate-600">
          Already have an account?{" "}
          <Link href="/auth/signin" className="font-bold text-[#ea580c] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
