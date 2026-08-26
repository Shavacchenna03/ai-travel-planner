"use client";

import { useState } from "react";
import { Loader, Sparkles } from "@/components/icons";
import { Button } from "@/components/ui/button";

type AIRegenerateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (instruction?: string) => Promise<void>;
  target: "activity" | "day";
  targetTitle: string;
  dayNumber: number;
};

export function AIRegenerateModal({
  isOpen,
  onClose,
  onConfirm,
  target,
  targetTitle,
  dayNumber,
}: AIRegenerateModalProps) {
  const [instruction, setInstruction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleRegenerate() {
    setIsSubmitting(true);
    setError("");
    try {
      await onConfirm(instruction.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      console.error("AI Regeneration Error:", err);
      setError(err instanceof Error ? err.message : "Couldn't generate a replacement. Your existing plan is unchanged.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md card-warm p-6 sm:p-8 bg-white shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#ea580c]">
          <Sparkles className="size-4 text-[#f97316]" />
          <span>AI Partial Regeneration</span>
        </div>

        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0f172a]">
          {target === "activity" ? "Regenerate Activity" : `Regenerate Day ${dayNumber}`}
        </h3>
        
        <p className="mt-1.5 text-xs font-semibold text-slate-500">
          Target: <span className="text-[#0f172a]">{targetTitle}</span>
        </p>

        <p className="mt-3 text-xs text-slate-600 leading-relaxed">
          {target === "activity"
            ? "AI will replace only this activity. The rest of your trip and day schedule will remain untouched."
            : `AI will regenerate Day ${dayNumber}'s itinerary. All other days in your trip will remain unchanged.`}
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="ai-instruction" className="block text-xs font-bold text-[#0f172a] mb-1.5">
            Optional Instructions for AI
          </label>
          <textarea
            id="ai-instruction"
            rows={3}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={isSubmitting}
            placeholder={
              target === "activity"
                ? "e.g. Find something more relaxed, less crowded, or family-friendly…"
                : "e.g. Focus on coastal beaches, local seafood, and scenic sunsets…"
            }
            className="w-full rounded-2xl border border-[#eae4d9] bg-white p-3 text-xs text-[#0f172a] shadow-xs outline-none transition-all placeholder:text-slate-400 focus:border-[#ea580c] focus:ring-4 focus:ring-[#ffedd5] font-medium"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#eae4d9] pt-4">
          <Button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRegenerate}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white text-xs font-extrabold rounded-xl shadow-md"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader className="size-3.5 animate-spin" />
                <span>Generating Replacement…</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                <span>Generate Replacement</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
