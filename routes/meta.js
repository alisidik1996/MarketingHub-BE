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

// Protected
router.post('/account',   requireToken, account);
router.post('/campaigns', requireToken, campaigns);
router.post('/insights',  requireToken, insights);
router.post('/adsets',    requireToken, adsets);
router.post('/ads',       requireToken, ads);

export default router;
