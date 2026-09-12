const SNOW = new Set([
  "antarctica",
  "everest",
  "fuji",
  "aurora",
  "matterhorn",
  "iceland",
  "norway",
  "finland",
  "sweden",
  "canada",
]);
const RAIN = new Set([
  "victoriafalls",
  "niagara",
  "amazon",
  "iguazu",
  "angelfalls",
  "halong",
  "milford",
  "greatbarrier",
  "yellowstone",
]);

/** @param {{ id?: string, weather?: string } | null} place */
export function weatherForPlace(place) {
  if (!place) return null;
  if (place.weather === "snow" || place.weather === "rain") return place.weather;
  if (!place.id) return null;
  if (SNOW.has(place.id)) return "snow";
  if (RAIN.has(place.id)) return "rain";
  return null;
}
