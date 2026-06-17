// Stage 3: post a job to LinkedIn via the OFFICIAL Posts API.
//
// This targets a COMPANY PAGE (recommended for a brand like Design Tokri):
//   - scope needed: w_organization_social
//   - LINKEDIN_ORG_URN looks like "urn:li:organization:1234567"
//   - you must be an admin of that page
// For a PERSONAL profile instead: use scope w_member_social and set the author
//   to "urn:li:person:XXXX".
//
// ⚠️ Do NOT automate LinkedIn by driving the website with a headless browser —
//    that violates LinkedIn's User Agreement and routinely gets accounts banned.
//    Use this API, or a unified posting service (see README). Tokens expire after
//    ~60 days and must be refreshed.

const { LINKEDIN_ACCESS_TOKEN, LINKEDIN_ORG_URN } = process.env;
// Set to the current month in YYYYMM when you build; LinkedIn versions monthly.
const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || "202605";

export async function postToLinkedIn(job) {
  const commentary =
    `🚀 New role on Design Tokri\n\n` +
    `${job.title} — ${job.company}\n` +
    `📍 ${job.location || "Remote"}\n\n` +
    `Apply here: ${job.source_url}`;

  const body = {
    author: LINKEDIN_ORG_URN,
    commentary,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`LinkedIn post ${res.status}: ${await res.text()}`);
  return res.headers.get("x-restli-id"); // URN of the created post
}
