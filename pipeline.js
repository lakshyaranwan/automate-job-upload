import { findJobs } from "./lib/find-jobs.js";
import { saveJobs, getPostableJobs, markPosted } from "./lib/save-to-tokri.js";
import { postToLinkedIn } from "./lib/post-to-linkedin.js";

const POST_TO_LINKEDIN = process.env.POST_TO_LINKEDIN === "true";

async function main() {
  // ── Stage 1: find jobs ──
  const jobs = await findJobs();
  console.log(`Found ${jobs.length} jobs`);

  // ── Stage 2: save into Design Tokri ──
  const saved = await saveJobs(jobs);
  console.log(`Saved ${saved.length} rows (status: ${process.env.AUTO_PUBLISH === "true" ? "published" : "pending review"})`);

  // ── Stage 3: post approved jobs to LinkedIn ──
  if (POST_TO_LINKEDIN) {
    const postable = await getPostableJobs();
    console.log(`${postable.length} published jobs awaiting LinkedIn`);

    for (const job of postable) {
      try {
        const urn = await postToLinkedIn(job);
        await markPosted(job.id);
        console.log(`Posted "${job.title}" → ${urn}`);
        // LinkedIn rate limits ~100 posts/day/member — pace if posting many.
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error(`LinkedIn failed for "${job.title}": ${e.message}`);
        // keep going; the flag isn't set so it retries next run
      }
    }
  }

  console.log("✅ Pipeline complete");
}

main().catch((e) => {
  console.error("❌ Pipeline failed:", e.message);
  process.exit(1);
});
