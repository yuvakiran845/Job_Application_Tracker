import { Router } from 'express';
import * as controller from '../controllers/viewController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema, savedViewSchema } from '../validators/applicationValidators.js';

/** /api/views — the signed-in user's saved list filters. */
export function createViewRouter() {
  const router = Router();
  router.use(requireAuth);
  router.get('/', controller.list);
  router.post('/', validate({ body: savedViewSchema }), controller.create);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.remove);
  return router;
}
