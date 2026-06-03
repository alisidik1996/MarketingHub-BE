/**
 * Express app — entry point untuk local dev dan Vercel serverless.
 *
 * Local dev  : node --env-file=.env app.js
 * Vercel     : export default app (handler)
 */
import express from 'express';
import cors    from 'cors';
import metaRoutes        from './routes/meta.js';
import shopeeRoutes      from './routes/shopee.js';
import { errorHandler }  from './middleware/errorHandler.js';
import { rateLimit }     from './middleware/rateLimit.js';

const app = express();

const ALLOWED_ORIGINS = [
  'https://marketing-hub-fe.vercel.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (e.g. curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// Rate limit: 60 requests per menit per IP
app.use(rateLimit(60, 60_000));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use('/api/meta',   metaRoutes);
app.use('/api/shopee', shopeeRoutes);
app.use(errorHandler);

// Local dev — jalankan server jika dipanggil langsung
// VERCEL_ENV di-set otomatis oleh Vercel, jadi kita skip listen di sana
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend running → http://localhost:${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Vercel serverless export
export default app;
