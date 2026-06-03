/**
 * Global error handler — harus di-register paling terakhir.
 * Di production, pesan error internal tidak dikirim ke client.
 */
export function errorHandler(err, _req, res, _next) {
  const isProd = process.env.NODE_ENV === 'production';

  console.error('[ERROR]', err.message);

  // CORS error — jangan expose detail internal
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Error dari Meta API — aman untuk dikirim ke client
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // Server error — sembunyikan detail di production
  res.status(500).json({
    error: isProd ? 'Internal server error' : err.message,
  });
}
