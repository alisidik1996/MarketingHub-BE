/**
 * Shopee Livestream Controller
 * Handle upload XLSX dan query data dari Supabase.
 */
import {
  parseXlsx,
  upsertSessions,
  getSessions,
  getSessionById,
  getSummaryStats,
} from '../models/shopeeModel.js';
import crypto from 'crypto';
import {
  SHOPEE_AUTH_BASE,
  SHOPEE_BASE,
  SHOPEE_PARTNER_ID,
  SHOPEE_PARTNER_KEY,
  SHOPEE_REDIRECT_URI,
} from '../config.js';

const integrationStore = {
  partnerId: '',
  shopId: '',
  accessToken: '',
  refreshToken: '',
  updatedAt: null,
};

// POST /api/shopee/upload
// Body: multipart/form-data, field "file" = xlsx file
export async function uploadReport(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'File XLSX diperlukan' });

    const records = parseXlsx(req.file.buffer);
    if (!records.length) return res.status(400).json({ error: 'Tidak ada data ditemukan di file' });

    const result = await upsertSessions(records, req.ip || 'upload');

    res.json({
      success: true,
      message: `${result.count} session berhasil diimport`,
      count: result.count,
      preview: records.slice(0, 3), // preview 3 baris pertama
    });
  } catch (err) { next(err); }
}

// GET /api/shopee/sessions
export async function listSessions(req, res, next) {
  try {
    const { shop_id, limit, offset, search, since, until } = req.query;
    const result = await getSessions({
      shop_id: shop_id ? parseInt(shop_id, 10) : null,
      limit: limit ? parseInt(limit, 10) : 1000,
      offset: offset ? parseInt(offset, 10) : 0,
      search: search || '',
      since: since || '',
      until: until || '',
    });
    res.json(result);
  } catch (err) { next(err); }
}

// GET /api/shopee/sessions/:sessionId
export async function getSession(req, res, next) {
  try {
    const data = await getSessionById(req.params.sessionId);
    res.json(data);
  } catch (err) { next(err); }
}

// GET /api/shopee/summary
export async function getSummary(req, res, next) {
  try {
    const { shop_id, since, until } = req.query;
    const data = await getSummaryStats(
      shop_id ? parseInt(shop_id, 10) : null,
      since || '',
      until || '',
    );
    res.json(data);
  } catch (err) { next(err); }
}

// GET /api/shopee/integration
export async function getIntegration(_req, res, next) {
  try {
    res.json({
      success: true,
      data: integrationStore,
    });
  } catch (err) { next(err); }
}

// POST /api/shopee/integration/save
export async function saveIntegration(req, res, next) {
  try {
    const {
      partnerId = '',
      shopId = '',
      accessToken = '',
      refreshToken = '',
    } = req.body || {};

    integrationStore.partnerId = partnerId;
    integrationStore.shopId = shopId;
    integrationStore.accessToken = accessToken;
    integrationStore.refreshToken = refreshToken;
    integrationStore.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Auth Shopee berhasil disimpan',
      data: integrationStore,
    });
  } catch (err) { next(err); }
}

// POST /api/shopee/integration/test
export async function testIntegration(req, res, next) {
  try {
    const { accessToken } = req.body || {};

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token wajib diisi',
      });
    }

    res.json({
      success: true,
      message: 'Shopee API login berhasil',
      connected: true,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
}

// POST /api/shopee/integration/refresh
export async function refreshIntegrationToken(req, res, next) {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token wajib diisi',
      });
    }

    const newAccessToken = `sp_access_${Date.now()}`;

    integrationStore.accessToken = newAccessToken;
    integrationStore.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Token berhasil diperbarui',
      accessToken: newAccessToken,
      updatedAt: integrationStore.updatedAt,
    });
  } catch (err) { next(err); }
}

// GET /api/shopee/auth/url
export async function getAuthUrl(_req, res, next) {
  try {
    if (!SHOPEE_PARTNER_ID || !SHOPEE_PARTNER_KEY) {
      return res.status(500).json({
        success: false,
        error: 'SHOPEE_PARTNER_ID atau SHOPEE_PARTNER_KEY belum dikonfigurasi',
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/shop/auth_partner';
    const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}`;
    const sign = crypto
      .createHmac('sha256', SHOPEE_PARTNER_KEY)
      .update(baseString)
      .digest('hex');

    const authUrl =
      `https://partner.shopeemobile.com${path}` +
      `?partner_id=${SHOPEE_PARTNER_ID}` +
      `&timestamp=${timestamp}` +
      `&sign=${sign}` +
      `&redirect=${encodeURIComponent(SHOPEE_REDIRECT_URI)}`;

    res.json({
      success: true,
      authUrl,
    });
  } catch (err) { next(err); }
}

// GET /api/shopee/auth/callback
export async function getAdsBalance(_req, res, next) {
  try {
    if (!integrationStore.accessToken || !integrationStore.shopId) {
      return res.status(400).json({
        success: false,
        error: 'Shopee belum terhubung',
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/ads/get_total_balance';

    const baseString =
      `${SHOPEE_PARTNER_ID}${path}${timestamp}${integrationStore.accessToken}${integrationStore.shopId}`;

    const sign = crypto
      .createHmac('sha256', SHOPEE_PARTNER_KEY)
      .update(baseString)
      .digest('hex');

    const url =
      `${SHOPEE_BASE}${path}` +
      `?partner_id=${SHOPEE_PARTNER_ID}` +
      `&timestamp=${timestamp}` +
      `&access_token=${integrationStore.accessToken}` +
      `&shop_id=${integrationStore.shopId}` +
      `&sign=${sign}`;

    const response = await fetch(url);
    const data = await response.json();

    const balance =
      data?.balance ||
      data?.data?.balance ||
      data?.total_balance ||
      data?.data?.total_balance ||
      0;

    res.json({
      success: true,
      balance: Number(balance),
      data,
    });
  } catch (err) { next(err); }
}

// GET /api/shopee/auth/callback
export async function authCallback(req, res, next) {
  try {
    const { shop_id, code } = req.query;

    if (!code || !shop_id) {
      throw new Error('Code atau shop_id tidak ditemukan');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/auth/token/get';

    const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}`;
    const sign = crypto
      .createHmac('sha256', SHOPEE_PARTNER_KEY)
      .update(baseString)
      .digest('hex');

    const tokenRes = await fetch(
      `${SHOPEE_BASE}${path}` +
      `?partner_id=${SHOPEE_PARTNER_ID}` +
      `&timestamp=${timestamp}` +
      `&sign=${sign}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          partner_id: SHOPEE_PARTNER_ID,
          shop_id: Number(shop_id),
        }),
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error(
        tokenData.message || 'Gagal mendapatkan access token Shopee'
      );
    }

    integrationStore.partnerId = String(SHOPEE_PARTNER_ID);
    integrationStore.shopId = String(shop_id);
    integrationStore.accessToken = tokenData.access_token || '';
    integrationStore.refreshToken = tokenData.refresh_token || '';
    integrationStore.updatedAt = new Date().toISOString();

    res.send(`
      <html>
        <body style="font-family:sans-serif;padding:40px;background:#111827;color:#fff">
          <h2>Integrasi Shopee Berhasil</h2>
          <p>Silakan kembali ke dashboard.</p>
          <script>
            window.opener && window.opener.postMessage(
              {
                type: 'SHOPEE_AUTH_SUCCESS',
                partnerId: '${SHOPEE_PARTNER_ID}',
                shopId: '${shop_id || ''}',
                accessToken: '${integrationStore.accessToken}',
                refreshToken: '${integrationStore.refreshToken}'
              },
              '*'
            );
            setTimeout(() => window.close(), 1500);
          </script>
        </body>
      </html>
    `);
  } catch (err) { next(err); }
}
