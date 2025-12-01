import express from "express";
import nodemailer from "nodemailer";
import mailboxes from "../config/mailboxConfig.js";
import { saveRepliedKey, loadRepliedUids } from "../utils/repliedUids.js";

const router = express.Router();

// API endpoint to reply/send email
router.post("/", async (req, res) => {
  const { mailbox, to, subject, text, inReplyTo, references, replyKey } =
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

  const mailOptions = {
    from: box.username,
    to,
    subject,
    text,
    headers: {},
  };
  if (inReplyTo) mailOptions.headers["In-Reply-To"] = inReplyTo;
  if (references) mailOptions.headers["References"] = references;

  try {
    const info = await transporter.sendMail(mailOptions);

    console.log("replyKey", replyKey);
    // Save replied composite key
    if (replyKey) {
      saveRepliedKey(replyKey);
    }
    res.json({ success: true, info });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to get replied UIDs
router.get("/replied-uids", (req, res) => {
  res.json(loadRepliedUids());
});

export default router;
