import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Load mailbox configuration
let mailboxes;
try {
  mailboxes = JSON.parse(fs.readFileSync("./config.json", "utf8"));
  // Override mailbox password from environment variable if provided
  mailboxes = mailboxes.map((box) => {
    // Build per-mailbox env var name from username, e.g. PASSWORD_J_WASZKIEWICZ_ZNAJDZ_PRZETARGI_PL
    const sanitized = (box.username || "")
      .replace(/[^A-Za-z0-9]/g, "_")
      .toUpperCase();
    const password = process.env.PASSWORD || box.password || "";

    if (!password) {
      console.warn(
        `No password configured for mailbox ${box.username}. Set ${perMailboxVar} or global PASSWORD env var or add the password to config.json`
      );
    }

    return {
      ...box,
      password,
    };
  });
  console.log(`Loaded ${mailboxes.length} mailbox configurations`);
} catch (error) {
  console.error("Failed to load config.json:", error);
  mailboxes = [];
}

export default mailboxes;
