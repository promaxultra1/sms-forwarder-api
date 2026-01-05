import express from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

// Environment variables (we’ll set these later on Render)
const API_KEY = process.env.API_KEY;
const TO_EMAIL = process.env.TO_EMAIL;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// Setup Gmail SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// Health check (useful to see if server is alive)
app.get("/", (req, res) => res.send("OK"));

// Main endpoint your Android app will call
app.post("/sms", async (req, res) => {
  try {
    // Simple API key check
    const key = req.header("x-api-key");
    if (!API_KEY || key !== API_KEY) {
      return res.status(401).json({ error: "unauthorized" });
    }

    // Read SMS payload
    const { from, body, timestamp } = req.body || {};
    if (!from || !body) {
      return res.status(400).json({ error: "missing from/body" });
    }

    const when = timestamp
      ? new Date(timestamp).toString()
      : new Date().toString();

    // ✅ SUBJECT starts with "SMS FORWARD"
    await transporter.sendMail({
      from: SMTP_USER,
      to: TO_EMAIL,
      subject: `SMS FORWARD | ${from}`,
      text: `From: ${from}\nTime: ${when}\n\n${body}`,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed" });
  }
});

// Render sets PORT automatically
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
