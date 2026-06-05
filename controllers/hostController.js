/**
 * Host Controller — CRUD untuk Shopee Livestream hosts.
 */
import { getAllHosts, createHost, updateHost, deleteHost } from '../models/hostModel.js';

export async function listHosts(req, res, next) {
  try {
    console.log('[Host] GET - SUPABASE_URL:', process.env.SUPABASE_URL ? 'set' : 'NOT SET');
    console.log('[Host] GET - SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'set' : 'NOT SET');
    const result = await getAllHosts();
    console.log('[Host] GET success, count:', result.length);
    res.json(result);
  }
  catch (err) {
    console.error('[Host] GET error:', err.message, err.stack);
    next(err);
  }
}

export async function addHost(req, res, next) {
  try {
    console.log('[Host] POST body:', req.body);
    res.status(201).json(await createHost(req.body));
  }
  catch (err) {
    console.error('[Host] POST error:', err.message);
    next(err);
  }
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
