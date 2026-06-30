/**
 * Bot Routes — Telegram webhook + management
 */
import { Router } from 'express';
import {
  webhook,
  setupWebhook,
  removeWebhook,
  manualSend,
  getMessages,
  webhookStatus,
} from '../controllers/telegramController.js';

const router = Router();

router.post('/telegram/webhook',        webhook);
router.post('/telegram/setup-webhook',  setupWebhook);
router.post('/telegram/remove-webhook', removeWebhook);
router.post('/telegram/send',           manualSend);
router.get('/telegram/messages',        getMessages);
router.get('/telegram/status',          webhookStatus);

export default router;
