"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import { Compass, LogOut, Menu, User, X } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function NavigationHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoggedIn = status === "authenticated" && Boolean(session?.user);

  return (
    <header className="sticky top-0 z-30 border-b border-[#eae4d9] bg-[#faf8f5]/90 backdrop-blur-md text-[#0f172a] shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#0f172a] group"
        >
          <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-tr from-[#ea580c] to-[#f97316] text-white shadow-md shadow-orange-500/20 transition-transform duration-300 group-hover:scale-105">
            <Compass className="size-5" />
          </span>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#ea580c] bg-clip-text text-transparent">
            Roamly
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <Link
            href="/"
            className={`transition-colors hover:text-[#ea580c] ${
              pathname === "/" ? "text-[#ea580c] font-bold" : ""
            }`}
          >
            Home
          </Link>
          <Link
            href="/plan"
            className={`transition-colors hover:text-[#ea580c] ${
              pathname === "/plan" ? "text-[#ea580c] font-bold" : ""
            }`}
          >
            Plan a trip
          </Link>
          <Link
            href="/trips"
            className={`transition-colors hover:text-[#ea580c] ${
              pathname.startsWith("/trips") ? "text-[#ea580c] font-bold" : ""
            }`}
          >
            Saved Trips
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-3 pl-3 border-l border-[#eae4d9]">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-[#f5f2ec] px-3.5 py-1.5 rounded-full border border-[#e4dfd6]">
                <User className="size-3.5 text-[#0d9488]" />
                <span>{session.user?.name || session.user?.email || "Explorer"}</span>
              </span>
              <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                size="default"
                className="bg-[#f5f2ec] hover:bg-[#eae4d9] text-slate-700 text-xs font-bold px-3.5 py-1.5 rounded-xl border border-[#e4dfd6]"
              >
                <LogOut className="size-3.5 text-slate-500" />
                <span>Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-3 border-l border-[#eae4d9]">
              <Button
                asChild
                size="default"
                className="bg-transparent hover:bg-[#f5f2ec] text-slate-700 text-xs font-bold rounded-xl"
              >
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button
                asChild
                size="default"
                className="bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02]"
              >
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle Navigation Menu"
          className="sm:hidden grid size-10 place-items-center rounded-xl border border-[#eae4d9] bg-white text-slate-700 shadow-xs active:bg-slate-100"
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Collapsible Navigation Menu Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[#eae4d9] bg-[#faf8f5] px-6 py-5 shadow-lg">
          <nav className="flex flex-col space-y-4 text-base font-semibold text-slate-700">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-xl transition-colors ${
                pathname === "/" ? "bg-[#ffedd5] text-[#ea580c] font-bold" : "hover:bg-[#f5f2ec]"
              }`}
            >
              Home
            </Link>
            <Link
              href="/plan"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-xl transition-colors ${
                pathname === "/plan" ? "bg-[#ffedd5] text-[#ea580c] font-bold" : "hover:bg-[#f5f2ec]"
              }`}
            >
              Plan a trip
            </Link>
            <Link
              href="/trips"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-xl transition-colors ${
                pathname.startsWith("/trips") ? "bg-[#ffedd5] text-[#ea580c] font-bold" : "hover:bg-[#f5f2ec]"
              }`}
            >
              Saved Trips
            </Link>

            <div className="pt-2 border-t border-[#eae4d9]">
              {isLoggedIn ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 bg-[#f5f2ec] px-4 py-2.5 rounded-xl border border-[#e4dfd6]">
                    <User className="size-4 text-[#0d9488]" />
                    <span className="truncate">{session.user?.name || session.user?.email || "Explorer"}</span>
                  </div>
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="w-full bg-[#f5f2ec] hover:bg-[#eae4d9] text-slate-700 text-sm font-bold py-3 rounded-xl border border-[#e4dfd6]"
                  >
                    <LogOut className="size-4 text-slate-500" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    asChild
                    size="lg"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full bg-white hover:bg-[#f5f2ec] text-slate-700 text-sm font-bold rounded-xl border border-[#eae4d9]"
                  >
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white text-sm font-bold rounded-xl shadow-md"
                  >
                    <Link href="/auth/signup">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
