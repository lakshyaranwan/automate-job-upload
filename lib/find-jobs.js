// Stage 1: ask Claude (via the Anthropic API + web search) for the latest jobs,
// returned as clean JSON — the programmatic version of what you do by hand today.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function findJobs() {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content:
            "Search for the latest design jobs (UI/UX, product, graphic, motion) " +
            "posted in the last 7 days. Return ONLY a JSON array — no prose, no " +
            "markdown fences. Each item must have exactly these keys: " +
            '"title", "company", "location", "type", "url", "description", "posted_date". ' +
            "Find 5–10 real, currently-open roles with working application URLs.",
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();

  // web_search interleaves tool blocks; the answer is in the text block(s).
  const text = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  // Be defensive: strip fences and slice out the JSON array.
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array in model output:\n" + clean);

  return JSON.parse(clean.slice(start, end + 1));
}
