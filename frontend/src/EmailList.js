import React from "react";
import { EmailItem } from "./EmailItem";

export function EmailList({
  emails,
  replyingEmail,
  replyText,
  setReplyText,
  replyStatus,
  repliedUids,
  onReply,
  handleSendReply,
  handleCancelReply,
}) {
  if (emails.length === 0) {
    return <p>No emails found in any mailbox.</p>;
  }
  return (
    <ul style={{ listStyleType: "none", padding: 0 }}>
      {emails.map((email, i) => {
        // Build composite key for this email
        const replyKey = `${email.date}|${email.mailbox}|${email.from}`;
        return (
          <EmailItem
            key={i}
            email={email}
            onReply={onReply}
            isReplying={replyingEmail && replyingEmail.uid === email.uid}
            replied={repliedUids && repliedUids.includes(replyKey)}
            replyText={replyText}
            setReplyText={setReplyText}
            replyStatus={replyStatus}
            handleSendReply={handleSendReply}
            handleCancelReply={handleCancelReply}
          />
        );
      })}
    </ul>
  );
}
