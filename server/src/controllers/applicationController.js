import * as applicationService from '../services/applicationService.js';

// Controllers translate HTTP to service calls. Successful responses are always
// `{ data }` (plus `meta` for lists). Express 5 forwards rejected promises to the
// error handler, so no try/catch is needed here.

export async function list(req, res) {
  const { items, meta } = await applicationService.listApplications(req.user.id, req.validated.query);
  res.json({ data: items, meta });
}

export async function stats(req, res) {
  res.json({ data: await applicationService.getApplicationStats(req.user.id, req.validated.query) });
}

export async function getById(req, res) {
  res.json({ data: await applicationService.getApplication(req.user.id, req.validated.params.id) });
}

export async function create(req, res) {
  const application = await applicationService.createApplication(req.user.id, req.validated.body);
  res.status(201).location(`${req.baseUrl}/${application.id}`).json({ data: application });
}

export async function update(req, res) {
  const { id } = req.validated.params;
  res.json({ data: await applicationService.updateApplication(req.user.id, id, req.validated.body) });
}

export async function remove(req, res) {
  await applicationService.deleteApplication(req.user.id, req.validated.params.id);
  res.status(204).end();
}
