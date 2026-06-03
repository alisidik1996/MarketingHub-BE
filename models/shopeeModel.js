/**
 * Shopee Livestream Model
 * Parse XLSX report dari Shopee dan simpan ke Supabase.
 */
import XLSX   from 'xlsx';
import { supabase } from '../lib/supabase.js';

// ── Parse XLSX buffer → array of records ─────────────

export function parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  // Cari sheet "By Livestream"
  const sheetName = wb.SheetNames.find(n =>
    n.toLowerCase().includes('livestream') || n.toLowerCase().includes('by')
  ) || wb.SheetNames[0];

  const ws   = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (rows.length < 2) throw new Error('Sheet kosong atau format tidak dikenali');

  const headers = rows[0].map(h => String(h || '').trim());
  const data    = rows.slice(1).filter(r => r.length > 0 && r[0]); // skip empty rows

  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? null; });
    return mapRow(obj);
  });
}

function mapRow(r) {
  return {
    region:              r['Region']              || '',
    shop_name:           r['Shop Name']           || '',
    shop_id:             toInt(r['Shop ID']),
    livestream_name:     r['Livestream Name']     || '',
    session_id:          toStr(r['Livestream Session ID']),
    start_date:          parseDate(r['Start Date']),
    total_views:         toInt(r['Total Views']),
    unique_viewers:      toInt(r['Unique Viewers']),
    duration_str:        r['Total Live Duration'] || '',
    duration_minutes:    toFloat(r['Total Live Duration (in Minutes)']),
    avg_duration_str:    r['Average Views Duration'] || '',
    avg_duration_minutes:toFloat(r['Average Views Duration (in Minutes)']),
    new_followers:       toInt(r['New Followers']),
    likes:               toInt(r['Likes']),
    comments:            toInt(r['Comments']),
    buyers:              toInt(r['Buyers']),
    atc_units:           toInt(r['ATC Units']),
    units_sold:          toInt(r['Units Sold']),
    orders:              toInt(r['Orders']),
    gross_sales_usd:     toFloat(r['Gross Sales(USD)']),
    gross_sales_local:   toFloat(r['Gross Sales(Local Currency)']),
    net_sales_usd:       toFloat(r['Net Sales(USD)']),
    net_sales_local:     toFloat(r['Net Sales(Local Currency)']),
    conversion_rate:     toFloat(r['CR']),
  };
}

function toInt(v)   { const n = parseInt(v, 10);  return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v);    return isNaN(n) ? 0 : n; }
function toStr(v)   { return v != null ? String(v) : ''; }

function parseDate(v) {
  if (!v) return null;
  // Format dari Shopee: "10/05/2026 14:02" (DD/MM/YYYY HH:mm)
  if (typeof v === 'string') {
    const [datePart, timePart] = v.split(' ');
    if (datePart) {
      const [d, m, y] = datePart.split('/');
      if (d && m && y) {
        const iso = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}${timePart ? 'T'+timePart+':00' : ''}`;
        return iso;
      }
    }
  }
  // Excel serial number
  if (typeof v === 'number') {
    const date = XLSX.SSF.parse_date_code(v);
    if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
  }
  return null;
}

// ── Supabase operations ───────────────────────────────

export async function upsertSessions(records, importedBy = 'manual') {
  if (!records.length) return { inserted: 0, updated: 0 };

  // Tambah metadata import
  const withMeta = records.map(r => ({
    ...r,
    imported_at: new Date().toISOString(),
    imported_by: importedBy,
  }));

  const { data, error } = await supabase
    .from('shopee_livestream_sessions')
    .upsert(withMeta, {
      onConflict:        'session_id',
      ignoreDuplicates:  false,
    })
    .select('session_id');

  if (error) throw new Error('Supabase upsert error: ' + error.message);
  return { count: data?.length || 0 };
}

export async function getSessions({ shop_id, limit = 100, offset = 0, search = '' } = {}) {
  let query = supabase
    .from('shopee_livestream_sessions')
    .select('*')
    .order('start_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (shop_id)  query = query.eq('shop_id', shop_id);
  if (search)   query = query.ilike('livestream_name', `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw new Error('Supabase query error: ' + error.message);
  return { data: data || [], count };
}

export async function getSessionById(sessionId) {
  const { data, error } = await supabase
    .from('shopee_livestream_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error) throw new Error('Session tidak ditemukan: ' + error.message);
  return data;
}

export async function getSummaryStats(shop_id) {
  let query = supabase
    .from('shopee_livestream_sessions')
    .select('total_views,unique_viewers,orders,gross_sales_local,net_sales_local,units_sold,buyers,likes,comments,new_followers,duration_minutes');

  if (shop_id) query = query.eq('shop_id', shop_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data || [];
  const sum  = (key) => rows.reduce((a, r) => a + (r[key] || 0), 0);
  const avg  = (key) => rows.length ? sum(key) / rows.length : 0;

  return {
    total_sessions:    rows.length,
    total_views:       sum('total_views'),
    total_unique:      sum('unique_viewers'),
    total_orders:      sum('orders'),
    total_gross_local: sum('gross_sales_local'),
    total_net_local:   sum('net_sales_local'),
    total_units_sold:  sum('units_sold'),
    total_buyers:      sum('buyers'),
    total_likes:       sum('likes'),
    total_comments:    sum('comments'),
    total_followers:   sum('new_followers'),
    avg_duration_min:  Math.round(avg('duration_minutes')),
    avg_orders:        (avg('orders')).toFixed(1),
    avg_views:         Math.round(avg('total_views')),
  };
}
