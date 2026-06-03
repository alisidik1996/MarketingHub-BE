/**
 * Shopee Live Routes
 */
import { Router } from 'express';
import {
  authUrl,
  authCallback,
  authRefresh,
  sessionDetail,
  sessionMetric,
  sessionItemMetric,
  sessionComments,
  sessionItems,
} from '../controllers/shopeeController.js';

const router = Router();

// ── Auth (public — no shopee token required) ──────────
router.get('/auth/url',      authUrl);
router.get('/auth/callback', authCallback);
router.post('/auth/refresh', authRefresh);

// ── Livestream (requires x-shopee-token + x-shopee-user) ──
router.get('/session/detail',      sessionDetail);
router.get('/session/metric',      sessionMetric);
router.get('/session/item-metric', sessionItemMetric);
router.get('/session/comments',    sessionComments);
router.get('/session/items',       sessionItems);

export default router;
