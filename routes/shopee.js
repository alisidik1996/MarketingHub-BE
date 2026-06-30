/**
 * Shopee Livestream Routes
 */
import { Router } from 'express';
import multer from 'multer';
import {
  uploadReport,
  listSessions,
  getSession,
  getSummary,
  getIntegration,
  saveIntegration,
  testIntegration,
  refreshIntegrationToken,
  getAuthUrl,
  authCallback,
} from '../controllers/shopeeController.js';
import {
  listHosts, addHost, editHost, removeHost,
  sessionHosts, assignSessionHost, unassignSessionHost, sessionHostMap,
  hostPerformance
}
  from '../controllers/hostController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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
router.post('/upload', upload.single('file'), uploadReport);
router.get('/sessions', listSessions);
router.get('/sessions/:sessionId', getSession);
router.get('/summary', getSummary);

// Hosts CRUD
router.get('/hosts', listHosts);
router.post('/hosts', addHost);
router.put('/hosts/:id', editHost);
router.delete('/hosts/:id', removeHost);

// Session ↔ Host Assignment
router.get('/session-hosts', sessionHostMap);
router.get('/sessions/:sessionId/hosts', sessionHosts);
router.post('/sessions/:sessionId/hosts', assignSessionHost);
router.delete('/sessions/:sessionId/hosts/:hostId', unassignSessionHost);

// Host Performance
router.get('/host-performance', hostPerformance);

// Shopee Integration
router.get('/integration', getIntegration);
router.post('/integration/save', saveIntegration);
router.post('/integration/test', testIntegration);
router.post('/integration/refresh', refreshIntegrationToken);

// Shopee OAuth
router.get('/auth/url', getAuthUrl);
router.get('/auth/callback', authCallback);

export default router;
