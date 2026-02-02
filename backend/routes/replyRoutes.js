import express from "express";
import nodemailer from "nodemailer";
import mailboxes from "../config/mailboxConfig.js";
import { saveRepliedKey, loadRepliedUids } from "../utils/repliedUids.js";

const router = express.Router();

// API endpoint to reply/send email
router.post("/", async (req, res) => {
  const { mailbox, to, subject, text, html, inReplyTo, references, replyKey } =
    req.body;
  const box = mailboxes.find((mb) => mb.username === mailbox);
  if (!box) {
    return res.status(400).json({ error: "Mailbox not found" });
  }

  // Create SMTP transporter
  const transporter = nodemailer.createTransport({
    host: box.smtp || box.pop3,
    port: box.smtpPort || 587,
    secure: false,
    auth: {
      user: box.username,
      pass: box.password,
    },
  });

  const stripTags = (s) => (s ? s.replace(/<\/?[^>]+(>|$)/g, "") : "");

  // Normalize HTML: remove excess whitespace/newlines between tags and trim inner text
  const normalizeHtml = (h) => {
    if (!h) return h;
    try {
      // Remove whitespace between tags (e.g. \n    <tr>) and collapse multiple spaces/newlines
      let out = h.replace(/>\s+</g, "><");
      // Trim whitespace inside tag content (e.g. anchor text)
      out = out.replace(/>\s+([^<]*?)\s+</g, ">$1<");
      // Collapse consecutive whitespace characters to single spaces
      out = out.replace(/\s{2,}/g, " ");
      return out;
    } catch (e) {
      return h;
    }
  };

  const mailOptions = {
    from: box.username,
    to,
    subject,
    text: text || stripTags(html),
    headers: {},
  };
  if (html) mailOptions.html = normalizeHtml(html);
  if (inReplyTo) mailOptions.headers["In-Reply-To"] = inReplyTo;
  if (references) mailOptions.headers["References"] = references;

  // Ensure text fallback is meaningful when html is provided
  if (
    mailOptions.html &&
    (!mailOptions.text || mailOptions.text.trim().length < 10)
  ) {
    mailOptions.text = stripTags(mailOptions.html);
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    if (replyKey) {
      saveRepliedKey(replyKey);
    }
    res.json({ success: true, info });
  } catch (err) {
    console.error("Error sending mail:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to get replied UIDs
router.get("/replied-uids", (req, res) => {
  res.json(loadRepliedUids());
});

export default router;
