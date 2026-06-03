/**
 * Global error handler — harus di-register paling terakhir.
 */
export function errorHandler(err, _req, res, _next) {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message });
}
