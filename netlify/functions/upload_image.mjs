
import { getStore } from '@netlify/blobs';
import { jsonResponse, preflight } from './db.mjs';

export const handler = async (event) => {
  const pf = preflight(event);
  if (pf) return pf;
  try {
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });
    const { dataUrl, vehId } = JSON.parse(event.body || '{}');
    if (!dataUrl) return jsonResponse(400, { error: 'dataUrl required' });
    const [meta, b64] = dataUrl.split(',');
    const mime = (meta.match(/^data:(.*);base64$/) || [null,'application/octet-stream'])[1];
    const bytes = Buffer.from(b64, 'base64');
    const ext = (mime.split('/')[1] || 'bin').split('+')[0];
    const store = getStore({ name: 'lyn-photos' });
    const key = `${vehId||'veh'}_${Date.now()}_${Math.random().toString(36).slice(2,7)}.${ext}`;
    await store.set(key, bytes, { contentType: mime, metadata:{ vehId: vehId||'' } });
    const url = store.getBlobUrl(key);
    return jsonResponse(200, { ok:true, url });
  } catch(e) {
    console.error(e);
    return jsonResponse(500, { error: e.message });
  }
};
