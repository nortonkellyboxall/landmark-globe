/** SpaceCatalog — single source of truth for solar-system bodies. */

export const SPACE_BODIES = [
  {
    "id": "sun",
    "name": "The Sun",
    "place": "Centre of our solar system",
    "emoji": "☀️",
    "color": "#ffb703",
    "kind": "star",
    "size": 72,
    "story": "The Sun is a gigantic glowing star. It gives Earth light and warmth so plants can grow and we can play outside.",
    "wow": "More than one million Earths could fit inside the Sun!",
    "video": "VkW54j82e9U",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg/960px-The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Full_disk_of_the_Sun_%28eso1703e-comparisona%29.jpg/960px-Full_disk_of_the_Sun_%28eso1703e-comparisona%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/The_Sun_in_white_light.jpg/960px-The_Sun_in_white_light.jpg"
    ],
    "diameterKm": 1392700,
    "visual": {
      "size": 7.5,
      "emissive": 16747520,
      "style": "sun",
      "colorHex": 16758531
    }
  },
  {
    "id": "mercury",
    "name": "Mercury",
    "place": "1st planet from the Sun",
    "emoji": "☿️",
    "color": "#b0a99f",
    "kind": "planet",
    "size": 18,
    "story": "Mercury is the closest planet to the Sun. It is a small, rocky world that gets baking hot in the day and freezing at night.",
    "wow": "A year on Mercury is only about 88 Earth days — super speedy!",
    "video": "NWUsfud9PzM",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Mercury_in_color_-_Prockter07-edit1.jpg/960px-Mercury_in_color_-_Prockter07-edit1.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mercury_in_true_color.jpg/960px-Mercury_in_true_color.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Mercury_Globe-MESSENGER_mosaic_centered_at_180degE-0degN.jpg/960px-Mercury_Globe-MESSENGER_mosaic_centered_at_180degE-0degN.jpg"
    ],
    "diameterKm": 4879,
    "visual": {
      "size": 1.35,
      "orbit": 12,
      "speed": 1.6,
      "style": "rocky",
      "colorHex": 13682878
    },
    "au": 0.39,
    "orbitYears": 0.241
  },
  {
    "id": "venus",
    "name": "Venus",
    "place": "2nd planet from the Sun",
    "emoji": "♀️",
    "color": "#e9c46a",
    "kind": "planet",
    "size": 24,
    "story": "Venus is almost the same size as Earth, but it is wrapped in thick cloudy air that traps heat like a giant blanket.",
    "wow": "Venus is the hottest planet — even hotter than Mercury!",
    "video": "UciCLg8g_4Y",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Venus_-_December_23_2016.png/960px-Venus_-_December_23_2016.png",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Venus2.jpg/960px-Venus2.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/960px-Venus-real_color.jpg"
    ],
    "diameterKm": 12104,
    "visual": {
      "size": 1.85,
      "orbit": 16,
      "speed": 1.15,
      "style": "cloudy",
      "colorHex": 16044894
    },
    "au": 0.72,
    "orbitYears": 0.615
  },
  {
    "id": "earth",
    "name": "Earth",
    "place": "3rd planet from the Sun — our home!",
    "emoji": "🌍",
    "color": "#4cc9f0",
    "kind": "planet",
    "size": 26,
    "story": "Earth is our home planet. It has oceans, land, clouds, and just the right temperature for people, animals, and plants.",
    "wow": "Earth is the only planet we know with liquid oceans on the surface — and life!",
    "video": "IDhapt7nw4A",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/960px-The_Earth_seen_from_Apollo_17.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Blue_Marble_2002.png/960px-Blue_Marble_2002.png",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Earth_Eastern_Hemisphere.jpg/960px-Earth_Eastern_Hemisphere.jpg"
    ],
    "diameterKm": 12742,
    "visual": {
      "size": 2,
      "orbit": 20.5,
      "speed": 1,
      "style": "earth",
      "colorHex": 5032432
    },
    "au": 1,
    "orbitYears": 1
  },
  {
    "id": "moon",
    "name": "The Moon",
    "place": "Earth’s neighbour in space",
    "emoji": "🌕",
    "color": "#d9d9d9",
    "kind": "moon",
    "size": 14,
    "story": "The Moon is Earth’s special rocky friend. It circles around us and lights up the night when it catches sunlight.",
    "wow": "Footprints left by astronauts on the Moon can stay for millions of years!",
    "video": "JM21GBJecx0",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/960px-FullMoon2010.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Full_Moon_Luc_Viatour.jpg/960px-Full_Moon_Luc_Viatour.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/AS11-44-6551.jpg/960px-AS11-44-6551.jpg"
    ],
    "diameterKm": 3475,
    "visual": {
      "size": 0.85,
      "parent": "earth",
      "orbit": 3.4,
      "speed": 3.2,
      "style": "rocky",
      "colorHex": 15658734
    },
    "orbitYears": 0.075
  },
  {
    "id": "mars",
    "name": "Mars",
    "place": "4th planet from the Sun",
    "emoji": "🔴",
    "color": "#e76f51",
    "kind": "planet",
    "size": 22,
    "story": "Mars is the red planet. It has dusty deserts, giant volcanoes, and polar ice caps that look a little like Earth’s.",
    "wow": "Mars has the tallest volcano in the solar system — Olympus Mons!",
    "video": "Ruo_uZHeLls",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/960px-OSIRIS_Mars_true_color.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Tharsis_and_Valles_Marineris_-_Mars_Orbiter_Mission_%2830055660701%29.png/960px-Tharsis_and_Valles_Marineris_-_Mars_Orbiter_Mission_%2830055660701%29.png",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Mars_23_aug_2003_hubble.jpg/960px-Mars_23_aug_2003_hubble.jpg"
    ],
    "diameterKm": 6779,
    "visual": {
      "size": 1.55,
      "orbit": 25,
      "speed": 0.8,
      "style": "rocky",
      "colorHex": 15893596
    },
    "au": 1.52,
    "orbitYears": 1.881
  },
  {
    "id": "asteroids",
    "name": "Asteroid Belt",
    "place": "Between Mars and Jupiter",
    "emoji": "☄️",
    "color": "#adb5bd",
    "kind": "belt",
    "size": 28,
    "story": "The asteroid belt is a ring of rocky leftovers from when the planets were made. Most are much smaller than our Moon.",
    "wow": "If you gathered all the asteroids together, they would still be smaller than Earth’s Moon!",
    "video": "amhE6rN4OpU",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/8/89/243_ida_crop.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/e/e5/Eros_-_PIA02923_%28color%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Vesta_Full_MOC_mosaic.jpg/960px-Vesta_Full_MOC_mosaic.jpg"
    ],
    "diameterKm": 940,
    "visual": {
      "orbit": 29
    },
    "au": 2.7,
    "orbitYears": 4.6
  },
  {
    "id": "jupiter",
    "name": "Jupiter",
    "place": "5th planet from the Sun",
    "emoji": "🪐",
    "color": "#f4a261",
    "kind": "planet",
    "size": 48,
    "story": "Jupiter is the biggest planet — a giant ball of swirling gas with colourful stripes and a famous Big Red Spot storm.",
    "wow": "Jupiter is so big that all the other planets could fit inside it!",
    "video": "hz_fc69LdjY",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/c/c1/Jupiter_New_Horizons.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/d/dc/Hubble_Optical_Image_of_Jupiter_%282007-jupiter-more-2%29.jpg"
    ],
    "diameterKm": 139820,
    "visual": {
      "size": 4.6,
      "orbit": 35,
      "speed": 0.42,
      "style": "gas",
      "colorHex": 16032353
    },
    "au": 5.2,
    "orbitYears": 11.86
  },
  {
    "id": "saturn",
    "name": "Saturn",
    "place": "6th planet from the Sun",
    "emoji": "💍",
    "color": "#e9c46a",
    "kind": "planet",
    "size": 42,
    "story": "Saturn is a giant gas planet famous for its beautiful rings made of ice and rock — like a cosmic hula hoop!",
    "wow": "Saturn’s rings are huge, but they are surprisingly thin — like paper compared to the planet!",
    "video": "KjZf88aBGe8",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/960px-Saturn_during_Equinox.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Saturn_from_Cassini_Orbiter_%282004-10-06%29.jpg/960px-Saturn_from_Cassini_Orbiter_%282004-10-06%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/PIA17218_%E2%80%93_A_Farewell_to_Saturn%2C_Brightened_Version.jpg/960px-PIA17218_%E2%80%93_A_Farewell_to_Saturn%2C_Brightened_Version.jpg"
    ],
    "diameterKm": 116460,
    "visual": {
      "size": 4,
      "orbit": 43,
      "speed": 0.32,
      "rings": true,
      "style": "gas",
      "colorHex": 15847531
    },
    "au": 9.58,
    "orbitYears": 29.46
  },
  {
    "id": "uranus",
    "name": "Uranus",
    "place": "7th planet from the Sun",
    "emoji": "🌀",
    "color": "#90e0ef",
    "kind": "planet",
    "size": 32,
    "story": "Uranus is an icy blue-green giant that spins on its side, as if it rolled over and never got back up!",
    "wow": "A day on Uranus is only about 17 Earth hours — but a year lasts 84 Earth years!",
    "video": "63KonRAL6CA",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/960px-Uranus2.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/6/69/Uranus_Voyager2_color_calibrated.png",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Uranus_Voyager2_false_color.jpg/960px-Uranus_Voyager2_false_color.jpg"
    ],
    "diameterKm": 50724,
    "visual": {
      "size": 2.8,
      "orbit": 50,
      "speed": 0.22,
      "style": "ice",
      "colorHex": 9494767
    },
    "au": 19.2,
    "orbitYears": 84
  },
  {
    "id": "neptune",
    "name": "Neptune",
    "place": "8th planet from the Sun",
    "emoji": "🔵",
    "color": "#4361ee",
    "kind": "planet",
    "size": 30,
    "story": "Neptune is the farthest big planet from the Sun. It is a deep blue icy giant with wild winds and dark storms.",
    "wow": "Neptune has the fastest winds in the solar system — faster than a jet plane!",
    "video": "VM22MyLaRSs",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Neptune_Full.jpg/960px-Neptune_Full.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Neptune_Voyager2_color_calibrated.png/960px-Neptune_Voyager2_color_calibrated.png",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Neptune_-_Voyager_2_%2829347980845%29.png/960px-Neptune_-_Voyager_2_%2829347980845%29.png"
    ],
    "diameterKm": 49244,
    "visual": {
      "size": 2.7,
      "orbit": 56,
      "speed": 0.18,
      "style": "ice",
      "colorHex": 5999871
    },
    "au": 30.05,
    "orbitYears": 164.8
  },
  {
    "id": "comet",
    "name": "Comets",
    "place": "Visitors from the outer solar system",
    "emoji": "💫",
    "color": "#bde0fe",
    "kind": "comet",
    "size": 20,
    "story": "Comets are icy snowballs that grow a glowing tail when they swing near the Sun. They look like sparkly visitors in the night sky.",
    "wow": "A comet’s tail always points away from the Sun — like a windy scarf!",
    "video": "mQErMYDfw0Y",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Comet_Hale-Bopp_1995O1.jpg/960px-Comet_Hale-Bopp_1995O1.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Comet_Halley.jpg/960px-Comet_Halley.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Comet_67P_on_19_September_2014_NavCam_mosaic.jpg/960px-Comet_67P_on_19_September_2014_NavCam_mosaic.jpg"
    ],
    "diameterKm": 10,
    "visual": {
      "size": 1.1,
      "orbit": 62,
      "speed": 0.12,
      "eccentricity": 0.55,
      "style": "ice",
      "colorHex": 14218239
    },
    "au": 17,
    "orbitYears": 75
  }
];

export const EARTH_YEAR_SECONDS = 22;

function getBody(id) {
  return SPACE_BODIES.find((b) => b.id === id) || null;
}

export function diameterKm(bodyOrId) {
  const body = typeof bodyOrId === "string" ? getBody(bodyOrId) : bodyOrId;
  return (body && body.diameterKm) || 1000;
}

export function orbitSpinSeconds(years) {
  return Math.max(3.5, EARTH_YEAR_SECONDS * years);
}

export function labelName(body) {
  if (!body || !body.name) return "";
  if (body.id === "asteroids") return "Asteroids";
  if (body.id === "comet") return "Comet";
  return body.name.replace(/^The /, "");
}
