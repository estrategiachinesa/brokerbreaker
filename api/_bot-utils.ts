import { createRequire } from "module";

const require = createRequire(import.meta.url);
let firebaseConfig: any = {};
try {
  firebaseConfig = require("../firebase-applet-config.json");
} catch (err) {
  console.error("Failed to load firebase-applet-config.json via require:", err);
}

const TELEGRAM_BOT_TOKEN = "8936249204:AAHLPkYRW2kHmLvLqU9R1VvjpNFNgOisl8Q";
const ADMIN_CHAT_ID = "5328007859";

const PROJECT_ID = firebaseConfig.projectId || "";
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || "(default)";

// Firestore REST Helper: Fetch document
async function getFirestoreDoc(collection: string, documentId: string): Promise<any | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${documentId}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Firestore REST GET error: ${res.statusText} (${res.status})`);
  }
  return await res.json();
}

// Firestore REST Helper: Set document (PATCH creates if it doesn't exist)
async function setFirestoreDoc(collection: string, documentId: string, fields: Record<string, any>): Promise<any> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${documentId}?key=${firebaseConfig.apiKey}`;
  
  // Convert JS object properties to Firestore REST format
  const formattedFields: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "boolean") {
      formattedFields[key] = { booleanValue: value };
    } else if (typeof value === "number") {
      formattedFields[key] = { doubleValue: value };
    } else {
      formattedFields[key] = { stringValue: String(value) };
    }
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: formattedFields })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore REST PATCH error: ${res.statusText} (${res.status}) - ${errText}`);
  }
  return await res.json();
}

export interface BotConfig {
  iq_link: string;
  exnova_link: string;
  welcome_msg: string;
  approved_msg: string;
  rejected_msg: string;
  pending_msg: string;
  bot_token?: string;
  admin_chat_id?: string;
}

export const DEFAULT_CONFIG: BotConfig = {
  iq_link: "https://affiliate.iqoption.net/redir/?aff=198544&aff_model=revenue&afftrack=gub",
  exnova_link: "https://exnova.com/lp/start-trading/?aff=198544&aff_model=revenue&afftrack=gub",
  welcome_msg: "👋 *Olá, {name}! Bem-vindo ao bot de liberação do BugBreaker!*\n\nPara liberar seu acesso na plataforma, siga os passos abaixo:\n\n1️⃣ Cadastre-se em uma de nossas corretoras parceiras:\n👉 [Clique aqui para se cadastrar na IQ Option]({iq_link})\n👉 [Clique aqui para se cadastrar na Exnova]({exnova_link})\n\n2️⃣ Após criar sua conta, envie-me o seu **ID de Usuário** (somente números, com no mínimo 8 dígitos).\n\nAssim que você enviar seu ID, ele será enviado para análise e liberação imediata! 🚀",
  approved_msg: "🎉 *Seu acesso foi LIBERADO com sucesso!*\n\nSeu ID `{id}` agora está ativo no sistema. Volte ao site, insira o ID e clique em *Verificar Conexão* para começar! 🚀",
  rejected_msg: "⚠️ *Seu ID {id} não foi aprovado pela nossa equipe.*\n\nCertifique-se de que se cadastrou corretamente através de nossos links indicados e envie o ID correto novamente para análise.",
  pending_msg: "🎉 *Seu ID {id} da {broker} foi enviado ao painel de controle!*\n\nSeu ID foi registrado com sucesso, mas a opção está desativada no momento. Ele será ativado assim que o depósito qualificatório for validado. 🚀"
};

export async function getBotConfig(): Promise<BotConfig> {
  try {
    const docData = await getFirestoreDoc("system_settings", "telegram_bot");
    if (docData && docData.fields) {
      const f = docData.fields;
      return {
        iq_link: f.iq_link?.stringValue || DEFAULT_CONFIG.iq_link,
        exnova_link: f.exnova_link?.stringValue || DEFAULT_CONFIG.exnova_link,
        welcome_msg: f.welcome_msg?.stringValue || DEFAULT_CONFIG.welcome_msg,
        approved_msg: f.approved_msg?.stringValue || DEFAULT_CONFIG.approved_msg,
        rejected_msg: f.rejected_msg?.stringValue || DEFAULT_CONFIG.rejected_msg,
        pending_msg: f.pending_msg?.stringValue || DEFAULT_CONFIG.pending_msg,
        bot_token: f.bot_token?.stringValue || undefined,
        admin_chat_id: f.admin_chat_id?.stringValue || undefined,
      };
    }
  } catch (err) {
    console.error("Error reading bot config from Firestore REST:", err);
  }
  return DEFAULT_CONFIG;
}

export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  try {
    const config = await getBotConfig();
    const token = config.bot_token || TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        reply_markup: replyMarkup,
        disable_web_page_preview: true,
        link_preview_options: { is_disabled: true }
      })
    });
    const resData = await response.json();
    console.log("sendTelegramMessage Response:", resData);
    return resData;
  } catch (err) {
    console.error("Error sending Telegram message:", err);
  }
}

export async function editTelegramMessage(chatId: string | number, messageId: number, text: string) {
  try {
    const config = await getBotConfig();
    const token = config.bot_token || TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        link_preview_options: { is_disabled: true }
      })
    });
    const resData = await response.json();
    console.log("editTelegramMessage Response:", resData);
    return resData;
  } catch (err) {
    console.error("Error editing Telegram message:", err);
  }
}

export async function answerCallbackQuery(callbackQueryId: string) {
  try {
    const config = await getBotConfig();
    const token = config.bot_token || TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId
      })
    });
  } catch (err) {
    console.error("Error answering callback query:", err);
  }
}

export async function registerTelegramWebhook(host: string): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getBotConfig();
    const token = config.bot_token || TELEGRAM_BOT_TOKEN;
    if (!token) {
      return { success: false, message: "No bot token configured" };
    }
    
    // Create webhook target URL
    const webhookUrl = `https://${host}/api/telegram-webhook`;
    const setUrl = `https://api.telegram.org/bot${token}/setWebhook`;
    
    console.log(`Setting Telegram Webhook to: ${webhookUrl}`);
    const response = await fetch(setUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"]
      })
    });
    const resData = await response.json();
    console.log("setWebhook Response:", resData);
    
    if (resData.ok) {
      return { success: true, message: `Webhook set successfully to ${webhookUrl}` };
    } else {
      return { success: false, message: `Telegram API error: ${resData.description}` };
    }
  } catch (err) {
    console.error("Error setting webhook:", err);
    return { success: false, message: `Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function processTelegramUpdate(update: any) {
  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text ? update.message.text.trim() : "";
      const fromUser = update.message.from || {};
      const firstName = fromUser.first_name || "Usuário";

      // 1. Check if start or general command
      if (text.startsWith("/start")) {
        const config = await getBotConfig();
        const welcomeMessage = config.welcome_msg
          .replace(/{name}/g, firstName)
          .replace(/{iq_link}/g, config.iq_link)
          .replace(/{exnova_link}/g, config.exnova_link);
        await sendTelegramMessage(chatId, welcomeMessage);
        return;
      }

      // 2. Check if text is a potential ID
      const numericId = text.replace(/\D/g, "");
      if (numericId && numericId.length >= 8) {
        // Confirm received ID to user
        await sendTelegramMessage(
          chatId,
          `⏳ *Obrigado!* Seu ID \`${numericId}\` foi enviado para análise.\nVocê receberá uma notificação aqui assim que seu acesso for liberado!`
        );

        // Forward to Admin
        const config = await getBotConfig();
        const adminChatId = config.admin_chat_id || ADMIN_CHAT_ID;
        const adminText = `📥 *Nova Solicitação de Acesso!*\n\n👤 *Usuário:* [${firstName}](tg://user?id=${chatId})\n🆔 *ID de Usuário:* \`${numericId}\`\n\nEscolha uma opção abaixo para gerenciar o acesso:`;
        
        const inlineKeyboard = {
          inline_keyboard: [
            [
              { text: "Aprovar na IQ Option ✅", callback_data: `appIQ_${numericId}_${chatId}` },
              { text: "Aprovar na Exnova ✅", callback_data: `appEX_${numericId}_${chatId}` }
            ],
            [
              { text: "Recusar ❌", callback_data: `reject_${numericId}_${chatId}` }
            ]
          ]
        };

        await sendTelegramMessage(adminChatId, adminText, inlineKeyboard);
      } else {
        // Fallback for unrecognized messages
        await sendTelegramMessage(
          chatId,
          `⚠️ *Mensagem não reconhecida.*\n\nPor favor, envie apenas o seu **ID de Usuário** (números apenas, mínimo 8 dígitos) para que possamos analisar e liberar seu acesso.`
        );
      }
    } else if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data; // e.g., "appIQ_12345678_121212"
      const messageId = callbackQuery.message.message_id;
      const callbackQueryId = callbackQuery.id;

      if (data && (data.startsWith("approve_") || data.startsWith("appIQ_") || data.startsWith("appEX_") || data.startsWith("reject_"))) {
        const parts = data.split("_");
        const action = parts[0]; // "approve", "appIQ", "appEX" or "reject"
        const userId = parts[1];
        const userChatId = parts[2];

        // Acknowledge the callback query so Telegram loader stops
        await answerCallbackQuery(callbackQueryId);

        const config = await getBotConfig();
        const adminChatId = config.admin_chat_id || ADMIN_CHAT_ID;

        if (action === "approve" || action === "appIQ" || action === "appEX") {
          const broker = action === "appEX" ? "Exnova" : "IQ Option";
          // Add to Firestore database via REST API!
          try {
            await setFirestoreDoc("approved_ids", userId, {
              active: false,
              broker: broker,
              createdAt: new Date().toISOString()
            });

            // Update Admin Message
            const approvedAdminText = `✅ *ID ${userId} ENVIADO AO PAINEL (DESATIVADO) - CORRETORA: ${broker}!*\n\nO ID foi inserido com sucesso no Firestore como desativado para a corretora *${broker}*. Ative-o manualmente no painel quando necessário.`;
            await editTelegramMessage(adminChatId, messageId, approvedAdminText);

            // Notify User
            const userSuccessText = config.pending_msg
              .replace(/{id}/g, userId)
              .replace(/{broker}/g, broker);
            await sendTelegramMessage(userChatId, userSuccessText);
          } catch (err) {
            console.error("Failed to write to Firestore:", err);
            await sendTelegramMessage(adminChatId, `❌ Erro ao salvar ID ${userId} no Firestore: ${err instanceof Error ? err.message : String(err)}`);
          }
        } else if (action === "reject") {
          // Update Admin Message
          const rejectedAdminText = `❌ *ID ${userId} RECUSADO!*\n\nSolicitação de acesso recusada pelo Administrador.`;
          await editTelegramMessage(adminChatId, messageId, rejectedAdminText);

          // Notify User
          const userRejectText = config.rejected_msg.replace(/{id}/g, userId);
          await sendTelegramMessage(userChatId, userRejectText);
        }
      }
    }
  } catch (error) {
    console.error("Error processing update:", error);
  }
}
