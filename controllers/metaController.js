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

export async function tokenInspect(req, res, next) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    res.json(await inspectToken(token));
  } catch (err) { next(err); }
}

export async function tokenExtend(req, res, next) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    res.json(await extendToken(token));
  } catch (err) { next(err); }
}

export async function account(req, res, next) {
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });
  try {
    res.json(await getAccount(accountId, req.metaToken));
  } catch (err) { next(err); }
}

export async function campaigns(req, res, next) {
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });
  try {
    res.json(await getCampaigns(accountId, req.metaToken));
  } catch (err) { next(err); }
}

export async function insights(req, res, next) {
  const { accountId, fields, since, until, level, timeIncrement } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });
  if (!fields)    return res.status(400).json({ error: 'fields required' });
  try {
    res.json(await getInsights(accountId, { fields, since, until, level, timeIncrement }, req.metaToken));
  } catch (err) { next(err); }
}

export async function adsets(req, res, next) {
  const { campaignId, since, until, isCpas } = req.body;
  if (!campaignId) return res.status(400).json({ error: 'campaignId required' });
  try {
    res.json(await getAdSets(campaignId, { since, until, isCpas }, req.metaToken));
  } catch (err) { next(err); }
}

export async function ads(req, res, next) {
  const { campaignId, since, until, isCpas, adsetId } = req.body;
  if (!campaignId) return res.status(400).json({ error: 'campaignId required' });
  try {
    res.json(await getAds(campaignId, { since, until, isCpas, adsetId }, req.metaToken));
  } catch (err) { next(err); }
}
