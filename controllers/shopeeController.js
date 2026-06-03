/**
 * Shopee Livestream Controller
 * Handle upload XLSX dan query data dari Supabase.
 */
import {
  parseXlsx,
  upsertSessions,
  getSessions,
  getSessionById,
  getSummaryStats,
} from '../models/shopeeModel.js';

// POST /api/shopee/upload
// Body: multipart/form-data, field "file" = xlsx file
export async function uploadReport(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'File XLSX diperlukan' });

    const records = parseXlsx(req.file.buffer);
    if (!records.length) return res.status(400).json({ error: 'Tidak ada data ditemukan di file' });

    const result = await upsertSessions(records, req.ip || 'upload');

    res.json({
      success:  true,
      message:  `${result.count} session berhasil diimport`,
      count:    result.count,
      preview:  records.slice(0, 3), // preview 3 baris pertama
    });
  } catch (err) { next(err); }
}

// GET /api/shopee/sessions
export async function listSessions(req, res, next) {
  try {
    const { shop_id, limit, offset, search } = req.query;
    const result = await getSessions({
      shop_id: shop_id ? parseInt(shop_id, 10) : null,
      limit:   limit  ? parseInt(limit, 10)  : 100,
      offset:  offset ? parseInt(offset, 10) : 0,
      search:  search || '',
    });
    res.json(result);
  } catch (err) { next(err); }
}

// GET /api/shopee/sessions/:sessionId
export async function getSession(req, res, next) {
  try {
    const data = await getSessionById(req.params.sessionId);
    res.json(data);
  } catch (err) { next(err); }
}

// GET /api/shopee/summary
export async function getSummary(req, res, next) {
  try {
    const { shop_id } = req.query;
    const data = await getSummaryStats(shop_id ? parseInt(shop_id, 10) : null);
    res.json(data);
  } catch (err) { next(err); }
}
