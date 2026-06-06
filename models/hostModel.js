/**
 * Shopee Livestream Host Model — CRUD operations via Supabase.
 */
import { supabase } from '../lib/supabase.js';

export async function getAllHosts() {
  const { data, error } = await supabase
    .from('shopee_livestream_hosts')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createHost({ name, phone, notes }) {
  if (!name?.trim()) throw new Error('Nama host diperlukan');
  const { data, error } = await supabase
    .from('shopee_livestream_hosts')
    .insert({ name: name.trim(), phone: phone?.trim() || null, notes: notes?.trim() || null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateHost(id, { name, phone, notes }) {
  if (!name?.trim()) throw new Error('Nama host diperlukan');
  const { data, error } = await supabase
    .from('shopee_livestream_hosts')
    .update({ name: name.trim(), phone: phone?.trim() || null, notes: notes?.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteHost(id) {
  const { error } = await supabase
    .from('shopee_livestream_hosts')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ── Session ↔ Host Assignment ─────────────────────────

export async function getSessionHosts(sessionId) {
  const { data, error } = await supabase
    .from('shopee_session_hosts')
    .select('host_id, assigned_at, shopee_livestream_hosts(id, name, phone)')
    .eq('session_id', sessionId);
  if (error) throw new Error(error.message);
  return (data || []).map(r => ({ ...r.shopee_livestream_hosts, assigned_at: r.assigned_at }));
}

export async function assignHost(sessionId, hostId) {
  const { data, error } = await supabase
    .from('shopee_session_hosts')
    .upsert({ session_id: sessionId, host_id: hostId }, { onConflict: 'session_id,host_id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function unassignHost(sessionId, hostId) {
  const { error } = await supabase
    .from('shopee_session_hosts')
    .delete()
    .eq('session_id', sessionId)
    .eq('host_id', hostId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Bulk: get all session assignments (untuk dashboard tabel)
export async function getAllSessionHostMap() {
  const { data, error } = await supabase
    .from('shopee_session_hosts')
    .select('session_id, host_id, shopee_livestream_hosts(id, name)');
  if (error) throw new Error(error.message);

  // Group by session_id → { session_id: [host, ...] }
  const map = {};
  (data || []).forEach(r => {
    if (!map[r.session_id]) map[r.session_id] = [];
    map[r.session_id].push(r.shopee_livestream_hosts);
  });
  return map;
}
