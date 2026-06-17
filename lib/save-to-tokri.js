// Stage 2: write jobs straight into the Design Tokri database (Supabase REST).
// This replaces typing them into the admin UI.
//
// ⚠️ Uses the SERVICE ROLE key, which bypasses row-level security. It must ONLY
//    ever live in a secure server environment (GitHub Actions secrets). NEVER put
//    it in frontend code, the Lovable app, or a public repo.

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
const TABLE = process.env.JOBS_TABLE || "jobs";
const AUTO_PUBLISH = process.env.AUTO_PUBLISH === "true";

function headers(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// Insert (or update on duplicate) the jobs Claude found.
// Requires a UNIQUE constraint on `source_url` for dedup to work.
export async function saveJobs(jobs) {
  const rows = jobs.map((j) => ({
    // ── Map these to YOUR actual column names ──
    title: j.title,
    company: j.company,
    location: j.location,
    type: j.type,
    source_url: j.url,
    description: j.description,
    // Workflow columns (add these to your table — see README):
    status: AUTO_PUBLISH ? "published" : "pending", // review gate unless AUTO_PUBLISH
    posted_to_linkedin: false,
  }));

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=source_url`,
    {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(rows),
    }
  );
  if (!res.ok) throw new Error(`Supabase insert ${res.status}: ${await res.text()}`);
  return res.json();
}

// Find jobs that are approved/published but not yet shared on LinkedIn.
export async function getPostableJobs() {
  const url =
    `${SUPABASE_URL}/rest/v1/${TABLE}` +
    `?status=eq.published&posted_to_linkedin=eq.false&select=*`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase query ${res.status}: ${await res.text()}`);
  return res.json();
}

// Flag a job as posted so it's never shared twice.
export async function markPosted(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify({ posted_to_linkedin: true }),
  });
  if (!res.ok) throw new Error(`Supabase update ${res.status}: ${await res.text()}`);
}
