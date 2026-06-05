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
