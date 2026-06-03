/**
 * Meta Controller — handle HTTP req/res, delegate ke model.
 */
import {
  inspectToken,
  extendToken,
  getAccount,
  getCampaigns,
  getInsights,
  getAdSets,
  getAds,
} from '../models/metaModel.js';

// ── Validators ────────────────────────────────────────

// Meta token: hanya alphanumeric + beberapa karakter valid
const TOKEN_RE    = /^[A-Za-z0-9_\-|]+$/;
// ID numerik saja
const ID_RE       = /^\d+$/;
// Date: YYYY-MM-DD
const DATE_RE     = /^\d{4}-\d{2}-\d{2}$/;

function isValidToken(t) {
  return typeof t === 'string' && t.length > 10 && t.length < 500 && TOKEN_RE.test(t);
}

function isValidId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

function isValidDate(d) {
  return !d || (typeof d === 'string' && DATE_RE.test(d));
}

// ── Controllers ───────────────────────────────────────

export async function tokenInspect(req, res, next) {
  const { token } = req.body;
  if (!token || !isValidToken(token))
    return res.status(400).json({ error: 'token tidak valid' });
  try {
    res.json(await inspectToken(token));
  } catch (err) { next(err); }
}

export async function tokenExtend(req, res, next) {
  const { token } = req.body;
  if (!token || !isValidToken(token))
    return res.status(400).json({ error: 'token tidak valid' });
  try {
    res.json(await extendToken(token));
  } catch (err) { next(err); }
}

export async function account(req, res, next) {
  const { accountId } = req.body;
  if (!accountId || !isValidId(accountId))
    return res.status(400).json({ error: 'accountId tidak valid' });
  try {
    res.json(await getAccount(accountId, req.metaToken));
  } catch (err) { next(err); }
}

export async function campaigns(req, res, next) {
  const { accountId } = req.body;
  if (!accountId || !isValidId(accountId))
    return res.status(400).json({ error: 'accountId tidak valid' });
  try {
    res.json(await getCampaigns(accountId, req.metaToken));
  } catch (err) { next(err); }
}

export async function insights(req, res, next) {
  const { accountId, fields, since, until, level, timeIncrement } = req.body;
  if (!accountId || !isValidId(accountId))
    return res.status(400).json({ error: 'accountId tidak valid' });
  if (!fields || typeof fields !== 'string')
    return res.status(400).json({ error: 'fields diperlukan' });
  if (!isValidDate(since) || !isValidDate(until))
    return res.status(400).json({ error: 'format tanggal tidak valid (YYYY-MM-DD)' });
  try {
    res.json(await getInsights(accountId, { fields, since, until, level, timeIncrement }, req.metaToken));
  } catch (err) { next(err); }
}

export async function adsets(req, res, next) {
  const { campaignId, since, until, isCpas } = req.body;
  if (!campaignId || !isValidId(campaignId))
    return res.status(400).json({ error: 'campaignId tidak valid' });
  if (!isValidDate(since) || !isValidDate(until))
    return res.status(400).json({ error: 'format tanggal tidak valid (YYYY-MM-DD)' });
  try {
    res.json(await getAdSets(campaignId, { since, until, isCpas }, req.metaToken));
  } catch (err) { next(err); }
}

export async function ads(req, res, next) {
  const { campaignId, since, until, isCpas, adsetId } = req.body;
  if (!campaignId || !isValidId(campaignId))
    return res.status(400).json({ error: 'campaignId tidak valid' });
  if (adsetId && !isValidId(adsetId))
    return res.status(400).json({ error: 'adsetId tidak valid' });
  if (!isValidDate(since) || !isValidDate(until))
    return res.status(400).json({ error: 'format tanggal tidak valid (YYYY-MM-DD)' });
  try {
    res.json(await getAds(campaignId, { since, until, isCpas, adsetId }, req.metaToken));
  } catch (err) { next(err); }
}
