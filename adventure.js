export function placesForContinent(continentId, landmarks, wonders) {
  const filterPack = (all) => {
    if (continentId === "northamerica") {
      return all.filter((l) => l.continent === "Americas" && l.lat >= 7);
    }
    if (continentId === "southamerica") {
      return all.filter((l) => l.continent === "Americas" && l.lat < 7);
    }
    const label = {
      africa: "Africa",
      asia: "Asia",
      europe: "Europe",
      oceania: "Oceania",
      antarctica: "Antarctica",
    }[continentId];
    if (!label) return [];
    return all.filter((l) => l.continent === label);
  };
  return [...filterPack(landmarks || []), ...filterPack(wonders || [])];
}
