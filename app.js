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
import botRoutes         from './routes/bot.js';
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
    // Allow no-origin requests (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Jangan throw Error — return false agar CORS header tidak di-set
    // tapi juga tidak crash serverless function
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Handle CORS preflight OPTIONS secara eksplisit
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Rate limit setelah CORS dan health check
app.use(rateLimit(60, 60_000));

app.use('/api/meta',   metaRoutes);
app.use('/api/shopee', shopeeRoutes);
app.use('/api/bot',    botRoutes);
app.use(errorHandler);

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend running → http://localhost:${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
