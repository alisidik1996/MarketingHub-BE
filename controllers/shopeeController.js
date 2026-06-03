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
  const authType = req.query.auth_type || 'seller';
  const url = getAuthUrl(SHOPEE_REDIRECT_URI, authType);
  res.json({ url });
}

/**
 * GET /api/shopee/auth/callback
 * Shopee redirect ke sini setelah user authorize.
 * Exchange code → access_token, lalu redirect ke frontend.
 */
export async function authCallback(req, res, next) {
  const { code, error } = req.query;

  if (error || !code) {
    const fe = process.env.FRONTEND_URL || 'https://marketing-hub-fe.vercel.app';
    return res.redirect(`${fe}/shopee-auth-error?error=${error || 'no_code'}`);
  }

  try {
    const data = await getAccessToken(code);
    // Simpan token ke env tidak bisa di runtime — redirect ke frontend dengan token
    // Frontend akan kirim ke backend untuk disimpan ke store sementara (atau user copy)
    const fe     = process.env.FRONTEND_URL || 'https://marketing-hub-fe.vercel.app';
    const params = new URLSearchParams({
      access_token:  data.access_token  || '',
      refresh_token: data.refresh_token || '',
      expire_in:     data.expire_in     || 14400,
      // shop_id & user_id — ambil yang pertama jika seller
      shop_id:  (data.shop_id_list?.[0]  || data.shop_id  || '').toString(),
      user_id:  (data.user_id_list?.[0]  || data.user_id  || '').toString(),
    });
    return res.redirect(`${fe}?shopee_auth=1&${params.toString()}`);
  } catch (err) {
    next(err);
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
  const user_id      = req.headers['x-shopee-user']  || req.body?.user_id;
  return { access_token, user_id };
}

function requireShopeeAuth(req, res) {
  const { access_token, user_id } = getCredentials(req);
  if (!access_token || !user_id) {
    res.status(401).json({ error: 'Shopee access_token dan user_id diperlukan' });
    return null;
  }
  return { access_token, user_id };
}

export async function sessionDetail(req, res, next) {
  const creds = requireShopeeAuth(req, res);
  if (!creds) return;
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id diperlukan' });
  try {
    res.json(await getSessionDetail(session_id, creds.access_token, creds.user_id));
  } catch (err) { next(err); }
}

export async function sessionMetric(req, res, next) {
  const creds = requireShopeeAuth(req, res);
  if (!creds) return;
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id diperlukan' });
  try {
    res.json(await getSessionMetric(session_id, creds.access_token, creds.user_id));
  } catch (err) { next(err); }
}

export async function sessionItemMetric(req, res, next) {
  const creds = requireShopeeAuth(req, res);
  if (!creds) return;
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id diperlukan' });
  try {
    res.json(await getSessionItemMetric(session_id, creds.access_token, creds.user_id));
  } catch (err) { next(err); }
}

export async function sessionComments(req, res, next) {
  const creds = requireShopeeAuth(req, res);
  if (!creds) return;
  const { session_id, last_comment_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id diperlukan' });
  try {
    res.json(await getLatestComments(session_id, creds.access_token, creds.user_id, last_comment_id));
  } catch (err) { next(err); }
}

export async function sessionItems(req, res, next) {
  const creds = requireShopeeAuth(req, res);
  if (!creds) return;
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id diperlukan' });
  try {
    res.json(await getItemList(session_id, creds.access_token, creds.user_id));
  } catch (err) { next(err); }
}
