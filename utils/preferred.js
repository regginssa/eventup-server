const Event = require("../models/Event");

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if arrays have any common elements
 */
const hasCommonElements = (arr1, arr2) => {
  if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return false;
  return arr1.some((item) => arr2.includes(item));
};

/**
 * Check if arrays have all common elements (subset check)
 */
const hasAllCommonElements = (arr1, arr2) => {
  if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return false;
  return arr1.every((item) => arr2.includes(item));
};

/**
 * Filter and score events based on user preferences
 * @param {Object} preferred - User's preferred settings
 * @param {Array} events - Array of events to filter
 * @param {Object} userLocation - User's location with coordinate
 * @param {Number} page - Page number (0-indexed)
 * @param {Number} limit - Number of events per page
 * @returns {Array} Sorted events by match score
 */
const filterPreferredEvents = async (
  preferred,
  events,
  userLocation = null,
  page = 0,
  limit = 10
) => {
  try {
    if (!preferred || !events || events.length === 0) {
      return [];
    }

    // Get events for current page range: page * limit to page * limit + limit
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const pageEvents = events.slice(startIndex, endIndex);

    // Score each event
    const scoredEvents = pageEvents.map((event) => {
      let score = {
        category: 0,
        subcategories: 0,
        vibeVenue: 0,
        location: 0,
        total: 0,
      };

      // 1. Category match
      if (
        preferred.category &&
        event.classifications?.category &&
        preferred.category.toLowerCase() ===
          event.classifications.category.toLowerCase()
      ) {
        score.category = 1;
      }

      // 2. Subcategories match
      if (
        preferred.subcategories &&
        preferred.subcategories.length > 0 &&
        event.classifications?.subcategories &&
        event.classifications.subcategories.length > 0
      ) {
        const hasCommon = hasCommonElements(
          preferred.subcategories,
          event.classifications.subcategories
        );
        if (hasCommon) {
          score.subcategories = 1;
        }
      }

      // 3. Vibe and Venue match
      let vibeMatch = false;
      let venueMatch = false;

      if (
        preferred.vibe &&
        preferred.vibe.length > 0 &&
        event.classifications?.vibe &&
        event.classifications.vibe.length > 0
      ) {
        vibeMatch = hasCommonElements(
          preferred.vibe,
          event.classifications.vibe
        );
      }

      if (
        preferred.venue_type &&
        preferred.venue_type.length > 0 &&
        event.classifications?.venue &&
        event.classifications.venue.length > 0
      ) {
        venueMatch = hasCommonElements(
          preferred.venue_type,
          event.classifications.venue
        );
      }

      if (vibeMatch || venueMatch) {
        score.vibeVenue = 1;
      }

      // 4. Location match
      if (preferred.location === "nearby") {
        // Check if event is within 10KM of user's location
        if (userLocation?.coordinate && event.location?.coordinate) {
          const userLat = userLocation.coordinate.latitude;
          const userLon = userLocation.coordinate.longitude;
          const eventLat = event.location.coordinate.latitude;
          const eventLon = event.location.coordinate.longitude;

          if (userLat && userLon && eventLat && eventLon) {
            const distance = calculateDistance(
              userLat,
              userLon,
              eventLat,
              eventLon
            );
            if (distance <= 10) {
              // Within 10KM
              score.location = 1;
            }
          }
        }
      } else if (preferred.location === "city") {
        // Match events in the same city/region
        // Try to match by city name first, then by region, then by coordinate proximity (50KM)
        if (
          event.location?.city?.name &&
          userLocation?.region &&
          event.location.city.name
            .toLowerCase()
            .includes(userLocation.region.toLowerCase())
        ) {
          score.location = 1;
        } else if (userLocation?.coordinate && event.location?.coordinate) {
          // Use coordinate-based matching for city (within 50KM as city radius)
          const userLat = userLocation.coordinate.latitude;
          const userLon = userLocation.coordinate.longitude;
          const eventLat = event.location.coordinate.latitude;
          const eventLon = event.location.coordinate.longitude;

          if (userLat && userLon && eventLat && eventLon) {
            const distance = calculateDistance(
              userLat,
              userLon,
              eventLat,
              eventLon
            );
            if (distance <= 50) {
              // Within 50KM (city radius)
              score.location = 1;
            }
          }
        }
      } else if (preferred.location === "country") {
        // Match events in the same country
        if (
          userLocation?.country_code &&
          event.location?.country?.code &&
          userLocation.country_code.toLowerCase() ===
            event.location.country.code.toLowerCase()
        ) {
          score.location = 1;
        }
      } else if (preferred.location === "worldwide") {
        // All events match for worldwide
        score.location = 1;
      }

      // Calculate total score and determine if it's a best match (all 4 criteria)
      score.total =
        score.category + score.subcategories + score.vibeVenue + score.location;
      const isBestMatch = score.total === 4;

      return {
        event,
        score,
        isBestMatch,
        // Priority order: best match first, then by individual criteria priority
        sortKey: isBestMatch
          ? 0
          : score.category * 1000 +
            score.subcategories * 100 +
            score.vibeVenue * 10 +
            score.location,
      };
    });

    // Sort: Best matches first, then by priority (1,2,3,4)
    scoredEvents.sort((a, b) => {
      // Best matches come first
      if (a.isBestMatch && !b.isBestMatch) return -1;
      if (!a.isBestMatch && b.isBestMatch) return 1;

      // Then sort by priority: category > subcategories > vibeVenue > location
      return b.sortKey - a.sortKey;
    });

    // Return events in sorted order
    return scoredEvents.map((item) => item.event);
  } catch (error) {
    console.error("get preferred error: ", error);
    return [];
  }
};

module.exports = { filterPreferredEvents };
