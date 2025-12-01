import Pop3Command from "node-pop3";

// Function to fetch emails from a single POP3 mailbox
async function fetchEmails({ username, password, pop3 }) {
  console.log(`[POP3] Attempting to connect to ${username}@${pop3}`);

  // Maximum number of emails to fetch per account
  const MAX_EMAILS = 200;

  // Create a new POP3 client instance
  // const pop3Client = new Pop3Command({
  //   user: username,
  //   password: password,
  //   host: pop3,
  //   port: 110,
  //   tls: false,
  //   timeout: 30000, // 30 seconds timeout
  // });

  const pop3Client = new Pop3Command({
    user: username,
    password: password,
    host: pop3,
    port: 995, // Use SSL/TLS port
    tls: true, // Enable SSL/TLS
    timeout: 30000,
  });

  // Hold collected messages here so catch block can return partial results when needed
  let emails = [];

  try {
    // Connect to the server
    console.log(`[POP3] Connecting to ${pop3}...`);
    await pop3Client.connect();
    console.log(`[POP3] Connected to ${pop3}`);

    // Authenticate
    console.log(`[POP3] Authenticating as ${username}...`);
    await pop3Client.command("USER", username);
    await pop3Client.command("PASS", password);
    console.log(`[POP3] Authentication successful for ${username}`);

    // Get message status
    console.log(`[POP3] Retrieving message status for ${username}...`);
    const [statResponse] = await pop3Client.command("STAT");
    console.log(`[POP3] STAT response: ${statResponse}`);

    // Parse the STAT response to get message count
    const statParts = statResponse.split(" ");
    const messageCount = parseInt(statParts[0], 10);
    console.log(`[POP3] Message count for ${username}: ${messageCount}`);

    if (messageCount === 0) {
      console.log(`[POP3] No messages for ${username}, closing connection`);
      await pop3Client.QUIT();
      return [];
    }

    // Get list of message UIDs
    console.log(`[POP3] Retrieving message UIDs for ${username}...`);
    const uidList = await pop3Client.UIDL();
    console.log(
      `[POP3] Retrieved ${uidList.length} message UIDs for ${username}`
    );

    // Limit the number of emails to fetch
    const limitedUidList = [...uidList].slice(0, MAX_EMAILS);

    console.log(
      `[POP3] Limiting to ${limitedUidList.length} most recent emails for ${username}`
    );

    // helper: wrap an async operation with a timeout
    const withTimeout = (promise, ms, label = 'operation') =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
      ]);

    // Fetch each message (skip if a single message blocks for too long)
    // On persistent failures we'll abort the mailbox fetch to avoid leaving the POP3 session in an unknown state.
    const PER_MESSAGE_TIMEOUT = 30_000; // ms
    for (const [msgNum, uid] of limitedUidList) {
      try {
        console.log(
          `[POP3] Retrieving message #${msgNum} (UID: ${uid}) for ${username}`
        );
        // Run RETR under per-message timeout guard.
        // If a RETR hangs or takes too long we'll abort and close the connection for this mailbox.
        const rawEmail = await withTimeout(
          pop3Client.RETR(msgNum),
          PER_MESSAGE_TIMEOUT,
          `RETR #${msgNum}`
        );

        emails.push({
          number: msgNum,
          uid: uid,
          raw: rawEmail,
          mailbox: username,
        });

        console.log(
          `[POP3] Successfully retrieved message #${msgNum} for ${username}`
        );
      } catch (err) {
        console.error(
          `[POP3] Error retrieving message #${msgNum} for ${username}:`,
          err
        );
        // If the error was a timeout or indicates the connection is broken, abort fetching further messages
        if (String(err).toLowerCase().includes('timed out') || String(err).toLowerCase().includes('timeout')) {
          console.warn(`[POP3] Aborting further retrieval for ${username} after timeout on message #${msgNum}`);
          break; // break the loop and close the connection safely below
        }
      }
    }

    // Close the connection properly
    console.log(`[POP3] Closing connection for ${username}`);
    await pop3Client.QUIT();
    console.log(
      `[POP3] Fetching completed for ${username}, retrieved ${emails.length} messages`
    );

    return emails;
  } catch (error) {
    console.error(`[POP3] Error for ${username}@${pop3}:`, error);

    // Try to close the connection if possible
    try {
      await pop3Client.QUIT();
    } catch (e) {
      // If quitting itself times out, log but continue — we'll return partial results when appropriate
      console.error(`[POP3] Error while quitting:`, e);
    }

    // If this is a socket/timeout error we treat it as recoverable and return the messages we've already collected.
    const errStr = String(error || "").toLowerCase();
    if (
      (error && error.eventName === "timeout") ||
      /timed out|timeout/.test(errStr)
    ) {
      console.warn(
        `[POP3] Recovering from timeout for ${username}@${pop3} — returning ${emails.length} messages collected so far.`
      );
      return emails;
    }

    // Otherwise re-throw so callers know this mailbox failed
    throw error;
  }
}

export { fetchEmails };
