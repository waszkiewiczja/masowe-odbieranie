import express from "express";
import mailboxes from "../config/mailboxConfig.js";

const router = express.Router();

// Health check endpoint
router.get("/", (req, res) => {
  res.json({ status: "ok", mailboxCount: mailboxes.length });
});

export default router;
