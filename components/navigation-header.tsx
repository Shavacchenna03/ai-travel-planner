"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import { Compass, LogOut, User } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function NavigationHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isLoggedIn = status === "authenticated" && Boolean(session?.user);

  return (
    <header className="sticky top-0 z-20 border-b border-[#e4dfd6] bg-[#f7f5f1]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#16324f]">
          <Compass className="size-6 text-[#187764]" />
          <span>Roamly</span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6 text-sm font-semibold text-slate-600">
          <Link
            href="/"
            className={`transition-colors hover:text-[#16324f] ${pathname === "/" ? "text-[#16324f] font-bold" : ""}`}
          >
            Home
          </Link>
          <Link
            href="/plan"
            className={`transition-colors hover:text-[#16324f] ${pathname === "/plan" ? "text-[#16324f] font-bold" : ""}`}
          >
            Plan a trip
          </Link>
          <Link
            href="/trips"
            className={`transition-colors hover:text-[#16324f] ${pathname.startsWith("/trips") ? "text-[#187764] font-bold" : ""}`}
          >
            Saved Trips
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-300">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <User className="size-3.5 text-[#187764]" />
                <span>{session.user?.name || session.user?.email || "User"}</span>
              </span>
              <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5"
              >
                <LogOut className="size-3.5" />
                <span>Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-300">
              <Button asChild size="default" className="bg-transparent hover:bg-slate-200 text-slate-700 text-xs font-bold">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild size="default" className="bg-[#187764] hover:bg-[#126653] text-white text-xs font-bold">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
