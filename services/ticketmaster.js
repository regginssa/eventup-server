const Event = require("../models/Event");
const { filterAvailableEventsFromTM } = require("../utils/ticketmaster");
const cron = require("node-cron");

const DISCOVER_BASE = "https://app.ticketmaster.com/discovery/v2/events/";
const API_KEY = process.env.TICKETMASTER_API_KEY;

// Daily API request limit
const DAILY_REQUEST_LIMIT = 1000;

// Request tracking
let requestCount = 0;
let currentDate = new Date().toDateString();
let page = 1;
let totalPages = 1;
let isPaused = false;
let isFetching = false; // Lock to prevent concurrent fetches

// Reset counter daily at midnight
cron.schedule("0 0 * * *", () => {
  requestCount = 0;
  currentDate = new Date().toDateString();
  page = 1;
  totalPages = 1;
  isPaused = false;
  console.log("Daily API request counter reset");
});

// Fetch events every 2 minutes (720 requests/day max, well under 1000 limit)
// This cron job runs every 2 minutes
cron.schedule("*/2 * * * *", async () => {
  await fetchAllEventsFromTM();
});

const fetchAllEventsFromTM = async () => {
  // Prevent concurrent executions
  if (isFetching) {
    console.log("Fetch already in progress, skipping...");
    return;
  }

  // Check if we need to reset the counter (new day)
  const today = new Date().toDateString();
  if (today !== currentDate) {
    requestCount = 0;
    currentDate = today;
    page = 1;
    totalPages = 1;
    isPaused = false;
    console.log("New day detected - API request counter reset");
  }

  // Check if we've hit the daily limit
  if (requestCount >= DAILY_REQUEST_LIMIT) {
    if (!isPaused) {
      console.log(
        `Daily API limit reached (${DAILY_REQUEST_LIMIT}). Pausing until midnight.`,
      );
      isPaused = true;
    }
    return;
  }

  // Check if we've completed all pages
  if (page > totalPages) {
    console.log("All pages fetched. Resetting for next cycle.");
    page = 1;
    totalPages = 1;
    return;
  }

  // Set lock to prevent concurrent fetches
  isFetching = true;

  const url = DISCOVER_BASE + `?apikey=${API_KEY}&size=200&page=${page}`;

  try {
    // Make API request
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`Ticketmaster API error: ${res.status} ${res.statusText}`);
      isFetching = false; // Release lock on error
      return;
    }

    const data = await res.json();

    // Update totalPages and increment page immediately after successful API response
    // This prevents duplicate requests if the next cron runs while DB is still storing
    const currentPage = page;
    totalPages = data.page.totalPages;
    page++; // Increment immediately to prevent duplicate requests

    // Increment request counter only on successful requests
    requestCount++;
    console.log(
      `[Ticketmaster API] Request ${requestCount}/${DAILY_REQUEST_LIMIT} - Page ${currentPage}/${totalPages}`,
    );

    const availableEvents = filterAvailableEventsFromTM(data._embedded.events);

    // Store to DB (this can take time, but page is already incremented)
    const result = await storeEventsToDB(availableEvents);
    console.log("store events to db result: ", result);
  } catch (error) {
    console.error("fetch all events from ticketmaster error: ", error);
  } finally {
    // Always release lock when done
    isFetching = false;
  }
};

const storeEventsToDB = async (events) => {
  try {
    console.log("[stored events length]: ", events.length);
    for (const event of events) {
      const existingEvent = await Event.findOne({
        "tm.eventId": event.tm.eventId,
      });
      if (existingEvent) {
        await Event.findByIdAndUpdate(existingEvent._id, { $set: event });
      } else {
        await Event.create(event);
      }
    }
    return true;
  } catch (error) {
    console.error("store events to db error: ", error);
    return false;
  }
};

// Get current API request status
const getAPIRequestStatus = () => {
  return {
    requestsUsed: requestCount,
    limit: DAILY_REQUEST_LIMIT,
    remaining: Math.max(0, DAILY_REQUEST_LIMIT - requestCount),
    percentage: ((requestCount / DAILY_REQUEST_LIMIT) * 100).toFixed(2),
    isPaused,
    currentPage: page,
    totalPages,
    date: currentDate,
  };
};

module.exports = { fetchAllEventsFromTM, storeEventsToDB, getAPIRequestStatus };
