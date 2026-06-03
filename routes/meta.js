/**
 * Meta Routes — bind endpoints ke controller.
 */
import { Router } from 'express';
import { requireToken } from '../middleware/auth.js';
import {
  tokenInspect,
  tokenExtend,
  account,
  campaigns,
  insights,
  adsets,
  ads,
} from '../controllers/metaController.js';

const router = Router();

// Token (no auth)
router.post('/token/inspect', tokenInspect);
router.post('/token/extend',  tokenExtend);

// Serve fallback token dari env ke frontend (GET, no auth)
router.get('/token/fallback', (_req, res) => {
  const token = process.env.META_FALLBACK_TOKEN || '';
  if (!token) return res.status(404).json({ error: 'Fallback token tidak dikonfigurasi' });
  res.json({ token });
});

// Protected
router.post('/account',   requireToken, account);
router.post('/campaigns', requireToken, campaigns);
router.post('/insights',  requireToken, insights);
router.post('/adsets',    requireToken, adsets);
router.post('/ads',       requireToken, ads);

export default router;
