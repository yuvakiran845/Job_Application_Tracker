import * as savedViewService from '../services/savedViewService.js';

export async function list(req, res) {
  res.json({ data: await savedViewService.listViews(req.user.id) });
}

export async function create(req, res) {
  res.status(201).json({ data: await savedViewService.createView(req.user.id, req.validated.body) });
}

export async function remove(req, res) {
  await savedViewService.deleteView(req.user.id, req.validated.params.id);
  res.status(204).end();
}
