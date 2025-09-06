/* =========================================================
 * LYN AutoSales — Evaluador (Frontend)
 * app.js (ordenado y con fixes de persistencia)
 * =======================================================*/

/* ---------- Config ---------- */
const API = '/.netlify/functions';
const VERSION = Date.now().toString();

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const today = () => {
  const d = new Date(), p = (n)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
};
const money = (n) => new Intl.NumberFormat('en-US',{
  style:'currency', currency:'USD', maximumFractionDigits:0
}).format(Number(n||0));
const esc = (s)=> (s||'').replace(/[&<>\"']/g, m => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
}[m]));
const shortVIN = (v)=> v? v.slice(0,3)+'...'+v.slice(-5) : '—';

/* Partes del auto (ampliable) */
const partsList = [
  'Parachoques delantero','Parachoques trasero','Capó','Techo','Cajuela/Portón',
  'Guardabarros izq.','Guardabarros der.','Puerta delantera izq.','Puerta delantera der.',
  'Puerta trasera izq.','Puerta trasera der.','Parabrisas','Luna trasera',
  'Faro izq.','Faro der.','Aleta izq.','Aleta der.','Espejo izq.','Espejo der.',
  'Marco frontal','Soporte radiador','Travesaño','Panel lateral izq.','Panel lateral der.'
];

/* Resize imagen → DataURL (para guardar como base64 o URL externa) */
function resizeToDataURL(file, maxW=1280, quality=.82){
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    const img = new Image();
    fr.onload = ()=> img.src = fr.result;
    fr.onerror = reject;
    img.onload = ()=>{
      const scale = Math.min(1, maxW/img.width);
      const w = Math.round(img.width*scale);
      const h = Math.round(img.height*scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    fr.readAsDataURL(file);
  });
}

/* ---------- API ---------- */
async function api(path, opt={}){
  try{
    const url = `${API}/${path}${path.includes('?')?'&':'?'}t=${VERSION}`;
    const r = await fetch(url, opt);
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }catch(e){
    console.error('API error:', e);
    alert('Problema de conexión. Intenta de nuevo.');
    return null;
  }
}

const db = {
  /* Vehículos */
  listVehicles: () => api('vehicles').then(x=>Array.isArray(x)?x:[]),
  getVehicle: (id) => api('vehicles?id='+encodeURIComponent(id)),
  saveVehicle: (v) => api('vehicles', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(v)
  }),
  deleteVehicle: (id) => api('vehicles', {
    method:'DELETE', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({id})
  }),

  /* Daños */
  listDamages: (vehId) => api('damages?vehId='+encodeURIComponent(vehId)).then(x=>Array.isArray(x)?x:[]),
  saveDamage: (d) => api('damages', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(d)
  }),
  deleteDamage: (id) => api('damages', {
    method:'DELETE', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({id})
  }),
};

/* ---------- Estado ---------- */
let currentVeh = null;     // veh_id (string)
let currentDamage = null;  // objeto daño en edición

/* =========================================================
 * Home (tarjetas)
 * =======================================================*/
async function renderHome(){
  const grid = $('veh-grid');
  const empty = $('empty');
  grid.innerHTML = '';

  const vehicles = await db.listVehicles();
  empty.style.display = vehicles.length ? 'none' : 'grid';

  for(const v of vehicles){
    const vehId = v.veh_id || v.vehId || '';
    const damages = await db.listDamages(vehId);
    const total = damages.reduce((s,d)=> s + Number(d.cost||0), 0);

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img class="thumb" src="${v.foto_vehiculo || ''}" loading="lazy" alt="">
      <div class="body">
        <div class="meta">
          <strong>${esc(v.marca||'')} ${esc(v.modelo||'')} ${esc(v.anio||'')}</strong>
          <span class="pill money">${money(total)}</span>
        </div>
        <div class="sub">VIN: ${esc(shortVIN(v.vin))}</div>
        <div class="sub">ID: ${esc(vehId)}</div>
      </div>
      <div class="row" style="padding:12px;border-top:1px solid var(--border)">
        <button class="btn" onclick="editVehicle('${vehId}')">Editar</button>
        <button class="btn" onclick="openDamageList('${vehId}')">Daños</button>
        <button class="btn" onclick="openReport('${vehId}')">Reporte</button>
        <button class="btn danger" onclick="removeVehicle('${vehId}')">Eliminar</button>
      </div>`;
    grid.appendChild(card);
  }
}

/* =========================================================
 * Navegación + CRUD Vehículo
 * =======================================================*/
function go(view){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('v-'+view).classList.add('active');
  // Mostrar el FAB solo en Home (crea vehículos)
  const fab = document.querySelector('.fab');
  if (fab) fab.style.display = (view === 'home') ? 'block' : 'none';
  window.scrollTo(0,0);
}

function newVehicle(){
  currentVeh = null;
  $('vehId').value=''; $('fecha').value=today(); $('vin').value='';
  $('marca').value=''; $('modelo').value=''; $('anio').value='';
  $('color').value=''; $('pais').value=''; $('notas').value='';
  $('vehPhoto').value=''; $('vehPhotoThumb').innerHTML='';
  go('veh');
}

async function editVehicle(id){
  currentVeh = id;
  const v = await db.getVehicle(id) || {};
  $('vehId').value  = v.veh_id || id;
  $('fecha').value  = (v.fecha || today()).toString().slice(0,10);
  $('vin').value    = v.vin || '';
  $('marca').value  = v.marca || '';
  $('modelo').value = v.modelo || '';
  $('anio').value   = v.anio || '';
  $('color').value  = v.color || '';
  $('pais').value   = v.pais || '';
  $('notas').value  = v.notas || '';
  $('vehPhotoThumb').innerHTML = v.foto_vehiculo
    ? `<img src="${v.foto_vehiculo}" class="thumb" style="max-width:160px;border:1px solid var(--border);border-radius:12px">`
    : '';
  go('veh');
}

async function saveVehicle(){
  /* Guardar SIEMPRE en snake_case (coincide con BD y funciones) */
  const payload = {
    veh_id:        $('vehId').value.trim(),
    fecha:         ($('fecha').value || today()).slice(0,10),
    vin:           $('vin').value.trim().toUpperCase(),
    marca:         $('marca').value.trim(),
    modelo:        $('modelo').value.trim(),
    anio:          $('anio').value.trim(),
    color:         $('color').value.trim(),
    pais:          $('pais').value.trim(),
    notas:         $('notas').value.trim(),
    foto_vehiculo: document.querySelector('#vehPhotoThumb img')?.src || null
  };

  if(!payload.veh_id){
    alert('Asigna un Vehículo ID');
    return;
  }
  await db.saveVehicle(payload);
  go('home');
  renderHome();
}

async function removeVehicle(id){
  if(confirm('¿Eliminar vehículo?')){
    await db.deleteVehicle(id);
    renderHome();
  }
}

/* Foto de vehículo → dataURL (redimensionada) */
document.addEventListener('change', async (ev)=>{
  if(ev.target && ev.target.id === 'vehPhoto'){
    const f = ev.target.files?.[0];
    if(!f) return;
    const full = await resizeToDataURL(f, 1280, .82);
    $('vehPhotoThumb').innerHTML =
      `<img src="${full}" class="thumb" style="max-width:160px;border:1px solid var(--border);border-radius:12px">`;
  }
});

/* =========================================================
 * Daños (listado + panel lateral)
 * =======================================================*/
async function openDamageList(vehId){
  currentVeh = vehId;
  await renderDamageList();
  go('dmg');
}

async function renderDamageList(){
  const list = $('dmgList');
  list.innerHTML = '';
  const damages = await db.listDamages(currentVeh);

  if(damages.length === 0){
    const div = document.createElement('div');
    div.className='empty';
    div.innerHTML = `No hay daños registrados.<br><button class="btn primary" onclick="addDamage()">Agregar daño</button>`;
    list.appendChild(div);
    return;
  }

  for(const d of damages){
    const img0 = Array.isArray(d.imgs) && d.imgs[0]
      ? (d.imgs[0].thumb || d.imgs[0].full || d.imgs[0]) : '';
    const row = document.createElement('div');
    row.className='item';
    row.innerHTML = `
      <img src="${img0}" loading="lazy" alt="">
      <div>
        <div class="title">${esc(d.parte||'')}</div>
        <div class="sub">${esc(d.ubic||'')} • ${esc(d.sev||'')}</div>
      </div>
      <div class="pill money">${money(d.cost||0)}</div>`;
    row.onclick = ()=> openSheet(d);
    list.appendChild(row);
  }
}

function addDamage(){
  const d = {
    id: `d_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    veh_id: currentVeh,         // <-- guardamos veh_id (no vehId)
    parte: 'Parachoques delantero',
    ubic: '',
    sev: 'Bajo',
    descrption: '',
    cost: 0,
    imgs: []
  };
  openSheet(d, true);
}

/* ---------- Panel (sheet) ---------- */
function openSheet(damage, isNew=false){
  currentDamage = { ...damage, isNew };

  /* lista de partes */
  const sel = $('d_parte');
  sel.innerHTML = partsList.map(p=>`<option>${p}</option>`).join('');
  $('d_parte').value = damage.parte || 'Parachoques delantero';

  $('d_ubic').value  = damage.ubic || '';
  $('d_sev').value   = damage.sev || 'Bajo';
  $('d_descr').value = damage.descrption || '';
  $('d_cost').value  = damage.cost || 0;

  /* miniaturas */
  const thumbs = $('d_thumbs');
  thumbs.innerHTML = '';
  (damage.imgs||[]).forEach(img=>{
    const src = img.thumb || img.full || img;
    const im = new Image();
    im.src = src;
    im.style.cssText = 'width:96px;height:96px;object-fit:cover;border-radius:10px;border:1px solid var(--border)';
    thumbs.appendChild(im);
  });

  $('d_fotos').value = '';
  $('dmgDelete').style.display = isNew ? 'none' : 'inline-block';
  $('dmgSheet').classList.add('open');
}

function closeSheet(){
  $('dmgSheet').classList.remove('open');
  currentDamage = null;
}

/* Adjuntar fotos (se guardan thumb + full) */
$('d_fotos').addEventListener('change', async ()=>{
  if(!currentDamage) return;
  const files = Array.from($('d_fotos').files || []);
  for(const f of files){
    const full  = await resizeToDataURL(f, 1280, .82);
    const thumb = await resizeToDataURL(f,  320, .80);
    (currentDamage.imgs = currentDamage.imgs || []).push({ thumb, full });
    const im = new Image();
    im.src = thumb;
    im.style.cssText = 'width:96px;height:96px;object-fit:cover;border-radius:10px;border:1px solid var(--border)';
    $('d_thumbs').appendChild(im);
  }
});

/* Guardar / eliminar un daño */
$('dmgSave').addEventListener('click', async ()=>{
  if(!currentDamage) return;

  // normaliza payload (siempre incluye veh_id)
  const payload = {
    id: currentDamage.id,
    veh_id: currentDamage.veh_id || currentVeh,
    parte: $('d_parte').value,
    ubic: $('d_ubic').value,
    sev: $('d_sev').value,
    descrption: $('d_descr').value, // <- columna tal cual en BD
    cost: Number($('d_cost').value || 0),
    imgs: currentDamage.imgs || []
  };

  await db.saveDamage(payload);
  closeSheet();
  renderDamageList();
});

$('dmgDelete').addEventListener('click', async ()=>{
  if(!currentDamage) return;
  if(confirm('¿Eliminar daño?')){
    await db.deleteDamage(currentDamage.id);
    closeSheet();
    renderDamageList();
  }
});

/* =========================================================
 * Reporte
 * =======================================================*/
function sevGlobal(list){
  if(!list || list.length===0) return 'BAJO';
  const arr = list.map(d => ({Bajo:1,Medio:2,Alto:3}[d.sev] || 1));
  const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
  return avg<=1.5 ? 'BAJO' : (avg<=2.3 ? 'MEDIO' : 'ALTO');
}

async function openReport(vehId){
  currentVeh = vehId;
  const v  = await db.getVehicle(vehId) || {};
  const ds = await db.listDamages(vehId) || [];

  $('p_vehId').textContent = v.veh_id || '—';
  $('p_fecha').textContent = (v.fecha || '—').toString().slice(0,10);
  $('p_vin').textContent   = v.vin || '—';
  $('p_marca').textContent = v.marca || '—';
  $('p_modelo').textContent= v.modelo || '—';
  $('p_anio').textContent  = v.anio || '—';
  $('p_color').textContent = v.color || '—';
  $('p_pais').textContent  = v.pais || '—';
  $('p_notas').textContent = v.notas || '—';

  $('p_total').textContent    = money(ds.reduce((s,d)=> s + Number(d.cost||0), 0));
  $('p_sevGlobal').textContent= sevGlobal(ds);

  $('p_listado').innerHTML = ds.map((d,i)=>`
    <div class="card" style="padding:10px;margin:10px 0">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <strong>${i+1}. ${esc(d.parte||'')}</strong>
        <span class="pill">${esc(d.sev||'')}</span>
        <span class="pill money">${money(d.cost||0)}</span>
      </div>
      <div class="sub">${esc(d.ubic||'')}</div>
      <div style="margin-top:6px">${esc(d.descrption||'')}</div>
    </div>
  `).join('');

  go('report');
}

function exportPDF(){
  const name = `LYN-${($('p_vehId').textContent||'ID')}-${($('p_fecha').textContent||today())}.pdf`;
  const prev = document.title;
  document.title = name;
  window.print();
  setTimeout(()=> document.title = prev, 800);
}

/* =========================================================
 * VIN (Decode + opción auto-guardar)
 * =======================================================*/
async function decodeVIN({ autoSave=true } = {}){
  const vin = $('vin').value.trim().toUpperCase();
  if(vin.length !== 17){
    alert('El VIN debe tener 17 caracteres.');
    return;
  }
  try{
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesExtended/${encodeURIComponent(vin)}?format=json`;
    const res = await fetch(url);
    const data= await res.json();
    const r   = data?.Results?.[0] || {};

    // Rellenar SOLO si el campo está vacío (no pisar lo escrito)
    if(!$('marca').value)  $('marca').value  = r.Make || r.Manufacturer || '';
    if(!$('modelo').value) $('modelo').value = r.Model || '';
    if(!$('anio').value)   $('anio').value   = r.ModelYear || '';
    if(!$('pais').value)   $('pais').value   = r.PlantCountry || r.PlantCity || '';

    // Si ya tenemos veh_id, guardamos automáticamente
    if(autoSave && $('vehId').value.trim()){
      await saveVehicle();
      alert('Datos del VIN aplicados y guardados.');
    }
  }catch{
    alert('No se pudo decodificar el VIN.');
  }
}

/* =========================================================
 * Init
 * =======================================================*/
document.addEventListener('DOMContentLoaded', ()=>{
  $('fecha').value = today();
  renderHome();
});
$('addDamage').addEventListener('click', ()=> addDamage());
