/**
 * Route aggregator — mounts all sub-routers.
 */
import { Router } from 'express';
import metaRoutes from './meta.js';

const router = Router();
router.use('/meta', metaRoutes);

export default router;
