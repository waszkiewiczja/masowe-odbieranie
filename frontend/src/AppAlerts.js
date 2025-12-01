import React from "react";

export function AppAlerts({ loading, error, mailboxes }) {
  return (
    <>
      {loading && (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Loading emails from all mailboxes...</p>
        </div>
      )}
      {error && (
        <div
          style={{
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
      {!loading && mailboxes.length === 0 && !error && (
        <p>No mailboxes found. Check your configuration.</p>
      )}
    </>
  );
}
