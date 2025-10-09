/**
 * containers_db.js
 * Schema-agnostic helper to insert a record into the "containers" table.
 *
 * Usage:
 *   const containersDb = require('../services/containers_db');
 *   const res = await containersDb.createContainerRecord(clientOrNull, payload);
 *
 * - clientOrNull: optional pg client (from getClient()). If omitted uses pool query.
 * - payload: { containerName, image, taskId, ownerUserId, status, externalId, metadata }
 */

const db = require('./database'); // expects services/database.js to exist
const poolQuery = db.query;

async function _runQuery(client, text, params = []) {
  if (client && typeof client.query === 'function') return client.query(text, params);
  return poolQuery(text, params);
}

async function createContainerRecord(clientOrNull, payload = {}) {
  const client = clientOrNull || null;

  // 1) get columns that actually exist on containers table
  const colsRes = await _runQuery(client, `
    SELECT column_name
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'containers'
  `);
  const cols = colsRes.rows.map(r => r.column_name);

  // Candidate mapping — first match wins; we choose lxc_name/external variants first
  const preferred = {
    container_name: ['lxc_name','container_name','name','hostname','slug','label'],
    image: ['image','image_name'],
    task_id: ['task_id','assignment_id','related_task_id'],
    owner_user_id: ['owner_user_id','user_id','created_by','owner_id'],
    status_id: ['status_id'],
    external_id: ['lxc_name','external_id','lxd_name','lxc_hostname','external_name','identifier'],
    metadata: ['metadata','meta','data','config','info'],
    created_at: ['created_at','created_on','created']
  };

  const toInsertCols = [];
  const toInsertVals = [];
  const params = [];
  let idx = 1;

  function pushCol(col, value) {
    // Avoid duplicates in case mapping tries to push same DB column twice
    if (toInsertCols.includes(col)) return;
    toInsertCols.push(col);
    toInsertVals.push(`$${idx}`);
    params.push(value);
    idx++;
  }

  function mapField(possibleCols, value) {
    if (value === undefined) return false;
    for (const c of possibleCols) {
      if (!cols.includes(c)) continue;
      if (toInsertCols.includes(c)) return true; // already set previously
      // stringify metadata-like objects for JSONB/text columns
      const v = (c === 'meta' || c === 'metadata' || c === 'data') && typeof value === 'object'
        ? JSON.stringify(value)
        : value;
      pushCol(c, v);
      return true;
    }
    return false;
  }

  // Map logical payload -> actual DB columns.
  // We try to populate external_id (lxc_name) first so required non-null fields are set.
  mapField(preferred.external_id, payload.externalId || payload.containerName);
  mapField(preferred.container_name, payload.containerName);
  mapField(preferred.image, payload.image);
  mapField(preferred.task_id, payload.taskId);
  mapField(preferred.owner_user_id, payload.ownerUserId);
  if (payload.metadata !== undefined) mapField(preferred.metadata, payload.metadata);

  // status -> if status_id column exists, look up id in container_statuses
  if (payload.status && cols.includes('status_id') && !toInsertCols.includes('status_id')) {
    const st = await _runQuery(client, 'SELECT id FROM container_statuses WHERE name = $1 LIMIT 1', [payload.status]);
    if (st.rowCount) pushCol('status_id', st.rows[0].id);
  }

  // created_at: choose a created_at-like column to set NOW() if present and not already provided
  let createdAtCol = null;
  for (const c of preferred.created_at) {
    if (cols.includes(c) && !toInsertCols.includes(c)) { createdAtCol = c; break; }
  }

  if (toInsertCols.length === 0 && !createdAtCol) {
    throw new Error('No insertable container columns found in the DB schema.');
  }

  const sqlCols = [...toInsertCols];
  const sqlVals = [...toInsertVals];

  if (createdAtCol) {
    // Use NOW() directly in VALUES list (no param)
    sqlCols.push(createdAtCol);
    sqlVals.push('NOW()');
  }

  const sql = `INSERT INTO containers (${sqlCols.join(',')}) VALUES (${sqlVals.join(',')}) RETURNING *`;
  const res = await _runQuery(client, sql, params);
  return res;
}

module.exports = { createContainerRecord };
