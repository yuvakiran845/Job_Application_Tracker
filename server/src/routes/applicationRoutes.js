import { Router } from 'express';
import * as controller from '../controllers/applicationController.js';
import { validate } from '../middleware/validate.js';
import {
  createApplicationSchema,
  idParamsSchema,
  listQuerySchema,
  statsQuerySchema,
  updateApplicationSchema,
} from '../validators/applicationValidators.js';

export function createApplicationRouter({ requireAuth }) {
  const router = Router();

  // Every application route is private.
  router.use(requireAuth);

  router.get('/', validate({ query: listQuerySchema }), controller.list);
  router.post('/', validate({ body: createApplicationSchema }), controller.create);
  // Registered before "/:id" so "stats" is not treated as an ID.
  router.get('/stats', validate({ query: statsQuerySchema }), controller.stats);
  router.get('/:id', validate({ params: idParamsSchema }), controller.getById);
  router.put('/:id', validate({ params: idParamsSchema, body: updateApplicationSchema }), controller.update);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.remove);

  return router;
}
