/**
 * Shopee Live Controller
 */
import {
  getAuthUrl,
  getAccessToken,
  refreshAccessToken,
  getSessionDetail,
  getSessionMetric,
  getSessionItemMetric,
  getLatestComments,
  getItemList,
} from '../models/shopeeModel.js';
import { SHOPEE_REDIRECT_URI } from '../config.js';

// ── Auth ──────────────────────────────────────────────

/**
 * GET /api/shopee/auth/url
 * Return authorization URL untuk diarahkan ke browser
 */
export function authUrl(req, res) {
  // Livestream API butuh user_id — gunakan auth_type=user
  // seller juga bisa pakai auth_type=user untuk mendapatkan user_id
  const authType = req.query.auth_type || 'user';
  const url = getAuthUrl(SHOPEE_REDIRECT_URI, authType);
  res.json({ url });
}

/**
 * GET /api/shopee/auth/callback
 * Shopee redirect ke sini setelah user authorize.
 * Exchange code → access_token, lalu redirect ke frontend.
 */
export async function authCallback(req, res, next) {
  const { code, error, shop_id } = req.query;

  if (error || !code) {
    const fe = process.env.FRONTEND_URL || 'https://marketing-hub-fe.vercel.app';
    return res.redirect(`${fe}?shopee_auth_error=${error || 'no_code'}`);
  }

  try {
    // Pass shop_id jika ada (Shop auth flow)
    const data = await getAccessToken(code, shop_id || null);

    // Log response untuk debug — tampilkan semua fields
    console.log('[Shopee Auth] Full response keys:', Object.keys(data));
    console.log('[Shopee Auth] get_access_token response:', JSON.stringify(data));

    // Shopee v2 bisa return di root level atau dalam response field
    const resp          = data.response || data;
    const access_token  = resp.access_token  || data.access_token  || '';
    const refresh_token = resp.refresh_token || data.refresh_token || '';
    const expire_in     = resp.expire_in     || data.expire_in     || 14400;

    const shop_id_list  = data.shop_id_list  || resp.shop_id_list  || [];
    const user_id_list  = data.user_id_list  || resp.user_id_list  || [];

    console.log('[Shopee Auth] shop_id_list:', shop_id_list);
    console.log('[Shopee Auth] user_id_list:', user_id_list);

    const shop_id_out   = shop_id_list[0] || resp.shop_id || data.shop_id || shop_id || '';
    const user_id_out   = user_id_list[0] || resp.user_id || data.user_id || '';

    const fe     = process.env.FRONTEND_URL || 'https://marketing-hub-fe.vercel.app';
    const params = new URLSearchParams({
      access_token:  access_token,
      refresh_token: refresh_token,
      expire_in:     String(expire_in),
      shop_id:       String(shop_id_out),
      user_id:       String(user_id_out),
    });
    return res.redirect(`${fe}?shopee_auth=1&${params.toString()}`);
  } catch (err) {
    // Redirect ke frontend dengan pesan error agar tidak stuck di halaman kosong
    const fe = process.env.FRONTEND_URL || 'https://marketing-hub-fe.vercel.app';
    console.error('[Shopee Auth]', err.message);
    return res.redirect(`${fe}?shopee_auth_error=${encodeURIComponent(err.message)}`);
  }
}

/**
 * POST /api/shopee/auth/refresh
 * Refresh access_token menggunakan refresh_token
 */
export async function authRefresh(req, res, next) {
  const { refresh_token, user_id } = req.body;
  if (!refresh_token || !user_id)
    return res.status(400).json({ error: 'refresh_token dan user_id diperlukan' });
  try {
    const data = await refreshAccessToken(refresh_token, user_id);
    res.json(data);
  } catch (err) { next(err); }
}

// ── Livestream ────────────────────────────────────────

function getCredentials(req) {
  const access_token = req.headers['x-shopee-token'] || req.body?.access_token;
  const user_id      = req.headers['x-shopee-user']  || req.body?.user_id  || '';
  const shop_id      = req.headers['x-shopee-shop']  || req.body?.shop_id  || '';
  return { access_token, user_id, shop_id };
}

function requireShopeeAuth(req, res) {
  const { access_token, user_id, shop_id } = getCredentials(req);
  if (!access_token) {
    res.status(401).json({ error: 'Shopee access_token diperlukan' });
    return null;
  }
  // Minimal butuh salah satu: user_id atau shop_id
  if (!user_id && !shop_id) {
    res.status(401).json({ error: 'Shopee user_id atau shop_id diperlukan' });
    return null;
  }
  return { access_token, user_id, shop_id };
}

export async function sessionDetail(req, res, next) {
  const creds = requireShopeeAuth(req, res);
  if (!creds) return;
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id diperlukan' });
  try {
    res.json(await getSessionDetail(session_id, creds.access_token, creds.user_id, creds.shop_id));
  } catch (err) { next(err); }
}

export async function sessionMetric(req, res, next) {
  const creds = requireShopeeAuth(req, res);
  if (!creds) return;
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id diperlukan' });
  try {
    res.json(await getSessionMetric(session_id, creds.access_token, creds.user_id, creds.shop_id));
  } catch (err) { next(err); }
}

export async function sessionItemMetric(req, res, next) {
  const creds = requireShopeeAuth(req, res);
  if (!creds) return;
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id diperlukan' });
  try {
    res.json(await getSessionItemMetric(session_id, creds.access_token, creds.user_id, creds.shop_id));
  } catch (err) { next(err); }
}

export async function sessionComments(req, res, next) {
  const creds = requireShopeeAuth(req, res);
  if (!creds) return;
  const { session_id, last_comment_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id diperlukan' });
  try {
    res.json(await getLatestComments(session_id, creds.access_token, creds.user_id, creds.shop_id, last_comment_id));
  } catch (err) { next(err); }
}

export async function sessionItems(req, res, next) {
  const creds = requireShopeeAuth(req, res);
  if (!creds) return;
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id diperlukan' });
  try {
    res.json(await getItemList(session_id, creds.access_token, creds.user_id, creds.shop_id));
  } catch (err) { next(err); }
}
