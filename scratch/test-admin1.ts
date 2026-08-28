async function testAdmin1Search() {
  const url = "https://geocoding-api.open-meteo.com/v1/search?name=Goa&count=50&language=en&format=json";
  const res = await fetch(url);
  const data = await res.json();
  const results = data.results || [];
  console.log(`Total results for "Goa": ${results.length}`);
  for (const r of results) {
    console.log(`- Name: "${r.name}", Country: ${r.country} (${r.country_code}), Admin1: "${r.admin1}", Feature: ${r.feature_code}, Lat: ${r.latitude}, Lon: ${r.longitude}, Pop: ${r.population}`);
  }
}

testAdmin1Search();
