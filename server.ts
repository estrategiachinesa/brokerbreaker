import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { processTelegramUpdate, getBotConfig, registerTelegramWebhook } from "./api/_bot-utils";

let pollingActive = false;
let lastUpdateId = 0;

async function startTelegramPolling() {
  if (pollingActive) return;
  pollingActive = true;
  console.log("Starting Telegram Bot Long Polling...");

  // First delete webhook to make getUpdates work (and clear any stale webhooks)
  try {
    const config = await getBotConfig();
    const token = config.bot_token || "8936249204:AAHLPkYRW2kHmLvLqU9R1VvjpNFNgOisl8Q";
    const delUrl = `https://api.telegram.org/bot${token}/deleteWebhook`;
    const response = await fetch(delUrl);
    const resData = await response.json();
    console.log("deleteWebhook response on startup:", resData);
  } catch (err) {
    console.error("Error deleting webhook on startup:", err);
  }

  // Polling loop
  while (pollingActive) {
    try {
      const config = await getBotConfig();
      const token = config.bot_token || "8936249204:AAHLPkYRW2kHmLvLqU9R1VvjpNFNgOisl8Q";
      const pollUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=15`;
      const response = await fetch(pollUrl);
      if (!response.ok) {
        console.error(`Telegram API returned non-OK: ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      
      const data = await response.json();
      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          console.log("Polled Telegram Update:", JSON.stringify(update));
          lastUpdateId = update.update_id;
          // Process in background asynchronously
          processTelegramUpdate(update);
        }
      }
    } catch (err) {
      console.error("Error in Telegram Polling loop:", err);
      // Wait before retrying to prevent hot loops
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    // A tiny pause before the next poll
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Endpoint to setup webhook automatically
  app.get("/api/setup-telegram-webhook", async (req, res) => {
    try {
      const host = (req.query.host as string) || req.headers.host;
      if (!host) {
        res.status(400).json({ success: false, error: "Missing host parameter" });
        return;
      }
      const result = await registerTelegramWebhook(host);
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(500).json({ success: false, error: result.message });
      }
    } catch (err) {
      console.error("Error in setup endpoint:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      pollingActive,
      lastUpdateId
    });
  });

  // Keep endpoint but delegate to common update processor if anything sends posts here
  app.post("/api/telegram-webhook", async (req, res) => {
    try {
      await processTelegramUpdate(req.body);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error in webhook post handler:", error);
      res.sendStatus(500);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    // Start background polling
    startTelegramPolling();
  });
}

startServer();
