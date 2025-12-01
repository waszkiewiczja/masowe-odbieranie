import React from "react";

export function EmailItem({
  email,
  onReply,
  isReplying,
  replied,
  replyText,
  setReplyText,
  replyStatus,
  handleSendReply,
  handleCancelReply,
}) {
  return (
    <li
      style={{
        marginBottom: 16,
        padding: 12,
        border: "1px solid #e0e0e0",
        borderRadius: "4px",
        backgroundColor: replied ? "#e3f7e3" : "#f9f9f9",
        position: "relative",
      }}
    >
      {replied && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 12,
            background: "#388e3c",
            color: "white",
            padding: "2px 8px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          Replied
        </span>
      )}
      <div style={{ marginBottom: "8px" }}>
        <strong style={{ color: "#333" }}>Mailbox:</strong> {email.mailboxName}
      </div>
      <div style={{ marginBottom: "8px" }}>
        <strong style={{ color: "#333" }}>From:</strong> {email.from}
      </div>
      <div style={{ marginBottom: "8px" }}>
        <strong style={{ color: "#333" }}>Subject:</strong> {email.subject}
      </div>
      <div style={{ marginBottom: "8px" }}>
        <strong style={{ color: "#333" }}>Date:</strong> {email.date}
      </div>
      <div
        style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: "#fff",
          border: "1px solid #eaeaea",
          borderRadius: "4px",
          maxHeight: "300px",
          overflow: "auto",
        }}
      >
        {email.isHtml ? (
          <div dangerouslySetInnerHTML={{ __html: email.text }} />
        ) : (
          <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            {email.text}
          </div>
        )}
      </div>
      <button
        style={{
          marginTop: 10,
          padding: "6px 12px",
          backgroundColor: "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        onClick={() => onReply(email)}
      >
        Reply
      </button>
      {(() => {
        return (
          isReplying && (
            <div style={{ marginTop: 12, padding: 12, background: "#eef" }}>
              <h4>Reply to: {email.from}</h4>
              <textarea
                style={{ width: "100%", minHeight: 80, marginBottom: 8 }}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
              />
              <div>
                <button
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#388e3c",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginRight: 8,
                  }}
                  onClick={handleSendReply}
                  disabled={!replyText || replyStatus === "sending"}
                >
                  {replyStatus === "sending" ? "Sending..." : "Send Reply"}
                </button>
                <button
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#aaa",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  onClick={handleCancelReply}
                >
                  Cancel
                </button>
              </div>
              {replyStatus && replyStatus !== "sending" && (
                <div
                  style={{
                    marginTop: 8,
                    color: replyStatus === "sent" ? "green" : "red",
                  }}
                >
                  {replyStatus === "sent" ? "Reply sent!" : replyStatus}
                </div>
              )}
            </div>
          )
        );
      })()}
    </li>
  );
}
