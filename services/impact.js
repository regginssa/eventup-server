const moment = require("moment");

const ACCOUNT_SID = process.env.IMPACT_ACCOUNT_SID;
const AUTH_TOKEN = process.env.IMPACT_AUTH_TOKEN;

const checkPurchases = async (specificUserId = null) => {
  try {
    // 1. Define the time range (e.g., last 6 hours)
    const startDate = moment()
      .subtract(6, "hours")
      .format("YYYY-MM-DDTHH:mm:ss");
    const endDate = moment().format("YYYY-MM-DDTHH:mm:ss");

    // 2. Call Impact "Actions" API using fetch
    const url = `https://api.impact.com${ACCOUNT_SID}/Actions`;
    const params = new URLSearchParams({
      ActionDateStart: startDate,
      ActionDateEnd: endDate,
      ActionStatus: "APPROVED",
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: "Basic " + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`),
      },
    });

    console.log("[Impact response]: ", response);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Impact API Error: ${errorText}`);
    }

    const data = await response.json();
    const actions = data.Actions || [];

    // 3. Match SubId1 (your userId)
    actions.forEach(async (action) => {
      const userId = action.SubId1;
      const orderId = action.Oid;
      const status = action.ActionStatus; // 'APPROVED', 'PENDING', or 'REVERSED'

      if (userId && specificUserId && specificUserId === userId) {
        if (status === "APPROVED") {
          // FINAL CONFIRMATION
          //   await updateDatabase(userId, orderId, "CONFIRMED");
          console.log(`Order ${orderId} is now CONFIRMED for user ${userId}`);
        } else if (status === "PENDING") {
          // INITIAL TRACKING
          //   await updateDatabase(userId, orderId, "PENDING");
          console.log(`Order ${orderId} is PENDING for user ${userId}`);
        } else if (status === "REVERSED") {
          // CANCELLATION
          //   await updateDatabase(userId, orderId, "CANCELLED");
          console.log(`Order ${orderId} is REVERSED for user ${userId}`);
        }
      }
    });

    return actions;
  } catch (error) {
    console.error("Impact API Error:", error.message);
  }
};

module.exports = { checkPurchases };
