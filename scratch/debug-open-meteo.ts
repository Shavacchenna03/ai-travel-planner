async function debugGoaCities() {
  const queries = ["Panaji", "Panjim", "Goa Velha", "North Goa", "Margao", "State of Goa"];
  for (const q of queries) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=2&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`\n=== QUERY: "${q}" ===`);
    console.log(JSON.stringify(data.results?.[0], null, 2));
  }
}

debugGoaCities();
