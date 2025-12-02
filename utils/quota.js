const QUOTA_DAILY = 5000;
const SOFT_CAP_DISCOVERY = 2000;
const SOFT_CAP_PARTNER = 3000;

let state = {
  day: new Date().toISOString().slice(0, 10), // YYYY-MM-DD UTC
  discovery: 0,
  partner: 0,
};

function maybeResetDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== state.day) state = { day: today, discovery: 0, partner: 0 };
}

function canSpend(kind, n = 1) {
  maybeResetDay();
  const total = state.discovery + state.partner;
  if (total + n > QUOTA_DAILY) return false;
  if (kind === "discovery" && state.discovery + n > SOFT_CAP_DISCOVERY)
    return false;
  if (kind === "partner" && state.partner + n > SOFT_CAP_PARTNER) return false;
  return true;
}

function spend(kind, n = 1) {
  maybeResetDay();
  if (kind === "discovery") state.discovery += n;
  else state.partner += n;
}

module.exports = { canSpend, spend };
