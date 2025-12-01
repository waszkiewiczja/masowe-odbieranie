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

    const emails = [];

    // Limit the number of emails to fetch
    // We take the most recent emails (highest message numbers) first
    const sortedUidList = [...uidList].sort((a, b) => b[0] - a[0]); // Sort by message number in descending order
    const limitedUidList = sortedUidList.slice(0, MAX_EMAILS);

    console.log(
      `[POP3] Limiting to ${limitedUidList.length} most recent emails for ${username}`
    );

    // Fetch each message
    for (const [msgNum, uid] of limitedUidList) {
      try {
        console.log(
          `[POP3] Retrieving message #${msgNum} (UID: ${uid}) for ${username}`
        );
        const rawEmail = await pop3Client.RETR(msgNum);

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
      console.error(`[POP3] Error while quitting:`, e);
    }

    throw error;
  }
}

export { fetchEmails };
