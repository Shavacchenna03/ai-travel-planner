import type { SVGProps } from "react";

type WeatherIconProps = SVGProps<SVGSVGElement> & {
  weatherCode?: number | null;
  condition?: string;
};

export function WeatherIcon({ weatherCode, condition, className = "size-5", ...props }: WeatherIconProps) {
  const code = weatherCode ?? -1;
  const cond = (condition || "").toLowerCase();

  // Clear / Sunny (0, 1)
  if (code === 0 || code === 1 || cond.includes("clear") || cond.includes("sunny")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  }

  // Partly Cloudy (2)
  if (code === 2 || cond.includes("partly cloudy")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
        <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41" />
        <path d="M15.9 11.5A5.5 5.5 0 0 0 5 13a4.5 4.5 0 0 0 4 6.5h7a4.5 4.5 0 0 0 .9-8.9" />
      </svg>
    );
  }

  // Thunderstorm (95, 96, 99)
  if (code >= 95 || cond.includes("thunderstorm") || cond.includes("hail")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        <polyline points="13 14 11 18 14 18 12 22" />
      </svg>
    );
  }

  // Rain / Drizzle / Showers (51-67, 80-82)
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <path d="M16 14v6M12 16v6M8 14v6" />
      </svg>
    );
  }

  // Snow (71-77, 85-86)
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86) || cond.includes("snow")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <path d="M8 15h.01M12 18h.01M16 15h.01M10 21h.01M14 21h.01" />
      </svg>
    );
  }

  // Fog (45, 48)
  if (code === 45 || code === 48 || cond.includes("fog")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
        <path d="M5 10h14M3 14h18M7 18h10" />
        <path d="M4 8a6 6 0 0 1 11.71-2.1A4.5 4.5 0 0 1 18.5 10" />
      </svg>
    );
  }

  // Default: Cloud (3)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}
