/**
 * Telegram Bot Controller
 */
import {
  processMessage,
  setWebhook,
  deleteWebhook,
  sendMessage,
} from '../models/telegramModel.js';

// POST /api/bot/telegram/webhook
// Telegram sends updates here
export async function webhook(req, res) {
  // Always respond 200 immediately to Telegram
  res.sendStatus(200);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  console.log('[TG Webhook] Received update, token configured:', !!token);

  if (!token) {
    console.warn('[TG Webhook] TELEGRAM_BOT_TOKEN not set in env');
    return;
  }

  const update  = req.body;
  console.log('[TG Webhook] Update type:', Object.keys(update).filter(k => k !== 'update_id').join(','));

  const message = update.message || update.channel_post;
  if (!message) {
    console.log('[TG Webhook] No message in update');
    return;
  }

  console.log('[TG Webhook] Message from:', message.from?.username || message.from?.first_name, '| text:', message.text?.slice(0, 80));

  processMessage(token, message).catch(err =>
    console.error('[TG processMessage error]', err.message)
  );
}

// POST /api/bot/telegram/setup-webhook
export async function setupWebhook(req, res, next) {
  const { token, webhookUrl } = req.body;
  if (!token || !webhookUrl)
    return res.status(400).json({ error: 'token dan webhookUrl diperlukan' });
  try {
    const result = await setWebhook(token, webhookUrl);
    res.json(result);
  } catch (err) { next(err); }
}

// POST /api/bot/telegram/remove-webhook
export async function removeWebhook(req, res, next) {
  const token = req.body.token || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(400).json({ error: 'token diperlukan' });
  try {
    const result = await deleteWebhook(token);
    res.json(result);
  } catch (err) { next(err); }
}

// POST /api/bot/telegram/send
// Manual send from frontend
export async function manualSend(req, res, next) {
  const { token, chat_id, message } = req.body;
  if (!token || !chat_id || !message)
    return res.status(400).json({ error: 'token, chat_id, message diperlukan' });
  try {
    const result = await sendMessage(token, chat_id, message);
    res.json(result);
  } catch (err) { next(err); }
}

// GET /api/bot/telegram/messages
// Get logged session messages
export async function getMessages(req, res, next) {
  try {
    const { supabase } = await import('../lib/supabase.js');
    const { limit = 50, offset = 0 } = req.query;
    const { data, error } = await supabase
      .from('shopee_session_messages')
      .select('*')
      .order('received_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw new Error(error.message);
    res.json(data || []);
  } catch (err) { next(err); }
}
