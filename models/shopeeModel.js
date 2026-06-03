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
 */
function buildUserQuery(apiPath, accessToken, userId) {
  const ts   = Math.floor(Date.now() / 1000);
  const sign = signUser(apiPath, ts, accessToken, userId);
  return `partner_id=${SHOPEE_PARTNER_ID}&timestamp=${ts}&access_token=${accessToken}&user_id=${userId}&sign=${sign}`;
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
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error && data.error !== '') {
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
  const data = await res.json();
  console.log('[Shopee] Response:', JSON.stringify(data));
  // Hanya throw jika benar-benar ada error (bukan string kosong)
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
  const apiPath = '/api/v2/public/get_access_token';
  const query   = buildPublicQuery(apiPath);
  const body    = { code, partner_id: SHOPEE_PARTNER_ID };
  // Jika dari Shop auth (bukan Livestream), sertakan shop_id
  if (shopId) body.shop_id = parseInt(shopId, 10);
  return shopeeAuthPost(apiPath, query, body);
}

// ── Auth: Refresh access_token ────────────────────────

export async function refreshAccessToken(refreshToken, userId, shopId = null) {
  const apiPath = '/api/v2/public/refresh_access_token';
  const query   = buildPublicQuery(apiPath);
  const body    = {
    refresh_token: refreshToken,
    partner_id:    SHOPEE_PARTNER_ID,
  };
  if (userId)  body.user_id  = parseInt(userId, 10);
  if (shopId)  body.shop_id  = parseInt(shopId, 10);
  return shopeeAuthPost(apiPath, query, body);
}

// ── Livestream: Session ───────────────────────────────

export async function getSessionDetail(sessionId, accessToken, userId) {
  const apiPath = '/api/v2/livestream/get_session_detail';
  const query   = buildUserQuery(apiPath, accessToken, userId);
  return shopeeGet(apiPath, `${query}&session_id=${sessionId}`);
}

export async function getSessionMetric(sessionId, accessToken, userId) {
  const apiPath = '/api/v2/livestream/get_session_metric';
  const query   = buildUserQuery(apiPath, accessToken, userId);
  return shopeeGet(apiPath, `${query}&session_id=${sessionId}`);
}

export async function getSessionItemMetric(sessionId, accessToken, userId) {
  const apiPath = '/api/v2/livestream/get_session_item_metric';
  const query   = buildUserQuery(apiPath, accessToken, userId);
  return shopeeGet(apiPath, `${query}&session_id=${sessionId}`);
}

export async function getLatestComments(sessionId, accessToken, userId, lastCommentId = 0) {
  const apiPath = '/api/v2/livestream/get_latest_comment_list';
  const query   = buildUserQuery(apiPath, accessToken, userId);
  const extra   = lastCommentId ? `&last_comment_id=${lastCommentId}` : '';
  return shopeeGet(apiPath, `${query}&session_id=${sessionId}${extra}`);
}

export async function getItemList(sessionId, accessToken, userId) {
  const apiPath = '/api/v2/livestream/get_item_list';
  const query   = buildUserQuery(apiPath, accessToken, userId);
  return shopeeGet(apiPath, `${query}&session_id=${sessionId}`);
}
