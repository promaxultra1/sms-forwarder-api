import express from "express";
import { google } from "googleapis";

const app = express();
app.use(express.json());

// Android -> backend shared secret
const API_KEY = process.env.API_KEY;

// Where to send the forwarded emails (your Gmail)
const TO_EMAIL = process.env.TO_EMAIL;

// Google OAuth
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

// Create OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET
);
oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

app.get("/", (_, res) => res.send("OK"));

function makeRawEmail({ from, to, subject, text }) {
  const message =
    `From: ${from}\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    "MIME-Version: 1.0\r\n" +
    "Content-Type: text/plain; charset=utf-8\r\n" +
    "\r\n" +
    text;

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

app.post("/sms", async (req, res) => {
  try {
    // Check API key
    const key = req.header("x-api-key");
    if (!API_KEY || key !== API_KEY) {
      return res.status(401).json({ error: "unauthorized" });
    }

    // Extract SMS fields
    const { from, body, timestamp } = req.body || {};
    if (!from || !body) {
      return res.status(400).json({ error: "missing from/body" });
    }

    const when = timestamp ? new Date(timestamp).toString() : new Date().toString();

    // ✅ Subject starts with SMS FORWARD
    const subject = `SMS FORWARD | ${from}`;
    const text = `From: ${from}\nTime: ${when}\n\n${body}`;

    const raw = makeRawEmail({
      from: TO_EMAIL,
      to: TO_EMAIL,
      subject,
      text,
    });

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
