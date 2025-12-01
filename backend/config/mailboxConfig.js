import fs from "fs";

// Load mailbox configuration
let mailboxes;
try {
  mailboxes = JSON.parse(fs.readFileSync("./config.json", "utf8"));
  console.log(`Loaded ${mailboxes.length} mailbox configurations`);
} catch (error) {
  console.error("Failed to load config.json:", error);
  mailboxes = [];
}

export default mailboxes;
