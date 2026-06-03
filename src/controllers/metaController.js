/**
 * Meta controller — handles HTTP req/res, delegates to metaService.
 */
import {
  inspectToken,
  extendToken,
  getAccount,
  getCampaigns,
  getInsights,
  getAdSets,
  getAds,
} from '../services/metaService.js';

export async function tokenInspect(req, res, next) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const data = await inspectToken(token);
    res.json(data);
  } catch (err) { next(err); }
}

export async function tokenExtend(req, res, next) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const data = await extendToken(token);
    res.json(data);
  } catch (err) { next(err); }
}

export async function account(req, res, next) {
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });
  try {
    const data = await getAccount(accountId, req.metaToken);
    res.json(data);
  } catch (err) { next(err); }
}

export async function campaigns(req, res, next) {
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });
  try {
    const data = await getCampaigns(accountId, req.metaToken);
    res.json(data);
  } catch (err) { next(err); }
}

export async function insights(req, res, next) {
  const { accountId, fields, since, until, level, timeIncrement } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });
  if (!fields)    return res.status(400).json({ error: 'fields required' });
  try {
    const data = await getInsights(accountId, { fields, since, until, level, timeIncrement }, req.metaToken);
    res.json(data);
  } catch (err) { next(err); }
}

export async function adsets(req, res, next) {
  const { campaignId, since, until, isCpas } = req.body;
  if (!campaignId) return res.status(400).json({ error: 'campaignId required' });
  try {
    const data = await getAdSets(campaignId, { since, until, isCpas }, req.metaToken);
    res.json(data);
  } catch (err) { next(err); }
}

export async function ads(req, res, next) {
  const { campaignId, since, until, isCpas, adsetId } = req.body;
  if (!campaignId) return res.status(400).json({ error: 'campaignId required' });
  try {
    const data = await getAds(campaignId, { since, until, isCpas, adsetId }, req.metaToken);
    res.json(data);
  } catch (err) { next(err); }
}
