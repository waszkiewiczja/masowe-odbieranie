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
      {(() => {
        const nodes = [];
        const getYMD = (e) => {
          const ts = e.dateMs || Date.parse(e.date);
          if (isNaN(ts)) return null;
          const d = new Date(ts);
          return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        };

        for (let i = 0; i < emails.length; i++) {
          const email = emails[i];
          const prev = i > 0 ? emails[i - 1] : null;

          // Insert separator when day changes between consecutive emails
          if (i > 0) {
            const prevDay = getYMD(prev);
            const currDay = getYMD(email);
            if (prevDay !== currDay) {
              nodes.push(
                <li key={`sep-${i}`} style={{ width: "100%" }}>
                  <hr
                    style={{
                      border: "none",
                      height: "6px",
                      backgroundColor: "red",
                      margin: "40px 0",
                    }}
                  />
                </li>
              );
            }
          }

          const replyKey = `${email.date}|${email.mailbox}|${email.from}`;
          nodes.push(
            <EmailItem
              key={`email-${i}`}
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
        }

        return nodes;
      })()}
    </ul>
  );
}
