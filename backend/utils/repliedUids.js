import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPLIED_UIDS_FILE = path.join(__dirname, "..", "replied_uids.json");

function loadRepliedUids() {
  try {
    return JSON.parse(fs.readFileSync(REPLIED_UIDS_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function saveRepliedKey(key) {
  if (!key) return;
  let keys = [];
  try {
    keys = JSON.parse(fs.readFileSync(REPLIED_UIDS_FILE, "utf8"));
  } catch (e) {
    keys = [];
  }
  if (!keys.includes(key)) {
    keys.push(key);
    fs.writeFileSync(REPLIED_UIDS_FILE, JSON.stringify(keys));
  }
}

export { loadRepliedUids, saveRepliedKey };
