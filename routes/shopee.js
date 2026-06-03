/**
 * Shopee Livestream Routes
 */
import { Router }  from 'express';
import multer      from 'multer';
import {
  uploadReport,
  listSessions,
  getSession,
  getSummary,
} from '../controllers/shopeeController.js';

// Simpan file di memory (tidak ke disk) — max 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.includes('spreadsheet') ||
               file.mimetype.includes('excel') ||
               file.originalname.endsWith('.xlsx') ||
               file.originalname.endsWith('.xls');
    cb(ok ? null : new Error('Hanya file XLSX yang diizinkan'), ok);
  },
});

const router = Router();

router.post('/upload',           upload.single('file'), uploadReport);
router.get('/sessions',          listSessions);
router.get('/sessions/:sessionId', getSession);
router.get('/summary',           getSummary);

export default router;
