import express from "express";
import mailboxes from "../config/mailboxConfig.js";
import { fetchEmails } from "../utils/emailFetcher.js";

const router = express.Router();

// API endpoint to fetch emails from all mailboxes
router.get("/", async (req, res) => {
  console.log("[API] /api/emails - request received");

  try {
    const results = await Promise.allSettled(
      mailboxes.map((box, idx) => {
        console.log(`[API] Fetching mailbox ${idx + 1}:`, box.username);
        return fetchEmails(box)
          .then((emails) => {
            console.log(
              `[API] Mailbox ${box.username} - fetched ${emails.length} messages`
            );
            return {
              mailbox: box.username,
              emails: emails,
              success: true,
            };
          })
          .catch((e) => {
            console.error(`[API] Error with mailbox ${box.username}:`, e);
            return {
              mailbox: box.username,
              error: e.message || String(e),
              success: false,
            };
          });
      })
    );

    // Format the response
    const formattedResults = results.map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          error: result.reason.message || String(result.reason),
          success: false,
        };
      }
    });

    res.json(formattedResults);
    console.log("[API] /api/emails - response sent");
  } catch (err) {
    console.error("[API] /api/emails - error:", err);
    res.status(500).json({ error: err.toString() });
  }
});

export default router;
