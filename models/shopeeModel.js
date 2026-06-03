/**
 * Shopee Live API Model
 * Handles auth, signature, and all Shopee Live API calls.
 * Region: ID (Indonesia) — https://partner.shopeemobile.com
 */
import crypto from 'crypto';
import fetch  from 'node-fetch';
import {
  SHOPEE_BASE,
  SHOPEE_AUTH_BASE,
  SHOPEE_PARTNER_ID,
  SHOPEE_PARTNER_KEY,
} from '../config.js';

// ── Signature helpers ─────────────────────────────────

/**
 * Generate signature for PUBLIC endpoints (no access_token/user_id)
 * Base string: partner_id + api_path + timestamp
 */
export function signPublic(apiPath, timestamp) {
  const base = `${SHOPEE_PARTNER_ID}${apiPath}${timestamp}`;
  return crypto.createHmac('sha256', SHOPEE_PARTNER_KEY)
    .update(base)
    .digest('hex');
}

/**
 * Generate signature for USER/LIVESTREAM endpoints
 * Base string: partner_id + api_path + timestamp + access_token + user_id
 */
export function signUser(apiPath, timestamp, accessToken, userId) {
  const base = `${SHOPEE_PARTNER_ID}${apiPath}${timestamp}${accessToken}${userId}`;
  return crypto.createHmac('sha256', SHOPEE_PARTNER_KEY)
    .update(base)
    .digest('hex');
}

/**
 * Build query string with common auth params (public endpoints)
 */
function buildPublicQuery(apiPath) {
  const ts   = Math.floor(Date.now() / 1000);
  const sign = signPublic(apiPath, ts);
  return `partner_id=${SHOPEE_PARTNER_ID}&timestamp=${ts}&sign=${sign}`;
}

/**
 * Build query string with common auth params (user/livestream endpoints)
 * Base string: partner_id + api_path + timestamp + access_token + user_id
 */
function buildUserQuery(apiPath, accessToken, userId) {
  const ts   = Math.floor(Date.now() / 1000);
  const sign = signUser(apiPath, ts, accessToken, userId);
  return `partner_id=${SHOPEE_PARTNER_ID}&timestamp=${ts}&access_token=${accessToken}&user_id=${userId}&sign=${sign}`;
}

/**
 * Build query string — Shop-type endpoints (pakai shop_id)
 * Base string: partner_id + api_path + timestamp + access_token + shop_id
 */
function buildShopQuery(apiPath, accessToken, shopId) {
  const ts   = Math.floor(Date.now() / 1000);
  const base = `${SHOPEE_PARTNER_ID}${apiPath}${ts}${accessToken}${shopId}`;
  const sign = crypto.createHmac('sha256', SHOPEE_PARTNER_KEY).update(base).digest('hex');
  return `partner_id=${SHOPEE_PARTNER_ID}&timestamp=${ts}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;
}

// ── Base fetch ────────────────────────────────────────

async function shopeeGet(apiPath, query) {
  const url  = `${SHOPEE_BASE}${apiPath}?${query}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.error && data.error !== '') {
    const err  = new Error(data.message || data.error);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function shopeePost(apiPath, query, body) {
  const url  = `${SHOPEE_BASE}${apiPath}?${query}`;
  console.log('[Shopee] POST', url, JSON.stringify(body));
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const rawText = await res.text();
  console.log('[Shopee] Raw response:', rawText.slice(0, 500));
  let data;
  try { data = JSON.parse(rawText); }
  catch { throw new Error(`Response bukan JSON (HTTP ${res.status}): ${rawText.slice(0, 200)}`); }
  if (data.error && data.error !== '' && data.error !== 'success') {
    const err  = new Error(data.message || data.error);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Auth calls pakai open.shopee.com (bukan partner.shopeemobile.com)
async function shopeeAuthPost(apiPath, query, body) {
  const url  = `${SHOPEE_AUTH_BASE}${apiPath}?${query}`;
  console.log('[Shopee] POST', url, JSON.stringify(body));
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const rawText = await res.text();
  console.log('[Shopee] Raw response:', rawText.slice(0, 500));

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Shopee response bukan JSON (HTTP ${res.status}): ${rawText.slice(0, 200)}`);
  }

  if (data.error && data.error !== '' && data.error !== 'success') {
    const err  = new Error(data.message || data.error);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Auth: Generate authorization URL ─────────────────

export function getAuthUrl(redirectUri, authType = 'seller') {
  const apiPath = '/api/v2/shop/auth_partner';
  const ts      = Math.floor(Date.now() / 1000);
  const sign    = signPublic(apiPath, ts);
  const params  = new URLSearchParams({
    partner_id:    SHOPEE_PARTNER_ID,
    timestamp:     ts,
    sign,
    redirect:      redirectUri,
    auth_type:     authType,
  });
  // Untuk Livestream, gunakan open.shopee.com/auth (bukan shop/auth_partner)
  const authBase = 'https://open.shopee.com/auth';
  const liveParams = new URLSearchParams({
    partner_id:    SHOPEE_PARTNER_ID,
    auth_type:     authType,
    redirect_uri:  redirectUri,
    response_type: 'code',
  });
  return `${authBase}?${liveParams.toString()}`;
}

// ── Auth: Exchange code for access_token ──────────────

export async function getAccessToken(code, shopId = null) {
  // Shopee v2 standard: partner.shopeemobile.com/api/v2/auth/token/get
  const apiPath = '/api/v2/auth/token/get';
  const query   = buildPublicQuery(apiPath);
  const body    = { code, partner_id: SHOPEE_PARTNER_ID };
  if (shopId) body.shop_id = parseInt(shopId, 10);
  // Pakai SHOPEE_BASE (partner.shopeemobile.com) bukan open.shopee.com
  return shopeePost(apiPath, query, body);
}

// ── Auth: Refresh access_token ────────────────────────

export async function refreshAccessToken(refreshToken, userId, shopId = null) {
  // Shopee v2 standard: /api/v2/auth/access_token/get
  const apiPath = '/api/v2/auth/access_token/get';
  const query   = buildPublicQuery(apiPath);
  const body    = {
    refresh_token: refreshToken,
    partner_id:    SHOPEE_PARTNER_ID,
  };
  if (userId)  body.user_id  = parseInt(userId, 10);
  if (shopId)  body.shop_id  = parseInt(shopId, 10);
  return shopeePost(apiPath, query, body);
}

// ── Livestream: Session ───────────────────────────────
// Shopee Livestream API butuh user_id, tapi jika hanya punya shop_id
// kita coba pakai shop_id sebagai user_id (beberapa endpoint support ini)

function buildQuery(apiPath, accessToken, userId, shopId) {
  if (userId && userId !== '0' && userId !== '') {
    return buildUserQuery(apiPath, accessToken, userId);
  }
  // Fallback: pakai shop_id
  return buildShopQuery(apiPath, accessToken, shopId);
}

export async function getSessionDetail(sessionId, accessToken, userId, shopId = '') {
  const apiPath = '/api/v2/livestream/get_session_detail';
  const query   = buildQuery(apiPath, accessToken, userId, shopId);
  return shopeeGet(apiPath, `${query}&session_id=${sessionId}`);
}

export async function getSessionMetric(sessionId, accessToken, userId, shopId = '') {
  const apiPath = '/api/v2/livestream/get_session_metric';
  const query   = buildQuery(apiPath, accessToken, userId, shopId);
  return shopeeGet(apiPath, `${query}&session_id=${sessionId}`);
}

export async function getSessionItemMetric(sessionId, accessToken, userId, shopId = '') {
  const apiPath = '/api/v2/livestream/get_session_item_metric';
  const query   = buildQuery(apiPath, accessToken, userId, shopId);
  return shopeeGet(apiPath, `${query}&session_id=${sessionId}`);
}

export async function getLatestComments(sessionId, accessToken, userId, shopId = '', lastCommentId = 0) {
  const apiPath = '/api/v2/livestream/get_latest_comment_list';
  const query   = buildQuery(apiPath, accessToken, userId, shopId);
  const extra   = lastCommentId ? `&last_comment_id=${lastCommentId}` : '';
  return shopeeGet(apiPath, `${query}&session_id=${sessionId}${extra}`);
}

export async function getItemList(sessionId, accessToken, userId, shopId = '') {
  const apiPath = '/api/v2/livestream/get_item_list';
  const query   = buildQuery(apiPath, accessToken, userId, shopId);
  return shopeeGet(apiPath, `${query}&session_id=${sessionId}`);
}
