"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";
import type { Activity } from "@/lib/trip-schema";

type ActivityEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: Activity) => void;
  initialActivity?: Activity | null;
  dayNumber: number;
  currency: string;
};

export function ActivityEditorModal({
  isOpen,
  onClose,
  onSave,
  initialActivity,
  dayNumber,
  currency,
}: ActivityEditorModalProps) {
  const isEditing = Boolean(initialActivity);

  const [name, setName] = useState(initialActivity?.name || "");
  const [description, setDescription] = useState(initialActivity?.description || "");
  const [location, setLocation] = useState(initialActivity?.location || "");
  const [startTime, setStartTime] = useState(initialActivity?.startTime || "10:00 AM");
  const [duration, setDuration] = useState(initialActivity?.duration || "2 hours");
  const [estimatedCost, setEstimatedCost] = useState(
    initialActivity?.estimatedCost !== undefined ? String(initialActivity.estimatedCost) : "0"
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Activity title is required.";
    if (!description.trim()) newErrors.description = "Description is required.";
    if (!location.trim()) newErrors.location = "Location is required.";
    if (!startTime.trim()) newErrors.startTime = "Start time is required.";
    if (!duration.trim()) newErrors.duration = "Duration is required.";
    if (isNaN(Number(estimatedCost)) || Number(estimatedCost) < 0) {
      newErrors.estimatedCost = "Enter a valid cost (0 or greater).";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      location: location.trim(),
      startTime: startTime.trim(),
      duration: duration.trim(),
      estimatedCost: Number(estimatedCost),
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg card-warm p-6 sm:p-8 bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">
          {isEditing ? "Edit Activity" : `Add Activity to Day ${dayNumber}`}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {isEditing ? "Update details for this activity." : "Add a custom event or visit to your schedule."}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <FieldLabel htmlFor="activity-name">Activity Title</FieldLabel>
            <Input
              id="activity-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Visit Chapora Fort"
              required
            />
            <FieldError message={errors.name} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="activity-time">Start Time</FieldLabel>
              <Input
                id="activity-time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setErrors((prev) => ({ ...prev, startTime: "" }));
                }}
                placeholder="e.g. 10:00 AM"
                required
              />
              <FieldError message={errors.startTime} />
            </div>

            <div>
              <FieldLabel htmlFor="activity-duration">Duration</FieldLabel>
              <Input
                id="activity-duration"
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  setErrors((prev) => ({ ...prev, duration: "" }));
                }}
                placeholder="e.g. 2 hours"
                required
              />
              <FieldError message={errors.duration} />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="activity-location">Location / Landmark</FieldLabel>
            <Input
              id="activity-location"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setErrors((prev) => ({ ...prev, location: "" }));
              }}
              placeholder="e.g. Vagator Beach Road, Anjuna"
              required
            />
            <FieldError message={errors.location} />
          </div>

          <div>
            <FieldLabel htmlFor="activity-cost">Estimated Cost ({currency})</FieldLabel>
            <Input
              id="activity-cost"
              type="number"
              min="0"
              value={estimatedCost}
              onChange={(e) => {
                setEstimatedCost(e.target.value);
                setErrors((prev) => ({ ...prev, estimatedCost: "" }));
              }}
              placeholder="0"
              required
            />
            <FieldError message={errors.estimatedCost} />
          </div>

          <div>
            <FieldLabel htmlFor="activity-desc">Description & Tips</FieldLabel>
            <textarea
              id="activity-desc"
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((prev) => ({ ...prev, description: "" }));
              }}
              placeholder="Describe what to see, practical tips, or entrance details…"
              className="mt-2 w-full rounded-2xl border border-[#eae4d9] bg-white p-3.5 text-sm text-[#0f172a] shadow-xs outline-none transition-all placeholder:text-slate-400 focus:border-[#f97316] focus:ring-4 focus:ring-[#ffedd5] font-medium"
              required
            />
            <FieldError message={errors.description} />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#eae4d9] pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white text-xs font-bold rounded-xl shadow-md"
            >
              {isEditing ? "Save Changes" : "Add Activity"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
