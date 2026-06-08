/**
 * Host Performance Model
 * Aggregate livestream metrics per host dari data yang sudah di-assign.
 */
import { supabase } from '../lib/supabase.js';

export async function getHostPerformance({ since = '', until = '' } = {}) {
  // Ambil semua session-host assignments dengan data session
  let query = supabase
    .from('shopee_session_hosts')
    .select(`
      host_id,
      shopee_livestream_hosts ( id, name, phone ),
      shopee_livestream_sessions (
        session_id, start_date,
        total_views, unique_viewers, duration_minutes,
        new_followers, likes, comments,
        buyers, atc_units, units_sold, orders,
        gross_sales_local, net_sales_local, conversion_rate
      )
    `);

  if (since) query = query.gte('shopee_livestream_sessions.start_date', since);
  if (until) query = query.lte('shopee_livestream_sessions.start_date', until + 'T23:59:59');

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Group by host_id dan aggregate metrics
  const hostMap = {};

  (data || []).forEach(row => {
    const host = row.shopee_livestream_hosts;
    const sess = row.shopee_livestream_sessions;
    if (!host || !sess) return;

    const hid = host.id;
    if (!hostMap[hid]) {
      hostMap[hid] = {
        host_id:        hid,
        host_name:      host.name,
        host_phone:     host.phone || '',
        total_sessions: 0,
        total_views:    0,
        total_unique:   0,
        total_duration: 0,
        total_followers:0,
        total_likes:    0,
        total_comments: 0,
        total_buyers:   0,
        total_atc:      0,
        total_units:    0,
        total_orders:   0,
        total_gross:    0,
        total_net:      0,
        sessions:       [],
      };
    }

    const h = hostMap[hid];
    h.total_sessions += 1;
    h.total_views    += parseFloat(sess.total_views    || 0);
    h.total_unique   += parseFloat(sess.unique_viewers || 0);
    h.total_duration += parseFloat(sess.duration_minutes || 0);
    h.total_followers+= parseFloat(sess.new_followers  || 0);
    h.total_likes    += parseFloat(sess.likes          || 0);
    h.total_comments += parseFloat(sess.comments       || 0);
    h.total_buyers   += parseFloat(sess.buyers         || 0);
    h.total_atc      += parseFloat(sess.atc_units      || 0);
    h.total_units    += parseFloat(sess.units_sold     || 0);
    h.total_orders   += parseFloat(sess.orders         || 0);
    h.total_gross    += parseFloat(sess.gross_sales_local || 0);
    h.total_net      += parseFloat(sess.net_sales_local   || 0);
    h.sessions.push(sess.session_id);
  });

  // Hitung averages dan score
  return Object.values(hostMap).map(h => {
    const n = h.total_sessions || 1;
    return {
      ...h,
      avg_views:    Math.round(h.total_views    / n),
      avg_orders:   +(h.total_orders  / n).toFixed(1),
      avg_gross:    +(h.total_gross   / n).toFixed(0),
      avg_duration: +(h.total_duration/ n).toFixed(0),
      avg_cr:       h.total_unique > 0
        ? +((h.total_buyers / h.total_unique) * 100).toFixed(2)
        : 0,
      // Performance score: weighted composite
      // orders (40%) + gross (30%) + views (20%) + followers (10%)
      score: +(
        (h.total_orders   / n) * 40 +
        (h.total_gross    / n) * 0.001 * 30 +
        (h.total_views    / n) * 0.01  * 20 +
        (h.total_followers/ n) * 10
      ).toFixed(1),
    };
  }).sort((a, b) => b.score - a.score);
}
