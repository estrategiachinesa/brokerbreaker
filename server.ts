import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { processTelegramUpdate, getBotConfig, registerTelegramWebhook } from "./api/_bot-utils";

let pollingActive = false;
let lastUpdateId = 0;
let currentConfiguredHost = "";
let webhookRegisteredUrl = "";
const TELEGRAM_BOT_TOKEN = "8936249204:AAHLPkYRW2kHmLvLqU9R1VvjpNFNgOisl8Q";

async function startTelegramPolling() {
  if (pollingActive) return;
  pollingActive = true;
  console.log("Starting Telegram Bot Long Polling...");

  // First delete webhook to make getUpdates work (and clear any stale webhooks)
  try {
    const config = await getBotConfig();
    const token = config.bot_token || TELEGRAM_BOT_TOKEN;
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
      const token = config.bot_token || TELEGRAM_BOT_TOKEN;
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

async function configureTelegramBot(host: string) {
  if (host === currentConfiguredHost) return;

  const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0") || host.includes("192.168.");

  try {
    const config = await getBotConfig();
    const token = config.bot_token || TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.log("No bot token configured, skipping bot setup.");
      return;
    }

    if (isLocal) {
      // Local development: use long-polling
      console.log(`Local development detected (${host}). Setting up Long Polling...`);
      currentConfiguredHost = host;
      webhookRegisteredUrl = "";

      // Stop webhook first so polling can work
      const delUrl = `https://api.telegram.org/bot${token}/deleteWebhook`;
      const delRes = await fetch(delUrl);
      const delData = await delRes.json();
      console.log("deleteWebhook response on local start:", delData);

      // Start polling
      if (!pollingActive) {
        startTelegramPolling();
      }
    } else {
      // Production / Cloud Run: use Webhook
      const targetUrl = `https://${host}/api/telegram-webhook`;
      console.log(`Production environment detected (${host}). Setting up Webhook -> ${targetUrl}`);
      currentConfiguredHost = host;

      // Stop polling loop if active
      if (pollingActive) {
        console.log("Stopping long polling in favor of active Webhook...");
        pollingActive = false;
      }

      const setUrl = `https://api.telegram.org/bot${token}/setWebhook`;
      const setRes = await fetch(setUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          allowed_updates: ["message", "callback_query"]
        })
      });
      const setData = await setRes.json();
      console.log("setWebhook response on prod start:", setData);

      if (setData.ok) {
        webhookRegisteredUrl = targetUrl;
        console.log(`Telegram Webhook successfully set to: ${targetUrl}`);
      } else {
        console.error("Failed to set Telegram Webhook:", setData);
        currentConfiguredHost = ""; // reset on failure to retry
      }
    }
  } catch (err) {
    console.error("Error configuring Telegram Bot:", err);
    // Reset so it tries again on next request
    currentConfiguredHost = "";
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Auto-configure Webhook/Long Polling depending on current Host
  app.use((req, res, next) => {
    const host = req.get("host");
    if (host) {
      configureTelegramBot(host).catch((err) => console.error("Error in auto-configure middleware:", err));
    }
    next();
  });

  // Setup endpoint to explicitly trigger or force refresh webhook setup
  app.get("/api/setup-telegram-webhook", async (req, res) => {
    const host = req.get("host");
    if (host) {
      try {
        currentConfiguredHost = ""; // reset to force configuration
        await configureTelegramBot(host);
        res.json({
          success: true,
          message: "Telegram Bot configured successfully",
          host,
          webhookRegisteredUrl,
          pollingActive
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    } else {
      res.status(400).json({ success: false, error: "No host header found in request" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      pollingActive,
      lastUpdateId,
      webhookRegisteredUrl,
      currentConfiguredHost
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
    // Telegram Bot configured dynamically on demand (webhook for production, polling for local)
  });
}

startServer();
