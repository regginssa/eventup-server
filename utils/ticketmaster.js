// Category mapping: Ticketmaster segment names → Custom categories
const CATEGORY_MAP = {
  music: "music_and_concerts",
  "music & concerts": "music_and_concerts",
  "arts & theatre": "arts_and_culture",
  arts: "arts_and_culture",
  theatre: "arts_and_culture",
  "arts & culture": "arts_and_culture",
  festival: "festivals",
  festivals: "festivals",
  sports: "sports_and_fitness",
  "sports & fitness": "sports_and_fitness",
  fitness: "sports_and_fitness",
};

// Subcategory mappings for each category
const SUBCATEGORY_MAPS = {
  music_and_concerts: {
    pop: "pop",
    rock: "rock",
    jazz: "jazz",
    blues: "blues",
    electronic: "electronic/edm",
    edm: "electronic/edm",
    classical: "classical",
    "hip hop": "hip_hop/rap",
    rap: "hip_hop/rap",
    "r&b": "r&b/soul",
    soul: "r&b/soul",
    country: "country/folk",
    folk: "country/folk",
    reggae: "reggae/ska",
    ska: "reggae/ska",
    indie: "indie/alternative",
    alternative: "indie/alternative",
    metal: "metal/punk",
    punk: "metal/punk",
    "k-pop": "k-pop/j-pop",
    "j-pop": "k-pop/j-pop",
    world: "world/ethnic",
    ethnic: "world/ethnic",
    experimental: "experimental/avant-garde",
    "avant-garde": "experimental/avant-garde",
    ambient: "ambient/chillout",
    chillout: "ambient/chillout",
    tribute: "tribute_bands",
    concert: "live_concert",
    festival: "music_festival",
    dj: "dj_set/club_night",
    club: "dj_set/club_night",
    listening: "listening_session",
    "open mic": "open_mic",
    street: "street_performance",
    album: "album_release/listening_party",
    karaoke: "karaoke_night",
  },
  arts_and_culture: {
    theater: "theater/plays",
    theatre: "theater/plays",
    plays: "theater/plays",
    musical: "musicals",
    musicals: "musicals",
    ballet: "ballet",
    opera: "opera",
    "spoken word": "spoken_word/poetry",
    poetry: "spoken_word/poetry",
    "classical music": "classical_music_concerts",
    art: "art_exhibitions/gallery_openings",
    exhibition: "art_exhibitions/gallery_openings",
    gallery: "art_exhibitions/gallery_openings",
    film: "film_screenings/short_films",
    screening: "film_screenings/short_films",
    cultural: "cultural_festivals",
    literary: "literary_events/book_signings",
    book: "literary_events/book_signings",
    comedy: "stand-up_comedy/improv",
    improv: "stand-up_comedy/improv",
    circus: "circus/acrobatics",
    acrobatics: "circus/acrobatics",
    puppetry: "puppetry/shadow_theater",
    shadow: "puppetry/shadow_theater",
    historical: "historical_reenactments",
    reenactment: "historical_reenactments",
    dance: "traditional_dance_performances",
    traditional: "traditional_dance_performances",
  },
  festivals: {
    music: "music_festivals",
    food: "food_and_drink_festivals",
    drink: "food_and_drink_festivals",
    wine: "wine/beer/spirits_tastings",
    beer: "wine/beer/spirits_tastings",
    spirits: "wine/beer/spirits_tastings",
    tasting: "wine/beer/spirits_tastings",
    cultural: "cultural/heritage_festivals",
    heritage: "cultural/heritage_festivals",
    film: "film_festivals",
    art: "art_festivals",
    fashion: "fashion_festivals",
    religious: "religious_festivals",
    literature: "literature/book_festivals",
    book: "literature/book_festivals",
    light: "light/lantern_festivals",
    lantern: "light/lantern_festivals",
    street: "street_festivals",
    carnival: "carnival/parade",
    parade: "carnival/parade",
    fireworks: "fireworks/pyro_festivals",
    pyro: "fireworks/pyro_festivals",
    eco: "eco/sustainability_festivals",
    sustainability: "eco/sustainability_festivals",
    technology: "technology/innovation_festivals",
    innovation: "technology/innovation_festivals",
    lgbtq: "lgbtq+_pride_events",
    pride: "lgbtq+_pride_events",
  },
  sports_and_fitness: {
    football: "football/soccer",
    soccer: "football/soccer",
    basketball: "basketball",
    volleyball: "volleyball",
    baseball: "baseball",
    hockey: "ice_hockey",
    "ice hockey": "ice_hockey",
    rugby: "rugby",
    cricket: "cricket",
    f1: "f1/motorsport",
    motorsport: "f1/motorsport",
    tennis: "tennis",
    golf: "golf",
    mma: "mma/boxing",
    boxing: "mma/boxing",
    "e-sports": "e-sports",
    esports: "e-sports",
    league: "local_league_matches",
    youth: "youth_sports",
    friendly: "friendly_games",
    marathon: "marathon",
    "half-marathon": "half-marathon",
    "10k": "10k/5k_run",
    "5k": "10k/5k_run",
    trail: "trail_running",
    obstacle: "obstacle_race",
    triathlon: "triathlon",
    cycling: "cycling",
    swimming: "swimming",
    rowing: "rowing",
    surfing: "surfing",
    sailing: "sailing/yacht",
    yacht: "sailing/yacht",
    "jet ski": "jet_ski",
    yoga: "yoga",
    bootcamp: "bootcamp",
    zumba: "zumba",
    crossfit: "crossfit",
    bodybuilding: "bodybuilding",
    wellness: "wellness_retreat",
    retreat: "wellness_retreat",
    climbing: "climbing",
    paragliding: "paragliding/skydiving",
    skydiving: "paragliding/skydiving",
    paintball: "paintball/laser_tag",
    "laser tag": "paintball/laser_tag",
    archery: "archery",
  },
};

// Vibe mappings
const VIBE_MAPS = {
  music_and_concerts: {
    chill: "chill_and_relaxed",
    relaxed: "chill_and_relaxed",
    "high-energy": "high-energy_and_loud",
    loud: "high-energy_and_loud",
    energetic: "high-energy_and_loud",
    intimate: "intimate_and_acoustic",
    acoustic: "intimate_and_acoustic",
    party: "party/dance",
    dance: "party/dance",
  },
  arts_and_culture: {
    refined: "refined_and_elegant",
    elegant: "refined_and_elegant",
    creative: "creative_and_expressive",
    expressive: "creative_and_expressive",
    intellectual: "intellectual_and_thought-provoking",
    "thought-provoking": "intellectual_and_thought-provoking",
    social: "chill_and_social",
  },
  festivals: {
    vibrant: "vibrant_and_festive",
    festive: "vibrant_and_festive",
    community: "community_and_social",
    cultural: "cultural_and_traditional",
    traditional: "cultural_and_traditional",
    "family-friendly": "family-friendly",
    family: "family-friendly",
    nightlife: "nightlife_and_energetic",
  },
  sports_and_fitness: {
    competitive: "competitive",
    active: "active_and_energetic",
    energetic: "active_and_energetic",
    fun: "fun_and_social",
    social: "fun_and_social",
    wellness: "wellness_and_mindful",
    mindful: "wellness_and_mindful",
  },
};

// Venue type mappings
const VENUE_MAPS = {
  music_and_concerts: {
    stadium: "stadium",
    "concert hall": "concert_hall",
    hall: "concert_hall",
    club: "club/lounge",
    lounge: "club/lounge",
    outdoor: "outdoor/park",
    park: "outdoor/park",
    beach: "beach/boat_party",
    boat: "beach/boat_party",
    rooftop: "rooftop",
  },
  arts_and_culture: {
    theater: "theater",
    theatre: "theater",
    gallery: "art_gallery",
    museum: "museum",
    cinema: "cinema",
    "cultural center": "cultural_center",
    center: "cultural_center",
    stage: "outdoor_stage",
  },
  festivals: {
    outdoor: "outdoor/park",
    park: "outdoor/park",
    street: "street",
    stadium: "stadium",
    waterfront: "waterfront",
    exhibition: "exhibition_ground",
    ground: "exhibition_ground",
  },
  sports_and_fitness: {
    stadium: "stadium",
    arena: "sports_arena",
    gym: "gym/studio",
    studio: "gym/studio",
    track: "outdoor_track",
    beach: "beach",
    mountain: "mountain/trail",
    trail: "mountain/trail",
    waterfront: "waterfront",
  },
};

/**
 * Normalize string for matching (lowercase, trim, remove special chars)
 */
const normalizeString = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "");
};

/**
 * Find best match in a map
 */
const findBestMatch = (value, map) => {
  if (!value) return null;
  const normalized = normalizeString(value);

  // Exact match first
  if (map[normalized]) return map[normalized];

  // Partial match
  for (const [key, mappedValue] of Object.entries(map)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return mappedValue;
    }
  }

  return null;
};

/**
 * Map Ticketmaster classifications to custom event types
 * @param {Array} classifications - Array of classification objects from Ticketmaster
 * @returns {Object} Mapped classifications with category, subcategories, vibe, venue
 */
const mapClassifications = (classifications) => {
  if (
    !classifications ||
    !Array.isArray(classifications) ||
    classifications.length === 0
  ) {
    return {
      category: "other",
      subcategories: [],
      vibe: [],
      venue: [],
    };
  }

  // Determine category from segment
  let category = "other";
  const segmentName = classifications[0]?.segment?.name;
  if (segmentName) {
    const normalizedSegment = normalizeString(segmentName);
    category = CATEGORY_MAP[normalizedSegment] || "other";

    // Try partial matching for category
    if (category === "other") {
      for (const [key, value] of Object.entries(CATEGORY_MAP)) {
        if (
          normalizedSegment.includes(key) ||
          key.includes(normalizedSegment)
        ) {
          category = value;
          break;
        }
      }
    }
  }

  // Map subcategories
  const subcategories = [];
  const subcategoryMap = SUBCATEGORY_MAPS[category] || {};
  classifications.forEach((classification) => {
    const genreName = classification?.genre?.name;
    if (genreName) {
      const mapped = findBestMatch(genreName, subcategoryMap);
      if (mapped && !subcategories.includes(mapped)) {
        subcategories.push(mapped);
      }
    }
  });

  // Map vibes
  const vibes = [];
  const vibeMap = VIBE_MAPS[category] || {};
  classifications.forEach((classification) => {
    const subGenreName = classification?.subGenre?.name;
    if (subGenreName) {
      const mapped = findBestMatch(subGenreName, vibeMap);
      if (mapped && !vibes.includes(mapped)) {
        vibes.push(mapped);
      }
    }
  });

  // Map venues
  const venues = [];
  const venueMap = VENUE_MAPS[category] || {};
  classifications.forEach((classification) => {
    const typeName = classification?.type?.name;
    const subTypeName = classification?.subType?.name;
    const venueName = typeName || subTypeName;

    if (venueName) {
      const mapped = findBestMatch(venueName, venueMap);
      if (mapped && !venues.includes(mapped)) {
        venues.push(mapped);
      }
    }
  });

  return {
    category,
    subcategories,
    vibe: vibes,
    venue: venues,
  };
};

const mapEvent = (event) => {
  const { venues } = event._embedded;
  const venue = venues[0];
  const classifications = event.classifications;

  return {
    type: "ai",
    name: event.name || null,
    description: event.description || null,
    tm: {
      eventId: event.id || null,
      url: event.url || null,
      locale: event.locale || null,
      sales: {
        startDateTime: event.sales?.public?.startDateTime || null,
        endDateTime: event.sales?.public?.endDateTime || null,
        code: event.dates?.status?.code || null,
      },
      venueId: venue.id,
      ticketLimitInfo: event.ticketLimit?.info || null,
    },
    dates: {
      start: {
        date: event.dates?.start?.localDate || null,
        time: event.dates?.start?.localTime || null,
      },
      end: {
        date: event.dates.end?.localDate || null,
        time: event.dates.end?.localTime || null,
      },
      timezone: event.dates?.timezone || null,
    },
    location: {
      name: venue.name,
      postalCode: venue.postalCode,
      country: {
        name: venue.country?.name || null,
        code: venue.country?.countryCode || null,
      },
      city: {
        name: venue.city?.name || null,
        code: venue.city?.cityCode || null,
      },
      state: {
        name: venue.state?.name || null,
        code: venue.state?.stateCode || null,
      },
      address: venue.address?.line1 || null,
      coordinate: {
        longitude: Number(venue.location?.longitude || 0),
        latitude: Number(venue.location?.latitude || 0),
      },
    },
    classifications: mapClassifications(classifications),
    seatmap: event.seatmap?.staticUrl || null,
    images: event.images?.map((image) => image.url) || [],
  };
};

const filterAvailableEventsFromTM = (events) => {
  return events
    .filter((event) => {
      const { endDateTime } = event.sales.public;
      const { code } = event.dates.status;
      const timezone = event.dates?.timezone;

      if (!endDateTime || !code || !timezone || !event.url) return false;

      const end = new Date(endDateTime).getTime();
      const now = new Date().getTime();

      return end > now && code === "onsale";
    })
    .map((event) => mapEvent(event));
};

module.exports = { filterAvailableEventsFromTM };
