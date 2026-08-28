"use client";

import Link from "next/link";
import { useState } from "react";
import { Compass } from "@/components/icons";

export function Footer() {
  const [copied, setCopied] = useState(false);

  function handleEmailClick() {
    navigator.clipboard.writeText("shavacchenna@gmail.com").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      // Ignore clipboard write errors
    });
  }

  return (
    <footer className="border-t border-[#eae4d9] bg-[#f5f2ec] text-[#0f172a]">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#e4dfd6]">
          {/* Brand & Subtitle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-tr from-[#ea580c] to-[#f97316] text-white shadow-xs">
                <Compass className="size-4" />
              </span>
              <span className="text-xl font-extrabold tracking-tight text-[#0f172a]">
                Roamly
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600 max-w-md">
              Considered personal travel itineraries tailored to your pace, budget, and weather outlook.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-700">
            <Link href="/" className="hover:text-[#ea580c] transition-colors">
              Home
            </Link>
            <Link href="/plan" className="hover:text-[#ea580c] transition-colors">
              Plan a Trip
            </Link>
            <Link href="/trips" className="hover:text-[#ea580c] transition-colors">
              Saved Trips
            </Link>
          </div>
        </div>

        {/* Bottom Bar & Developer Credit */}
        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <p className="text-slate-500 font-medium">
            © {new Date().getFullYear()} Roamly. All rights reserved.
          </p>

          {/* Developer Contact Credit */}
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Developed By
            </span>
            <p className="font-extrabold text-slate-800 text-xs">Shavac Chenna</p>
            <a
              href="mailto:shavacchenna@gmail.com"
              onClick={handleEmailClick}
              className="text-[#0d9488] hover:text-[#0f766e] font-semibold transition-colors underline block mt-0.5"
              title="Click to send email or copy address"
            >
              {copied ? "Copied: shavacchenna@gmail.com" : "shavacchenna@gmail.com"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
