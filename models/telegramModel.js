/**
 * Telegram Bot Model
 * - Receive webhook from Telegram
 * - Unshorten Shopee URLs
 * - Extract session_id
 * - Match sender to host by phone
 * - Reply with session info
 */
import fetch    from 'node-fetch';
import { supabase } from '../lib/supabase.js';

const TG_BASE = 'https://api.telegram.org/bot';

// ── Telegram API helpers ──────────────────────────────

export async function sendMessage(token, chatId, text, parseMode = 'Markdown') {
  const res = await fetch(`${TG_BASE}${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
  return res.json();
}

export async function setWebhook(token, webhookUrl) {
  const res = await fetch(`${TG_BASE}${token}/setWebhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  });
  return res.json();
}

export async function deleteWebhook(token) {
  const res = await fetch(`${TG_BASE}${token}/deleteWebhook`, { method: 'POST' });
  return res.json();
}

// ── URL processing ────────────────────────────────────

/**
 * Unshorten a Shopee short URL (e.g. https://id.shp.ee/xxxx)
 * Returns the full expanded URL.
 */
export async function unshortenUrl(shortUrl) {
  try {
    const res = await fetch(shortUrl, {
      method:   'GET',
      redirect: 'follow',
      headers:  { 'User-Agent': 'Mozilla/5.0' },
    });
    return res.url; // final URL after all redirects
  } catch (err) {
    throw new Error('Gagal unshorten URL: ' + err.message);
  }
}

/**
 * Extract Shopee session_id from a full Shopee livestream URL.
 * Supports patterns like:
 *   /livestream/session/213710800
 *   ?session=213710800
 *   /live/213710800
 */
export function extractSessionId(url) {
  try {
    const u = new URL(url);

    // Pattern 1: /livestream/session/{id} or /live/{id}
    const pathMatch = u.pathname.match(/(?:session|live|livestream\/session)\/(\d+)/i);
    if (pathMatch) return pathMatch[1];

    // Pattern 2: ?session={id}
    const sessionParam = u.searchParams.get('session');
    if (sessionParam) return sessionParam;

    // Pattern 3: any numeric segment in path that looks like session ID (8+ digits)
    const numericMatch = u.pathname.match(/\/(\d{8,})/);
    if (numericMatch) return numericMatch[1];

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect if a string contains a Shopee URL (short or full).
 */
export function extractShopeeUrl(text) {
  const patterns = [
    /https?:\/\/(?:id\.shp\.ee|shp\.ee)\/\S+/i,          // short URLs
    /https?:\/\/(?:shopee\.co\.id|shopee\.com)\/\S+/i,    // full Shopee URLs
    /https?:\/\/\S*shopee\S*/i,                             // any shopee URL
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0].replace(/[.,!?)]+$/, ''); // trim trailing punctuation
  }
  return null;
}

// ── Host lookup ───────────────────────────────────────

/**
 * Find host by phone number (normalize format before matching).
 */
export async function findHostByPhone(phone) {
  if (!phone) return null;

  // Normalize: remove spaces, dashes, +62 → 0, etc.
  const normalized = normalizePhone(phone);

  const { data, error } = await supabase
    .from('shopee_livestream_hosts')
    .select('id, name, phone');

  if (error || !data?.length) return null;

  return data.find(h => {
    if (!h.phone) return false;
    return normalizePhone(h.phone) === normalized ||
           h.phone.replace(/\D/g, '') === normalized.replace(/\D/g, '');
  }) || null;
}

function normalizePhone(phone) {
  let p = String(phone).replace(/[\s\-().+]/g, '');
  if (p.startsWith('62'))  p = '0' + p.slice(2);
  if (p.startsWith('+62')) p = '0' + p.slice(3);
  return p;
}

// ── Log session message ───────────────────────────────

export async function logSessionMessage({ session_id, host_id, host_name, host_phone, telegram_user, telegram_chat_id, raw_url }) {
  const { error } = await supabase
    .from('shopee_session_messages')
    .insert({
      session_id,
      host_id:         host_id    || null,
      host_name:       host_name  || telegram_user?.first_name || 'Unknown',
      host_phone:      host_phone || null,
      telegram_user_id:String(telegram_user?.id || ''),
      telegram_username: telegram_user?.username || '',
      telegram_name:   [telegram_user?.first_name, telegram_user?.last_name].filter(Boolean).join(' '),
      telegram_chat_id:String(telegram_chat_id || ''),
      raw_url,
      received_at:     new Date().toISOString(),
    });

  if (error) console.warn('[TG Log] Insert error:', error.message);
}

// ── Process incoming Telegram message ─────────────────

export async function processMessage(token, message) {
  const chatId = message.chat?.id;
  const from   = message.from || {};
  const text   = message.text || '';

  if (!chatId || !text) return;

  // Cek apakah ada URL Shopee
  const shopeeUrl = extractShopeeUrl(text);
  if (!shopeeUrl) return; // bukan pesan Shopee, abaikan

  try {
    await sendMessage(token, chatId, '⏳ Memproses URL...');

    // 1. Unshorten URL
    const fullUrl = await unshortenUrl(shopeeUrl);

    // 2. Extract session_id
    const sessionId = extractSessionId(fullUrl);
    if (!sessionId) {
      await sendMessage(token, chatId,
        `⚠️ Tidak bisa menemukan session ID dari URL:\n\`${fullUrl}\``);
      return;
    }

    // 3. Cari host berdasarkan nomor pengirim (username/phone tidak tersedia langsung di TG)
    //    Telegram tidak expose nomor HP — match dari username atau first_name ke nama host
    //    Untuk match phone: user harus sudah di-register sebagai host dengan telegram_username
    const host = await findHostByTelegramUser(from);

    // 4. Log ke database
    await logSessionMessage({
      session_id:       sessionId,
      host_id:          host?.id   || null,
      host_name:        host?.name || null,
      host_phone:       host?.phone|| null,
      telegram_user:    from,
      telegram_chat_id: chatId,
      raw_url:          shopeeUrl,
    });

    // 5. Reply dengan info
    const senderName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Unknown';
    const hostLine   = host
      ? `👤 *Host:* ${host.name}\n📱 *No HP:* ${host.phone || '—'}`
      : `👤 *Pengirim:* ${senderName}\n_(Host belum terdaftar — tambahkan di menu Host)_`;

    await sendMessage(token, chatId,
      `✅ *Session Livestream Ditemukan*\n\n` +
      `${hostLine}\n` +
      `🎬 *Session ID:* \`${sessionId}\`\n` +
      `🔗 *URL:* ${fullUrl}`
    );

  } catch (err) {
    console.error('[TG processMessage]', err.message);
    await sendMessage(token, chatId, `❌ Error: ${err.message}`).catch(() => {});
  }
}

/**
 * Find host by Telegram user info.
 * Match by telegram_username field di hosts table (kalau ada),
 * atau fallback ke first_name matching.
 */
async function findHostByTelegramUser(from) {
  const { data } = await supabase
    .from('shopee_livestream_hosts')
    .select('id, name, phone, telegram_username');

  if (!data?.length) return null;

  // Match by telegram username
  if (from.username) {
    const match = data.find(h =>
      h.telegram_username &&
      h.telegram_username.toLowerCase().replace('@','') === from.username.toLowerCase()
    );
    if (match) return match;
  }

  return null;
}
