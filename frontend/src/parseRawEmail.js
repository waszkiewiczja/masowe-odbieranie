// emailParser.js

/**
 * Extracts headers and body from a raw email
 * @param {string} rawEmail - The raw email content
 * @returns {Object} - Object containing headers and body
 */
export function extractHeadersAndBody(rawEmail) {
  const headerEndIndex = rawEmail.indexOf("\r\n\r\n");
  if (headerEndIndex === -1) {
    throw new Error("Invalid email format: Cannot find header section");
  }

  return {
    headers: rawEmail.substring(0, headerEndIndex),
    body: rawEmail.substring(headerEndIndex + 4), // Skip the blank line
  };
}

// Try to repair common mojibake (UTF-8 bytes interpreted as Latin1/Windows-1252).
function containsPolishLetters(s) {
  return /[ąćęłńóśżźĄĆĘŁŃÓŚŻŹ]/.test(s);
}

function looksLikeMojibake(s) {
  // common mojibake markers (Ã, Å, Â sequences) often appear when UTF-8 bytes were mis-decoded
  return /Ã|Å|Â/.test(s);
}

function tryRepairEncoding(text) {
  // If there's no mojibake signs, skip work
  if (!looksLikeMojibake(text)) return text;

  if (typeof TextDecoder === "undefined") return text;

  // Convert JS string (each char is 0-255) to bytes
  const bytes = new Uint8Array(
    text.split("").map((c) => c.charCodeAt(0) & 0xff)
  );

  const candidates = ["utf-8", "windows-1250", "iso-8859-2", "windows-1252"];
  for (const enc of candidates) {
    try {
      const decoded = new TextDecoder(enc).decode(bytes);
      // Prefer candidate if it contains Polish letters
      if (containsPolishLetters(decoded)) return decoded;
    } catch (e) {
      // ignore
    }
  }

  return text;
}

/**
 * Decodes a MIME encoded-word string (RFC 2047)
 * @param {string} str - The encoded string
 * @returns {string} - Decoded string
 */
export function decodeMimeEncodedWord(str) {
  // Check if this is a MIME encoded-word
  if (!str || !str.includes("=?")) {
    return str;
  }

  // Replace all encoded words in the string
  return str.replace(
    /=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi,
    (match, charset, encoding, text) => {
      try {
        if (encoding.toUpperCase() === "Q") {
          // Quoted-Printable encoding
          // Replace underscores with spaces
          text = text.replace(/_/g, " ");
          // Decode hex sequences
          text = text.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
          });

          // If we have TextDecoder available (modern browsers), use it to decode the charset
          if (typeof TextDecoder !== "undefined") {
            try {
              // Convert the decoded bytes to UTF-8
              const bytes = new Uint8Array(
                text.split("").map((c) => c.charCodeAt(0))
              );
              return new TextDecoder(charset).decode(bytes);
            } catch (e) {
              // Fallback if TextDecoder fails
              return text;
            }
          }

          return text;
        } else if (encoding.toUpperCase() === "B") {
          // Base64 encoding
          try {
            const decoded = atob(text);

            // If we have TextDecoder available, use it to decode the charset
            if (typeof TextDecoder !== "undefined") {
              try {
                const bytes = new Uint8Array(
                  decoded.split("").map((c) => c.charCodeAt(0))
                );
                return new TextDecoder(charset).decode(bytes);
              } catch (e) {
                // Fallback if TextDecoder fails
                return decoded;
              }
            }

            return decoded;
          } catch (e) {
            return text;
          }
        }

        return text;
      } catch (e) {
        console.error("Error decoding MIME encoded-word:", e);
        return match; // Return the original string if decoding fails
      }
    }
  );
}

/**
 * Parses email headers into a structured object
 * @param {string} headers - The raw headers section
 * @returns {Object} - Object containing parsed headers
 */
export function parseHeaders(headers) {
  const headerLines = headers.split("\r\n");
  const parsedHeaders = {
    from: "",
    subject: "",
    date: "",
    contentType: "",
    contentTransferEncoding: "",
  };

  let currentHeader = null;

  // Process header lines and handle folded headers
  for (let i = 0; i < headerLines.length; i++) {
    const line = headerLines[i];

    // Check if this is a continuation of the previous header (starts with space or tab)
    if (line.startsWith(" ") || line.startsWith("\t")) {
      // Append to the current header if one is being processed
      if (currentHeader) {
        parsedHeaders[currentHeader] += " " + line.trim();
      }
      continue;
    }

    // Reset current header
    currentHeader = null;

    // Extract specific headers
    if (line.toLowerCase().startsWith("from:")) {
      parsedHeaders.from = line.substring(5).trim();
      currentHeader = "from";
    } else if (line.toLowerCase().startsWith("subject:")) {
      parsedHeaders.subject = line.substring(8).trim();
      currentHeader = "subject";
    } else if (line.toLowerCase().startsWith("date:")) {
      parsedHeaders.date = line.substring(5).trim();
      currentHeader = "date";
    } else if (line.toLowerCase().startsWith("content-type:")) {
      parsedHeaders.contentType = line.substring(13).trim();
      currentHeader = "contentType";
    } else if (line.toLowerCase().startsWith("content-transfer-encoding:")) {
      parsedHeaders.contentTransferEncoding = line.substring(26).trim();
      currentHeader = "contentTransferEncoding";
    }
  }

  return parsedHeaders;
}

/**
 * Parses the From header to extract name and email
 * @param {string} fromHeader - The raw From header
 * @returns {Object} - Object containing name and email
 */
export function parseFromHeader(fromHeader) {
  let name = "";
  let email = "";

  if (!fromHeader) {
    return { name, email, formatted: "Unknown Sender" };
  }

  // First, decode any MIME encoded words in the header
  const decodedHeader = decodeMimeEncodedWord(fromHeader);

  // Try to extract email address from within < >
  const emailMatch = decodedHeader.match(/<([^>]+)>/);
  if (emailMatch) {
    email = emailMatch[1];
    // Extract name part (everything before the email)
    const namePart = decodedHeader
      .substring(0, decodedHeader.indexOf("<"))
      .trim();
    if (namePart) {
      name = namePart;
    }
  } else {
    // No angle brackets, use the whole thing as email
    email = decodedHeader;
  }

  // Format the from field nicely
  const formatted = name ? `${name} <${email}>` : email || "Unknown Sender";

  return { name, email, formatted };
}

/**
 * Parses the Subject header
 * @param {string} subjectHeader - The raw Subject header
 * @returns {string} - Decoded subject
 */
export function parseSubjectHeader(subjectHeader) {
  if (!subjectHeader) {
    return "No Subject";
  }

  // Decode any MIME encoded words in the subject
  return decodeMimeEncodedWord(subjectHeader);
}

/**
 * Parses the Date header
 * @param {string} dateHeader - The raw Date header
 * @returns {string} - Formatted date
 */
export function parseDateHeader(dateHeader) {
  if (!dateHeader) {
    return "Unknown Date";
  }

  // Date headers typically don't contain encoded words, but decode just in case
  const decodedDate = decodeMimeEncodedWord(dateHeader);

  // Optionally format the date here if needed
  try {
    const date = new Date(decodedDate);
    if (!isNaN(date.getTime())) {
      // Format the date as needed
      return date.toLocaleString();
    }
  } catch (e) {
    console.error("Error parsing date:", e);
  }

  return decodedDate;
}

/**
 * Decodes quoted-printable content
 * @param {string} text - The quoted-printable encoded text
 * @returns {string} - Decoded text
 */
export function decodeQuotedPrintable(text) {
  // Replace =XX with the corresponding character
  return text
    .replace(/=\r\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/=3D/g, "=");
}

/**
 * Extracts the message body based on content type
 * @param {string} body - The raw email body
 * @param {string} contentType - The Content-Type header
 * @param {string} headers - The full headers (for boundary extraction)
 * @returns {Object} - Object containing parsed body and HTML flag
 */
export function parseEmailBody(body, contentType, headers) {
  const isMultipart = contentType.toLowerCase().includes("multipart/");
  let parsedBody = "";
  let isHtml = false;

  if (isMultipart) {
    // Extract boundary
    const boundaryMatch =
      contentType.match(/boundary="?([^";\r\n]+)"?/i) ||
      headers.match(/boundary="?([^";\r\n]+)"?/i);

    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const result = parseMultipartBody(body, boundary);
      parsedBody = result.parsedBody;
      isHtml = result.isHtml;
    } else {
      parsedBody = "Multipart email with no boundary found.";
    }
  } else {
    // Single part email
    parsedBody = body;
    isHtml = contentType.toLowerCase().includes("html");

    // Try to detect charset for single-part bodies and decode if possible
    const charsetMatch = contentType.match(/charset="?([^";\r\n]+)"?/i);
    if (!charsetMatch && typeof TextDecoder !== "undefined") {
      // No specified charset -> try to repair mojibake (common case when body bytes are UTF-8 but decoded incorrectly)
      parsedBody = tryRepairEncoding(parsedBody);
    } else if (charsetMatch && typeof TextDecoder !== "undefined") {
      try {
        const charset = charsetMatch[1];
        const bytes = new Uint8Array(
          parsedBody.split("").map((c) => c.charCodeAt(0))
        );
        parsedBody = new TextDecoder(charset).decode(bytes);
      } catch (e) {
        console.error("Error decoding single-part charset:", e);
      }
    }
  }

  return { parsedBody, isHtml };
}

/**
 * Parses a multipart email body
 * @param {string} body - The raw email body
 * @param {string} boundary - The boundary string
 * @returns {Object} - Object containing parsed body and HTML flag
 */
export function parseMultipartBody(body, boundary) {
  // Split by boundary
  const parts = body.split(new RegExp(`--${boundary}(?:--|\\r\\n)`, "g"));

  // Find HTML and plain text parts
  let htmlPart = "";
  let textPart = "";

  for (const part of parts) {
    if (!part.trim()) continue;

    const partHeaderEndIndex = part.indexOf("\r\n\r\n");
    if (partHeaderEndIndex !== -1) {
      const partHeaders = part.substring(0, partHeaderEndIndex);
      let partBody = part.substring(partHeaderEndIndex + 4);

      const isHtmlPart = partHeaders.toLowerCase().includes("text/html");
      const isTextPart = partHeaders.toLowerCase().includes("text/plain");

      // Check if this part is quoted-printable encoded
      const isQuotedPrintable = partHeaders
        .toLowerCase()
        .includes("quoted-printable");

      if (isQuotedPrintable) {
        partBody = decodeQuotedPrintable(partBody);
      }

      // Check for charset in part headers
      const charsetMatch = partHeaders.match(/charset="?([^";\r\n]+)"?/i);
      if (charsetMatch && typeof TextDecoder !== "undefined") {
        try {
          const charset = charsetMatch[1];
          const bytes = new Uint8Array(
            partBody.split("").map((c) => c.charCodeAt(0))
          );
          partBody = new TextDecoder(charset).decode(bytes);
        } catch (e) {
          console.error("Error decoding charset:", e);
        }
      } else {
        // No charset provided — try to detect and repair common mojibake
        partBody = tryRepairEncoding(partBody);
      }

      if (isHtmlPart) {
        htmlPart = partBody;
      } else if (isTextPart) {
        textPart = partBody;
      }
    }
  }

  // Prefer HTML if available
  if (htmlPart) {
    return { parsedBody: htmlPart, isHtml: true };
  } else if (textPart) {
    return { parsedBody: textPart, isHtml: false };
  } else {
    return {
      parsedBody: "No readable content found in this email.",
      isHtml: false,
    };
  }
}

/**
 * Main function to parse a raw email
 * @param {string} rawEmail - The raw email content
 * @returns {Object} - Parsed email object
 */
export function parseRawEmail(rawEmail) {
  try {
    // Extract headers and body
    const { headers, body } = extractHeadersAndBody(rawEmail);

    // Parse headers
    const parsedHeaders = parseHeaders(headers);

    // Parse From header
    const fromData = parseFromHeader(parsedHeaders.from);

    // Parse Subject header with encoding support
    const subject = parseSubjectHeader(parsedHeaders.subject);

    // Parse Date header
    const date = parseDateHeader(parsedHeaders.date);

    // Also attempt to parse a numeric timestamp for reliable sorting
    let dateMs = null;
    try {
      const parsedDate = new Date(parsedHeaders.date);
      if (!isNaN(parsedDate.getTime())) {
        dateMs = parsedDate.getTime();
      }
    } catch (e) {
      // ignore parsing errors — dateMs will remain null
    }

    // Parse email body
    const { parsedBody, isHtml } = parseEmailBody(
      body,
      parsedHeaders.contentType,
      headers
    );

    // Handle quoted-printable encoding if needed
    let finalBody = parsedBody;
    if (
      parsedHeaders.contentTransferEncoding.toLowerCase() ===
        "quoted-printable" ||
      finalBody.includes("=3D")
    ) {
      finalBody = decodeQuotedPrintable(finalBody);
    }

    // Attempt to repair mojibake on the final body as a last-resort
    finalBody = tryRepairEncoding(finalBody);

    return {
      from: fromData.formatted,
      subject: subject,
      date: date,
      dateMs: dateMs,
      text: finalBody,
      isHtml,
      // Additional metadata if needed
      fromName: fromData.name,
      fromEmail: fromData.email,
    };
  } catch (error) {
    console.error("Error parsing email:", error);
    return {
      from: "Error parsing email",
      subject: "Error parsing email",
      date: "Error parsing email",
      text: `Failed to parse email: ${error.message}`,
      isHtml: false,
    };
  }
}
