"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Compass, Loader, MapPin, Sparkles, Tag, Users, Utensils } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/field";
import { accommodationPreferences, foodPreferences, travelStyles } from "@/lib/planner-options";
import type { Itinerary, TripRequest } from "@/lib/trip-schema";

type FormValues = {
  destination: string;
  budget: string;
  currency: TripRequest["currency"];
  duration: string;
  travelers: string;
  style: string;
  accommodation: string;
  food: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  destination: "",
  budget: "",
  currency: "INR",
  duration: "",
  travelers: "1",
  style: "",
  accommodation: "",
  food: "",
};

const loadingMessages = [
  "Searching destination highlights…",
  "Tailoring activities to your budget…",
  "Optimizing daily travel pace…",
  "Finalizing your personalized itinerary…",
];

export function TripPlanningForm() {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (!isSubmitting) return;
    const interval = window.setInterval(() => {
      setLoadingMessageIndex((index) => (index + 1) % loadingMessages.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [isSubmitting]);

  const update = (key: keyof FormValues) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError("");
  };

  function validate() {
    const next: FormErrors = {};
    if (values.destination.trim().length < 2) next.destination = "Please enter a destination.";
    if (!values.budget || Number(values.budget) <= 0) next.budget = "Enter a budget greater than zero.";
    if (!values.duration || Number(values.duration) < 1 || Number(values.duration) > 30)
      next.duration = "Choose between 1 and 30 days.";
    if (!values.travelers || Number(values.travelers) < 1 || Number(values.travelers) > 12)
      next.travelers = "Choose between 1 and 12 travelers.";
    if (!values.style) next.style = "Choose a travel style.";
    if (!values.accommodation) next.accommodation = "Choose an accommodation preference.";
    if (!values.food) next.food = "Choose a food preference.";
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsSubmitting(true);
    setFormError("");
    setLoadingMessageIndex(0);

    try {
      const requestBody = {
        ...values,
        budget: Number(values.budget),
        duration: Number(values.duration),
        travelers: Number(values.travelers),
      };

      const response = await fetch("/api/trips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json()) as {
        tripId?: string;
        itinerary?: Itinerary;
        error?: string;
        fieldErrors?: Record<string, string[]>;
      };

      if (!response.ok || !payload.itinerary) {
        if (payload.fieldErrors) {
          setErrors(
            Object.fromEntries(
              Object.entries(payload.fieldErrors).map(([key, messages]) => [key, messages?.[0]])
            ) as FormErrors
          );
        }
        setFormError(
          payload.error ?? "Something went wrong while creating your itinerary. Please try again."
        );
        return;
      }

      sessionStorage.setItem(
        "roamly-current-itinerary",
        JSON.stringify({ tripId: payload.tripId, itinerary: payload.itinerary, request: requestBody })
      );
      window.dispatchEvent(new Event("roamly-storage-update"));
      router.push("/plan/results");
    } catch {
      setFormError("We couldn’t reach the planning service. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="card-warm p-6 sm:p-10 border border-[#eae4d9] bg-white shadow-xl shadow-orange-500/5"
    >
      <div className="mb-8 pb-6 border-b border-[#eae4d9]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
          <Sparkles className="size-4 text-[#f97316]" />
          <span>Itinerary Creator</span>
        </div>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0f172a]">Trip Details</h2>
        <p className="mt-1 text-sm text-slate-500">
          Every preference helps personalize recommendations and meal spots.
        </p>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Destination & Budget */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="destination">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-[#f97316]" /> Destination
              </span>
            </FieldLabel>
            <Input
              id="destination"
              value={values.destination}
              onChange={update("destination")}
              placeholder="e.g. Goa, Manali, Jaipur, Kerala"
              aria-invalid={Boolean(errors.destination)}
            />
            <FieldError message={errors.destination} />
          </div>

          <div>
            <FieldLabel htmlFor="budget">Total trip budget</FieldLabel>
            <Input
              id="budget"
              type="number"
              min="1"
              value={values.budget}
              onChange={update("budget")}
              placeholder="e.g. 35000"
              aria-describedby="budget-help"
              aria-invalid={Boolean(errors.budget)}
            />
            <p id="budget-help" className="mt-1.5 text-xs text-slate-500">
              Total group limit in selected currency.
            </p>
            <FieldError message={errors.budget} />
          </div>

          <div>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <Select id="currency" value={values.currency} onChange={update("currency")}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </Select>
          </div>
        </div>

        {/* Duration & Travelers */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="duration">
              <span className="flex items-center gap-1.5">
                <Compass className="size-4 text-[#0d9488]" /> Duration (days)
              </span>
            </FieldLabel>
            <Input
              id="duration"
              type="number"
              min="1"
              max="30"
              value={values.duration}
              onChange={update("duration")}
              placeholder="e.g. 4"
              aria-invalid={Boolean(errors.duration)}
            />
            <FieldError message={errors.duration} />
          </div>

          <div>
            <FieldLabel htmlFor="travelers">
              <span className="flex items-center gap-1.5">
                <Users className="size-4 text-[#0d9488]" /> Travelers
              </span>
            </FieldLabel>
            <Input
              id="travelers"
              type="number"
              min="1"
              max="12"
              value={values.travelers}
              onChange={update("travelers")}
              aria-invalid={Boolean(errors.travelers)}
            />
            <FieldError message={errors.travelers} />
          </div>
        </div>

        {/* Preferences & Style */}
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            id="style"
            label="Travel style"
            icon={<Tag className="size-4 text-[#f59e0b]" />}
            value={values.style}
            onChange={update("style")}
            error={errors.style}
            options={travelStyles}
          />

          <SelectField
            id="accommodation"
            label="Accommodation"
            icon={<Compass className="size-4 text-[#f59e0b]" />}
            value={values.accommodation}
            onChange={update("accommodation")}
            error={errors.accommodation}
            options={accommodationPreferences}
          />

          <div className="sm:col-span-2">
            <SelectField
              id="food"
              label="Food preference"
              icon={<Utensils className="size-4 text-[#ea580c]" />}
              value={values.food}
              onChange={update("food")}
              error={errors.food}
              options={foodPreferences}
            />
          </div>
        </div>
      </div>

      {/* Error Callout */}
      {formError && (
        <div role="alert" className="mt-6 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200">
          {formError}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="mt-8 w-full bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 py-6 transition-all hover:scale-[1.01]"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader className="size-5 animate-spin" />
            <span>{loadingMessages[loadingMessageIndex]}</span>
          </span>
        ) : (
          "Generate Custom Itinerary"
        )}
      </Button>

      <p className="mt-4 text-center text-xs text-slate-500">
        Prices and activity timings are tailored estimates. Guaranteed entry & booking details remain subject to provider availability.
      </p>
    </form>
  );
}

function SelectField({
  id,
  label,
  icon,
  value,
  onChange,
  error,
  options,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  options: readonly string[];
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>
        <span className="flex items-center gap-1.5">
          {icon} {label}
        </span>
      </FieldLabel>
      <Select id={id} value={value} onChange={onChange} aria-invalid={Boolean(error)}>
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
      <FieldError message={error} />
    </div>
  );
}
