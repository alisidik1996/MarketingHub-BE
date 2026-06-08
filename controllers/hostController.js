/**
 * Host Controller — CRUD + Session Assignment untuk Shopee Livestream hosts.
 */
import {
  getAllHosts, createHost, updateHost, deleteHost,
  getSessionHosts, assignHost, unassignHost, getAllSessionHostMap,
} from '../models/hostModel.js';

// ── Host CRUD ─────────────────────────────────────────

export async function listHosts(req, res, next) {
  try { res.json(await getAllHosts()); }
  catch (err) { next(err); }
}

export async function addHost(req, res, next) {
  try { res.status(201).json(await createHost(req.body)); }
  catch (err) { next(err); }
}

export async function editHost(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  try { res.json(await updateHost(id, req.body)); }
  catch (err) { next(err); }
}

export async function removeHost(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  try { res.json(await deleteHost(id)); }
  catch (err) { next(err); }
}

// ── Session ↔ Host Assignment ─────────────────────────

export async function sessionHosts(req, res, next) {
  try { res.json(await getSessionHosts(req.params.sessionId)); }
  catch (err) { next(err); }
}

export async function assignSessionHost(req, res, next) {
  const { sessionId } = req.params;
  const { host_id }   = req.body;
  if (!host_id) return res.status(400).json({ error: 'host_id diperlukan' });
  try { res.json(await assignHost(sessionId, parseInt(host_id, 10))); }
  catch (err) { next(err); }
}

export async function unassignSessionHost(req, res, next) {
  const { sessionId, hostId } = req.params;
  try { res.json(await unassignHost(sessionId, parseInt(hostId, 10))); }
  catch (err) { next(err); }
}

export async function sessionHostMap(req, res, next) {
  try { res.json(await getAllSessionHostMap()); }
  catch (err) { next(err); }
}

// ── Host Performance ──────────────────────────────────
import { getHostPerformance } from '../models/hostPerformanceModel.js';

export async function hostPerformance(req, res, next) {
  try {
    const { since, until } = req.query;
    res.json(await getHostPerformance({ since: since||'', until: until||'' }));
  } catch (err) { next(err); }
}
