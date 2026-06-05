/**
 * Global error handler — harus di-register paling terakhir.
 * Di production, pesan error internal tidak dikirim ke client.
 */
export function errorHandler(err, _req, res, _next) {
  console.error('[ERROR]', err.message, err.stack);
  res.status(err.status || 500).json({
    error: err.message, // tampilkan detail untuk debug
  });
}
