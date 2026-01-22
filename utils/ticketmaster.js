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
        code: venue.country?.code || null,
      },
      city: {
        name: venue.city?.name || null,
        code: venue.city?.code || null,
      },
      state: {
        name: venue.state?.name || null,
        code: venue.state?.code || null,
      },
      address: venue.address?.line1 || null,
      coordinate: {
        longitude: Number(venue.location?.longitude || 0),
        latitude: Number(venue.location?.latitude || 0),
      },
    },
    classifications: {
      category: classifications[0]?.segment?.name || null,
      subcategories: classifications.map(
        (classification) => classification?.genre?.name || null
      ),
      vibe: classifications.map(
        (classification) => classification?.subGenre?.name || null
      ),
      venue: classifications.map((classification) =>
        classification?.type
          ? classification?.type?.name || null
          : classification?.subType
          ? classification?.subType?.name || null
          : classification?.genre?.name || null
      ),
    },
    seatmap: event.seatmap?.staticUrl || null,
  };
};

const filterAvailableEventsFromTM = (events) => {
  return events
    .filter((event) => {
      const { endDateTime } = event.sales.public;
      const { code } = event.dates.status;

      if (!endDateTime || !code) return false;

      const end = new Date(endDateTime).getTime();
      const now = new Date().getTime();

      return end > now && code === "onsale";
    })
    .map((event) => mapEvent(event));
};

module.exports = { filterAvailableEventsFromTM };
