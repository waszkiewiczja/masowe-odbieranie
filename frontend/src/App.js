// frontend/src/App.js
import React, { useEffect, useState } from "react";
import { parseRawEmail } from "./parseRawEmail";
import { Dashboard } from "./Dashboard";

function App() {
  const [mailboxes, setMailboxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState("unknown");

  // Check if backend is available
  const checkBackendStatus = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/health", {
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      });
      if (response.ok) {
        setBackendStatus("online");
        return true;
      } else {
        setBackendStatus("error");
        return false;
      }
    } catch (err) {
      console.error("Backend health check failed:", err);
      setBackendStatus("offline");
      return false;
    }
  };

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    console.log("[FRONTEND] Starting email fetch...");

    // First check if backend is available
    const isBackendAvailable = await checkBackendStatus();
    if (!isBackendAvailable) {
      setError(
        "Backend server is not available. Please check if it's running on port 3001."
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/emails", {
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      });

      console.log("[FRONTEND] Backend response status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Server responded with status: ${res.status}. Details: ${errorText}`
        );
      }

      const data = await res.json();
      console.log("[FRONTEND] Email data:", data);

      // Process the mailboxes data - now matching the actual backend response structure
      const processedMailboxes = data.map((mailbox) => {
        // Check if this is an error response
        if (mailbox.error) {
          return {
            name: mailbox.mailbox || "Unknown",
            error: mailbox.error,
            emails: [],
            success: false,
          };
        }

        // Process emails for successful mailboxes
        const processedEmails = (mailbox.emails || [])
          .map((email) => {
            const parsedEmail = parseRawEmail(email.raw);
            return {
              ...email,
              ...parsedEmail,
            };
          })
          .reverse();

        return {
          name: mailbox.mailbox,
          emails: processedEmails,
          success: true,
        };
      });

      setMailboxes(processedMailboxes);

      // Log summary for the last 7 days: day (YYYY-MM-DD) => number of emails
      (function logLast7DaysSummary() {
        const now = new Date();
        const days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - i
          );
          days.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
        }

        // Flatten all emails from successful mailboxes
        const allEmails = processedMailboxes
          .filter((m) => m.success)
          .flatMap((m) => m.emails || []);

        const counts = {};
        days.forEach((day) => (counts[day] = 0));

        for (const e of allEmails) {
          const ts = e.dateMs || Date.parse(e.date);
          if (!ts || isNaN(ts)) continue;
          const key = new Date(ts).toISOString().slice(0, 10);
          if (key in counts) counts[key]++;
        }

        console.log("[FRONTEND] Email counts for last 7 days (day: count):");
        for (const day of days) {
          console.log(`${day}: ${counts[day]}`);
        }
      })();
    } catch (err) {
      console.error("[FRONTEND] Fetch error:", err);
      setError(`Error fetching emails: ${err.message}`);
    }
    setLoading(false);
    console.log("[FRONTEND] Fetch completed.");
  };

  useEffect(() => {
    checkBackendStatus().then((isAvailable) => {
      if (isAvailable) {
        fetchEmails();
      }
    });
  }, []);

  return (
    <Dashboard
      fetchEmails={fetchEmails}
      loading={loading}
      backendStatus={backendStatus}
      error={error}
      mailboxes={mailboxes}
    />
  );
}

export default App;
