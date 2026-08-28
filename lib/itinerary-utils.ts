import type { Activity, Itinerary, TripRequest } from "@/lib/trip-schema";

export type BudgetBreakdown = {
  activities: number;
  food: number;
  accommodation: number;
  transport: number;
  total: number;
  activitiesPercent: number;
  foodPercent: number;
  accommodationPercent: number;
  transportPercent: number;
};

// --- Time Parsing & Scheduling Utilities --- //

export function parseTimeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 540; // Default 09:00 AM

  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/);
  if (!match) return 540;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const modifier = match[3];

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function formatMinutesToTimeString(minutes: number): string {
  const normalizedMins = Math.max(0, minutes % 1440); // 24 hours wrap
  let hours = Math.floor(normalizedMins / 60);
  const mins = normalizedMins % 60;
  const modifier = hours >= 12 ? "PM" : "AM";

  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;

  const paddedMins = mins.toString().padStart(2, "0");
  const paddedHours = hours.toString().padStart(2, "0");

  return `${paddedHours}:${paddedMins} ${modifier}`;
}

export function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr) return 120; // Default 2 hours

  const clean = durationStr.toLowerCase().trim();

  // Match e.g. "2 hours", "1.5 hrs", "90 mins", "30 minutes"
  const hourMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:hour|hrs|hr|h)/);
  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 60);
  }

  const minMatch = clean.match(/(\d+)\s*(?:minute|min|m)/);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  return 120;
}

export function recalculateDaySchedule(activities: Activity[]): Activity[] {
  if (!activities || activities.length === 0) return [];

  return activities.map((activity, idx) => {
    if (idx === 0) {
      // Preserve first activity's start time if valid, else default to 09:00 AM
      const validStart = activity.startTime ? activity.startTime.trim() : "09:00 AM";
      return { ...activity, startTime: validStart };
    }

    const prevActivity = activities[idx - 1];
    const prevStartMins = parseTimeStringToMinutes(prevActivity.startTime);
    const prevDurationMins = parseDurationToMinutes(prevActivity.duration);
    const bufferMins = 30; // 30 mins buffer/transit time between activities

    const nextStartMins = prevStartMins + prevDurationMins + bufferMins;
    const nextStartTime = formatMinutesToTimeString(nextStartMins);

    return {
      ...activity,
      startTime: nextStartTime,
    };
  });
}

// --- Budget Breakdown Calculation --- //

export function calculateBudgetBreakdown(itinerary: Itinerary, _request?: TripRequest): BudgetBreakdown {
  let activities = 0;
  let food = 0;

  if (Array.isArray(itinerary?.dailyItinerary)) {
    for (const day of itinerary.dailyItinerary) {
      if (Array.isArray(day?.activities)) {
        for (const act of day.activities) {
          activities += Number(act?.estimatedCost) || 0;
        }
      }
      if (Array.isArray(day?.restaurants)) {
        for (const rest of day.restaurants) {
          food += Number(rest?.estimatedCost) || 0;
        }
      }
    }
  }

  const directTotal = activities + food;
  const currentTotal = itinerary.estimatedTotalCost || 0;
  const remaining = Math.max(0, currentTotal - directTotal);

  // Allocate 60% of remaining for accommodation, 40% for transport/local transit
  const accommodation = Math.round(remaining * 0.6);
  const transport = Math.round(remaining * 0.4);
  const total = activities + food + accommodation + transport;

  const denominator = total > 0 ? total : 1;
  const activitiesPercent = Math.round((activities / denominator) * 100);
  const foodPercent = Math.round((food / denominator) * 100);
  const accommodationPercent = Math.round((accommodation / denominator) * 100);
  const transportPercent = Math.max(0, 100 - (activitiesPercent + foodPercent + accommodationPercent));

  return {
    activities,
    food,
    accommodation,
    transport,
    total,
    activitiesPercent,
    foodPercent,
    accommodationPercent,
    transportPercent,
  };
}

// --- Re-calculation of Daily & Total Itinerary Costs --- //

export function recalculateItineraryCosts(itinerary: Itinerary): Itinerary {
  let runningActivitiesAndFoodTotal = 0;

  const updatedDays = itinerary.dailyItinerary.map((day) => {
    const activitiesTotal = (day.activities || []).reduce((sum, act) => sum + (Number(act.estimatedCost) || 0), 0);
    const restaurantsTotal = (day.restaurants || []).reduce((sum, rest) => sum + (Number(rest.estimatedCost) || 0), 0);
    const dailyTotal = activitiesTotal + restaurantsTotal;

    runningActivitiesAndFoodTotal += dailyTotal;

    return {
      ...day,
      dailyEstimatedCost: dailyTotal,
    };
  });

  // Maintain existing baseline for accommodation + transport
  const breakdown = calculateBudgetBreakdown(itinerary);
  const baseAccommodationAndTransport = breakdown.accommodation + breakdown.transport;
  const newTotal = runningActivitiesAndFoodTotal + baseAccommodationAndTransport;

  return {
    ...itinerary,
    dailyItinerary: updatedDays,
    estimatedTotalCost: newTotal,
  };
}

// --- Activity Manipulation Utilities --- //

export function reorderActivityInDay(
  itinerary: Itinerary,
  dayNumber: number,
  fromIndex: number,
  toIndex: number
): Itinerary {
  if (fromIndex === toIndex) return itinerary;

  const nextDays = itinerary.dailyItinerary.map((day) => {
    if (day.day !== dayNumber) return day;

    const nextActivities = [...day.activities];
    if (fromIndex < 0 || fromIndex >= nextActivities.length) return day;
    if (toIndex < 0 || toIndex >= nextActivities.length) return day;

    const [moved] = nextActivities.splice(fromIndex, 1);
    nextActivities.splice(toIndex, 0, moved);

    const rescheduledActivities = recalculateDaySchedule(nextActivities);

    return {
      ...day,
      activities: rescheduledActivities,
    };
  });

  return recalculateItineraryCosts({
    ...itinerary,
    dailyItinerary: nextDays,
  });
}

export function moveActivityBetweenDays(
  itinerary: Itinerary,
  sourceDayNumber: number,
  sourceIndex: number,
  targetDayNumber: number,
  targetIndex?: number
): Itinerary {
  if (sourceDayNumber === targetDayNumber && (targetIndex === undefined || sourceIndex === targetIndex)) {
    return itinerary;
  }

  const sourceDayObj = itinerary.dailyItinerary.find((d) => d.day === sourceDayNumber);
  if (!sourceDayObj || !sourceDayObj.activities[sourceIndex]) return itinerary;

  const activityToMove = sourceDayObj.activities[sourceIndex];

  const nextDays = itinerary.dailyItinerary.map((day) => {
    // Remove from source day
    if (day.day === sourceDayNumber) {
      const nextActivities = day.activities.filter((_, idx) => idx !== sourceIndex);
      return {
        ...day,
        activities: recalculateDaySchedule(nextActivities),
      };
    }

    // Add to target day
    if (day.day === targetDayNumber) {
      const nextActivities = [...day.activities];
      const insertAt = targetIndex !== undefined && targetIndex >= 0 ? targetIndex : nextActivities.length;
      nextActivities.splice(insertAt, 0, activityToMove);
      return {
        ...day,
        activities: recalculateDaySchedule(nextActivities),
      };
    }

    return day;
  });

  return recalculateItineraryCosts({
    ...itinerary,
    dailyItinerary: nextDays,
  });
}

export function moveActivityUp(itinerary: Itinerary, dayNumber: number, activityIndex: number): Itinerary {
  if (activityIndex <= 0) return itinerary;
  return reorderActivityInDay(itinerary, dayNumber, activityIndex, activityIndex - 1);
}

export function moveActivityDown(itinerary: Itinerary, dayNumber: number, activityIndex: number): Itinerary {
  const day = itinerary.dailyItinerary.find((d) => d.day === dayNumber);
  if (!day || activityIndex >= day.activities.length - 1) return itinerary;
  return reorderActivityInDay(itinerary, dayNumber, activityIndex, activityIndex + 1);
}
