const fs = require("fs");
const path = require("path");

// Path to your airports file
const airportsFile = path.join(__dirname, "../assets/airports.dat.txt");

// Parse airports.dat file
function loadAirports() {
  const text = fs.readFileSync(airportsFile, "utf8");
  const lines = text.split("\n");

  const airports = [];

  for (let line of lines) {
    // CSV with quotes and commas
    const cols = line.split(",");

    if (cols.length < 8) continue;

    const id = cols[0];
    const name = cols[1].replace(/"/g, "");
    const city = cols[2].replace(/"/g, "");
    const country = cols[3].replace(/"/g, "");
    const iata = cols[4].replace(/"/g, "");
    const icao = cols[5].replace(/"/g, "");
    const latitude = parseFloat(cols[6]);
    const longitude = parseFloat(cols[7]);

    // Skip airports without valid IATA codes
    if (!iata || iata === "\\N") continue;

    airports.push({
      id,
      name,
      city,
      country,
      iata,
      icao,
      latitude,
      longitude,
    });
  }

  return airports;
}

// Haversine Formula
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Get nearest airport
function findNearestAirport(userLat, userLon) {
  let nearest = null;
  let minDistance = Infinity;

  const airportList = loadAirports();

  for (const ap of airportList) {
    const dist = haversine(userLat, userLon, ap.latitude, ap.longitude);

    if (dist < minDistance) {
      minDistance = dist;
      nearest = { ...ap, distance_km: dist };
    }
  }

  return nearest;
}

// Get multiple nearest airports (optional)
function findNearestAirports(userLat, userLon, count = 5) {
  const airportList = loadAirports();

  const ranked = airportList
    .map((ap) => ({
      ...ap,
      distance_km: haversine(userLat, userLon, ap.latitude, ap.longitude),
    }))
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, count);

  return ranked;
}

function getAirportByIATA(iataCode) {
  const airportList = loadAirports();

  return (
    airportList.find(
      (ap) => ap.iata.toUpperCase() === iataCode.toUpperCase()
    ) || null
  );
}

module.exports = {
  findNearestAirport,
  findNearestAirports,
  getAirportByIATA,
};
