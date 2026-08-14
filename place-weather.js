const SNOW = new Set(["antarctica", "everest", "fuji", "aurora", "matterhorn"]);
const RAIN = new Set([
  "victoriafalls",
  "niagara",
  "amazon",
  "iguazu",
  "angelfalls",
  "halong",
  "milford",
]);

/** @param {{ id?: string } | null} place */
export function weatherForPlace(place) {
  if (!place || !place.id) return null;
  if (SNOW.has(place.id)) return "snow";
  if (RAIN.has(place.id)) return "rain";
  return null;
}
