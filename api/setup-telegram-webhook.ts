import type { VercelRequest, VercelResponse } from "@vercel/node";
import { registerTelegramWebhook } from "./_bot-utils";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET requests
  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const host = (req.query.host as string) || req.headers.host;
  if (!host) {
    res.status(400).json({ success: false, error: "Missing host parameter" });
    return;
  }

  const result = await registerTelegramWebhook(host);
  if (result.success) {
    res.status(200).json({ success: true, message: result.message });
  } else {
    res.status(500).json({ success: false, error: result.message });
  }
}
