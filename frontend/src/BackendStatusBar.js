import React from "react";

export function BackendStatusBar({ loading, backendStatus, fetchEmails }) {
  return (
    <div
      style={{
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <button
        onClick={fetchEmails}
        disabled={loading || backendStatus !== "online"}
        style={{
          padding: "8px 16px",
          backgroundColor: loading
            ? "#cccccc"
            : backendStatus === "online"
            ? "#4CAF50"
            : "#f44336",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor:
            loading || backendStatus !== "online" ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Loading..." : "Refresh Emails"}
      </button>

      <div
        style={{
          display: "inline-block",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          backgroundColor:
            backendStatus === "online"
              ? "#e8f5e9"
              : backendStatus === "offline"
              ? "#ffebee"
              : backendStatus === "error"
              ? "#fff8e1"
              : "#f5f5f5",
          color:
            backendStatus === "online"
              ? "#2e7d32"
              : backendStatus === "offline"
              ? "#c62828"
              : backendStatus === "error"
              ? "#f57f17"
              : "#757575",
        }}
      >
        Backend:{" "}
        {backendStatus === "online"
          ? "Online"
          : backendStatus === "offline"
          ? "Offline"
          : backendStatus === "error"
          ? "Error"
          : "Unknown"}
      </div>
    </div>
  );
}
