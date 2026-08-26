export function getWeatherConditionFromCode(code: number | null | undefined): string {
  if (code === null || code === undefined) {
    return "Variable Weather";
  }

  switch (code) {
    case 0:
      return "Clear Sky";
    case 1:
      return "Mainly Clear";
    case 2:
      return "Partly Cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Foggy";
    case 51:
      return "Light Drizzle";
    case 53:
      return "Moderate Drizzle";
    case 55:
      return "Dense Drizzle";
    case 56:
    case 57:
      return "Freezing Drizzle";
    case 61:
      return "Slight Rain";
    case 63:
      return "Moderate Rain";
    case 65:
      return "Heavy Rain";
    case 66:
    case 67:
      return "Freezing Rain";
    case 71:
      return "Slight Snow";
    case 73:
      return "Moderate Snow";
    case 75:
      return "Heavy Snow";
    case 77:
      return "Snow Grains";
    case 80:
      return "Light Rain Showers";
    case 81:
      return "Moderate Rain Showers";
    case 82:
      return "Violent Rain Showers";
    case 85:
    case 86:
      return "Snow Showers";
    case 95:
      return "Thunderstorm";
    case 96:
    case 99:
      return "Thunderstorm with Hail";
    default:
      return "Partly Cloudy";
  }
}
