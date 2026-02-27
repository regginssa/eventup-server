const moment = require("moment");

const ACCOUNT_SID = process.env.IMPACT_ACCOUNT_SID;
const AUTH_TOKEN = process.env.IMPACT_AUTH_TOKEN;

const checkPurchasesOneShot = async (specificUserId = null) => {
  try {
    const startDate =
      moment().subtract(24, "hours").toISOString().split(".")[0] + "Z";
    const endDate = moment().toISOString().split(".")[0] + "Z";

    // FIX 1: Added /Mediapartners/
    // FIX 2: Added $ before {ACCOUNT_SID}
    const url = `https://api.impact.com/Mediapartners/${ACCOUNT_SID}/Actions`;

    const params = new URLSearchParams({
      ActionDateStart: startDate,
      ActionDateEnd: endDate,
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      headers: {
        // Ensure "Basic " has a space after it
        Authorization: `Basic ${Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64")}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Impact API results are inside an "Actions" array
    const actions = data.Actions || [];

    console.log("[Impact actions]: ", actions);

    // Filter by the SubId1 you passed in the purchase link
    // Note: Impact sometimes returns this as 'SubId1' (uppercase S)
    return actions.filter((a) => String(a.SubId1) === String(specificUserId));
  } catch (err) {
    // If you see "fetch failed" here, it usually means the URL is wrong
    console.error("Impact API error:", err.message);
    return [];
  }
};

module.exports = { checkPurchasesOneShot };
