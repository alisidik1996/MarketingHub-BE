/**
 * Express app — entry point untuk local dev dan Vercel serverless.
 *
 * Local dev  : node --env-file=.env app.js
 * Vercel     : export default app (handler)
 */
import express from 'express';
import cors    from 'cors';
import metaRoutes        from './routes/meta.js';
import { errorHandler }  from './middleware/errorHandler.js';

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGIN || '*'
    : '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use('/api', metaRoutes);
app.use(errorHandler);

// Local dev — jalankan server jika dipanggil langsung
const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('app.js');
if (isMain) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend running → http://localhost:${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Vercel serverless export
export default app;
