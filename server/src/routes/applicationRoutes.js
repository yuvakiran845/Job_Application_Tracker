import { Router } from 'express';
import * as controller from '../controllers/applicationController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  analyticsQuerySchema,
  createApplicationSchema,
  eventsQuerySchema,
  exportQuerySchema,
  idParamsSchema,
  listQuerySchema,
  statsQuerySchema,
  updateApplicationSchema,
} from '../validators/applicationValidators.js';

export function createApplicationRouter() {
  const router = Router();

  // Every application route is private; handlers read the owner from req.user only.
  router.use(requireAuth);

  router.get('/', validate({ query: listQuerySchema }), controller.list);
  router.post('/', validate({ body: createApplicationSchema }), controller.create);
  // Registered before "/:id" so these names are not treated as IDs.
  router.get('/stats', validate({ query: statsQuerySchema }), controller.stats);
  router.get('/export', validate({ query: exportQuerySchema }), controller.exportCsv);
  router.get('/analytics', validate({ query: analyticsQuerySchema }), controller.analytics);
  router.get('/events', validate({ query: eventsQuerySchema }), controller.events);
  router.get('/:id', validate({ params: idParamsSchema }), controller.getById);
  router.get('/:id/activity', validate({ params: idParamsSchema }), controller.activity);
  router.put('/:id', validate({ params: idParamsSchema, body: updateApplicationSchema }), controller.update);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.remove);

  return router;
}
