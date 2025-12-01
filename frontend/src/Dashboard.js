import React, { useState } from "react";
import { EmailList } from "./EmailList";
import { BackendStatusBar } from "./BackendStatusBar";
import { AppAlerts } from "./AppAlerts";
import { text } from "./text";

export const Dashboard = ({
  fetchEmails,
  loading,
  backendStatus,
  error,
  mailboxes,
}) => {
  const [replyingEmail, setReplyingEmail] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState(null);
  const [repliedKeys, setRepliedKeys] = useState([]);

  // Fetch replied keys on mount
  React.useEffect(() => {
    fetch("http://localhost:3001/api/reply/replied-uids")
      .then((res) => res.json())
      .then((data) => {
        setRepliedKeys(Array.isArray(data) ? data : []);
      })
      .catch(() => setRepliedKeys([]));
  }, []);

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        fontFamily: "sans-serif",
        padding: "0 16px",
      }}
    >
      <h1>Multi-Mailbox Email Viewer</h1>

      <BackendStatusBar
        loading={loading}
        backendStatus={backendStatus}
        fetchEmails={fetchEmails}
      />

      <AppAlerts loading={loading} error={error} mailboxes={mailboxes} />

      <div style={{ marginTop: 24 }}>
        <EmailList
          emails={(() => {
            const allEmails = mailboxes
              .filter((mailbox) => mailbox.success)
              .flatMap((mailbox) =>
                (mailbox.emails || []).map((email) => ({
                  ...email,
                  mailboxName: mailbox.name || "Unknown",
                }))
              );
            allEmails.sort((a, b) => {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              return dateB - dateA;
            });
            return allEmails;
          })()}
          replyingEmail={replyingEmail}
          replyText={replyText}
          setReplyText={setReplyText}
          replyStatus={replyStatus}
          repliedUids={repliedKeys}
          onReply={(email) => {
            setReplyingEmail(email);
            // Pick a random 60-word excerpt from text.js
            const words = text.split(/\s+/);
            const maxStart = Math.max(0, words.length - 60);
            const startIdx = Math.floor(Math.random() * (maxStart + 1));
            const excerpt = words.slice(startIdx, startIdx + 60).join(" ");
            setReplyText(excerpt);
            setReplyStatus(null);
          }}
          handleSendReply={() => {
            if (!replyingEmail) {
              console.log("No replyingEmail set, cannot send reply.");
              return;
            }
            console.log("Sending reply to:", replyingEmail.from);
            setReplyStatus("sending");
            const replyKey = `${replyingEmail.date}|${replyingEmail.mailbox}|${replyingEmail.from}`;
            fetch("http://localhost:3001/api/reply", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                mailbox: replyingEmail.mailbox,
                to: replyingEmail.from,
                subject: `Re: ${replyingEmail.subject}`,
                text: replyText,
                inReplyTo: replyingEmail.messageId,
                references: replyingEmail.messageId,
                replyKey: replyKey,
              }),
            })
              .then(async (res) => {
                console.log("Reply API response status:", res.status);
                if (!res.ok) {
                  const err = await res.text();
                  console.log("Reply API error:", err);
                  setReplyStatus(`Error: ${err}`);
                } else {
                  setReplyStatus("sent");
                  setReplyingEmail(null);
                  setReplyText("");
                  setRepliedKeys((prev) =>
                    prev ? [...prev, replyKey] : [replyKey]
                  );
                  fetchEmails();
                }
              })
              .catch((err) => {
                console.log("Reply API fetch error:", err);
                setReplyStatus(`Error: ${err.message}`);
              });
          }}
          handleCancelReply={() => {
            setReplyingEmail(null);
            setReplyText("");
            setReplyStatus(null);
          }}
        />
      </div>
    </div>
  );
};
