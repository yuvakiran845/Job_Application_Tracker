import { SAVED_VIEW_LIMITS, SavedView, serializeSavedView } from '../models/SavedView.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import { ownerId } from './applicationService.js';

const NAME_TAKEN = 'You already have a view with this name.';

export async function listViews(userId) {
  const views = await SavedView.find({ userId: ownerId(userId) }).sort({ nameKey: 1 }).lean();
  return views.map(serializeSavedView);
}

export async function createView(userId, { name, query }) {
  const owner = ownerId(userId);
  if ((await SavedView.countDocuments({ userId: owner })) >= SAVED_VIEW_LIMITS.perUser) {
    throw new AppError(
      409,
      'VIEW_LIMIT',
      `You can save up to ${SAVED_VIEW_LIMITS.perUser} views. Delete one to add another.`,
    );
  }
  try {
    return serializeSavedView(await SavedView.create({ userId: owner, name, query }));
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(409, 'VIEW_NAME_TAKEN', NAME_TAKEN, { fieldErrors: { name: NAME_TAKEN } });
    }
    throw error;
  }
}

export async function deleteView(userId, id) {
  const { deletedCount } = await SavedView.deleteOne({ _id: id, userId: ownerId(userId) });
  if (deletedCount === 0) throw new NotFoundError('Saved view not found.');
}
