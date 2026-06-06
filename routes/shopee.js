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
import { listHosts, addHost, editHost, removeHost,
         sessionHosts, assignSessionHost, unassignSessionHost, sessionHostMap }
  from '../controllers/hostController.js';

// ...existing imports above stay the same

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

// Sessions
router.post('/upload',             upload.single('file'), uploadReport);
router.get('/sessions',            listSessions);
router.get('/sessions/:sessionId', getSession);
router.get('/summary',             getSummary);

// Hosts CRUD
router.get('/hosts',       listHosts);
router.post('/hosts',      addHost);
router.put('/hosts/:id',   editHost);
router.delete('/hosts/:id',removeHost);

// Session ↔ Host Assignment
router.get('/session-hosts',                          sessionHostMap);
router.get('/sessions/:sessionId/hosts',              sessionHosts);
router.post('/sessions/:sessionId/hosts',             assignSessionHost);
router.delete('/sessions/:sessionId/hosts/:hostId',   unassignSessionHost);

export default router;
