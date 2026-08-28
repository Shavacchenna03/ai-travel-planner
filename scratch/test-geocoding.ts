import { geocodeDestination, getWeatherDataForTrip } from "../lib/weather";

async function runGeocodingVerification() {
  console.log("=== VERIFYING GEOLOCATION RESOLUTION FOR GOA & INTERNATIONAL DESTINATIONS ===\n");

  // Test 1: Goa with INR currency
  console.log("1. Testing 'Goa' with currency 'INR'...");
  const goaWeather = await getWeatherDataForTrip({
    destination: "Goa",
    duration: 3,
    currency: "INR",
  });

  console.log(`Mode: ${goaWeather.mode}`);
  console.log(`Resolved Destination: ${goaWeather.destination}`);
  console.log(`Lat: ${goaWeather.latitude}, Lon: ${goaWeather.longitude}`);
  console.log(`Timezone: ${goaWeather.timezone}`);

  const isGoaIndia =
    goaWeather.latitude != null &&
    goaWeather.latitude >= 14.0 &&
    goaWeather.latitude <= 16.0 &&
    goaWeather.longitude != null &&
    goaWeather.longitude >= 73.0 &&
    goaWeather.longitude <= 75.0;

  if (isGoaIndia) {
    console.log("✓ TEST 1 PASSED: 'Goa' successfully resolved to Goa, India (Lat ~15.29, Lon ~74.12)!\n");
  } else {
    console.error("✗ TEST 1 FAILED: 'Goa' resolved to incorrect location!\n");
    process.exit(1);
  }

  // Test 2: Explicit "Paris, France"
  console.log("2. Testing explicit 'Paris, France'...");
  const parisCoords = await geocodeDestination("Paris, France", "EUR");
  console.log(`Paris Coords: Lat: ${parisCoords?.latitude}, Lon: ${parisCoords?.longitude}`);

  if (parisCoords && parisCoords.latitude > 48.0 && parisCoords.latitude < 49.0) {
    console.log("✓ TEST 2 PASSED: 'Paris, France' resolved to Paris, France (Lat ~48.85)!\n");
  } else {
    console.error("✗ TEST 2 FAILED: 'Paris, France' resolution failed!\n");
    process.exit(1);
  }

  // Test 3: "Tokyo" with JPY currency
  console.log("3. Testing 'Tokyo' with currency 'JPY'...");
  const tokyoCoords = await geocodeDestination("Tokyo", "JPY");
  console.log(`Tokyo Coords: Lat: ${tokyoCoords?.latitude}, Lon: ${tokyoCoords?.longitude}`);

  if (tokyoCoords && tokyoCoords.latitude > 35.0 && tokyoCoords.latitude < 36.0) {
    console.log("✓ TEST 3 PASSED: 'Tokyo' resolved to Tokyo, Japan (Lat ~35.67)!\n");
  } else {
    console.error("✗ TEST 3 FAILED: 'Tokyo' resolution failed!\n");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("ALL GEOLOCATION VERIFICATION TESTS PASSED 100%!");
  console.log("==================================================");
}

runGeocodingVerification();
