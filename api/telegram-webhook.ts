import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processTelegramUpdate } from "./_bot-utils";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const update = req.body;
    if (update) {
      // Await processTelegramUpdate so serverless function waits until completion before returning response
      await processTelegramUpdate(update);
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error in serverless webhook endpoint:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
}
