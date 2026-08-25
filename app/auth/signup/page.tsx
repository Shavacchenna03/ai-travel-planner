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
    <main className="min-h-screen bg-[#f7f5f1] px-6 py-12 text-slate-800 sm:px-10 flex flex-col justify-center items-center">
      {/* Brand Header */}
      <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold text-[#16324f]">
        <Compass className="size-8 text-[#187764]" />
        <span>Roamly</span>
      </Link>

      <div className="w-full max-w-md rounded-3xl border border-[#e8e3db] bg-white p-6 sm:p-8 shadow-[0_18px_55px_-35px_rgba(22,50,79,0.3)]">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#16324f]">Create your account</h1>
          <p className="mt-2 text-sm text-slate-600">Start planning and saving personalized travel itineraries.</p>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-200">
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
            className="mt-6 w-full bg-[#187764] hover:bg-[#126653] text-white shadow-xs font-bold"
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

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-600">
          Already have an account?{" "}
          <Link href="/auth/signin" className="font-bold text-[#187764] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
