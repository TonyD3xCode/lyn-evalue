// netlify/functions/upload-photo.mjs
import { getStore } from '@netlify/blobs';
import { json, preflight } from './db.mjs';  // <-- usamos json (no jsonResponse)
import { Buffer } from 'node:buffer';        // seguro en ESM

export const handler = async (event) => {
  const pf = preflight(event);
  if (pf) return pf;

  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { dataUrl, vehId } = JSON.parse(event.body || '{}');
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      return json(400, { error: 'dataUrl required (data:*;base64,...)' });
    }

    // data:[mime];base64,AAAA...
    const [meta, b64] = dataUrl.split(',');
    const mime = (meta.match(/^data:(.*);base64$/)?.[1]) || 'application/octet-stream';
    const ext = (mime.split('/')[1] || 'bin').split('+')[0];
    const bytes = Buffer.from(b64, 'base64');

    // Asegúrate de tener creado el store "lyn-photos" en Netlify → Storage → Blobs
    const store = getStore({ name: 'lyn-photos' });
    const key = `${vehId || 'veh'}_${Date.now()}_${Math.random().toString(36).slice(2,7)}.${ext}`;

    await store.set(key, bytes, { contentType: mime, metadata: { vehId: vehId || '' } });

    // 🔧 En Blobs es getPublicUrl (no getBlobUrl)
    const url = store.getPublicUrl(key);

    return json(200, { ok: true, key, url, mime, size: bytes.length });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message });
  }
};
