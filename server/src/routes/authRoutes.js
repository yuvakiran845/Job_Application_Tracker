import { Router } from 'express';
import * as controller from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../validators/authValidators.js';

/** /api/auth — sign up, sign in, sign out, current user. */
export function createAuthRouter({ login: loginLimiter, signup: signupLimiter }) {
  const router = Router();
  router.post('/register', signupLimiter, validate({ body: registerSchema }), controller.register);
  router.post('/login', loginLimiter, validate({ body: loginSchema }), controller.login);
  // Logout works even with an expired session, so the cookie can always be cleared.
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);
  return router;
}

/** /api/users/me — profile and password updates for the signed-in user. */
export function createUserRouter({ login: loginLimiter }) {
  const router = Router();
  router.use(requireAuth);
  router.patch('/me', validate({ body: updateProfileSchema }), controller.updateProfile);
  // Rate limited like sign-in because it verifies the current password.
  router.put('/me/password', loginLimiter, validate({ body: changePasswordSchema }), controller.changePassword);
  return router;
}
