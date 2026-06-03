/**
 * Backend configuration — Meta API settings loaded from env.
 */
export const META_VERSION = 'v20.0';
export const META_BASE    = `https://graph.facebook.com/${META_VERSION}`;
export const APP_ID       = process.env.META_APP_ID;
export const APP_SECRET   = process.env.META_APP_SECRET;

export const CPAS_EXTRA_FIELDS =
  ',catalog_segment_actions,catalog_segment_value,catalog_segment_value_omni_purchase_roas';

// ── Shopee Live API ───────────────────────────────────
export const SHOPEE_BASE       = 'https://partner.shopeemobile.com';
export const SHOPEE_PARTNER_ID = parseInt(process.env.SHOPEE_PARTNER_ID || '0', 10);
export const SHOPEE_PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';
// Redirect URI harus sama dengan yang didaftarkan di Shopee Open Platform
export const SHOPEE_REDIRECT_URI = process.env.SHOPEE_REDIRECT_URI || 'https://marketing-hub-be.vercel.app/api/shopee/auth/callback';
