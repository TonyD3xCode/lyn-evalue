
const API = '/.netlify/functions';
const VERSION = Date.now().toString();
function $(id){return document.getElementById(id)}
function today(){const d=new Date();const p=n=>n.toString().padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function money(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n||0))}
function escapeHtml(s){return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]))}
function shortVIN(v){return v?v.slice(0,3)+'...'+v.slice(-5):'—'}
async function api(path,opt={}){ try{ const r=await fetch(`${API}/${path}?t=${VERSION}`,opt); if(!r.ok) throw 0; return await r.json(); }catch(_){ return null; } }
async function neonList(){return (await api('vehicles'))||[]}
async function neonSaveVehicle(v){await api('vehicles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)})}
async function neonDeleteVehicle(id){await api('vehicles',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})}
async function neonListDamages(vehId){return (await api('damages&vehId='+encodeURIComponent(vehId)))||[]}
async function neonSaveDamage(d){await api('damages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})}
async function neonDeleteDamage(id){await api('damages',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})}
async function uploadToBlobs(dataUrl, vehId){return (await api('upload_image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataUrl, vehId})}))||{}}
function sumTotal(damages){return (damages||[]).reduce((s,d)=>s+Number(d.cost||0),0)}
let currentVeh=null;

async function renderHome(){
  const grid=$('veh-grid'); const empty=$('empty'); grid.innerHTML='';
  const vehicles=await neonList();
  if(!vehicles || vehicles.length===0){
    empty.style.display='grid';
    return;
  } else empty.style.display='none';

  for(const v of vehicles){
    const id=v.veh_id||v.vehId; if(!id) continue;
    let damages=[]; try{damages=await neonListDamages(id);}catch(_){damages=[]}
    const total=sumTotal(damages);
    const card=document.createElement('div'); card.className='card veh-card';
    const img=document.createElement('img'); img.src=v.foto_vehiculo||''; card.appendChild(img);
    const info=document.createElement('div'); info.className='info';
    info.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <strong>${escapeHtml(v.marca||'')} ${escapeHtml(v.modelo||'')} ${escapeHtml(v.anio||'')}</strong>
      <span class="pill money">${money(total)}</span></div>
      <div class="line">VIN: ${escapeHtml(shortVIN(v.vin))}</div>
      <div class="line">ID: ${escapeHtml(id)}</div>`;
    card.appendChild(info);
    const foot=document.createElement('div'); foot.className='foot';
    const b1=document.createElement('button'); b1.className='btn'; b1.textContent='Editar'; b1.onclick=()=>editVehicle(id);
    const b2=document.createElement('button'); b2.className='btn'; b2.textContent='Daños'; b2.onclick=()=>startDmg(id);
    const b3=document.createElement('button'); b3.className='btn'; b3.textContent='Reporte'; b3.onclick=()=>{currentVeh=id; toReport();};
    const b4=document.createElement('button'); b4.className='btn danger'; b4.textContent='Eliminar'; b4.onclick=async()=>{if(confirm('¿Eliminar?')){await neonDeleteVehicle(id); renderHome();}};
    foot.append(b1,b2,b3,b4); card.appendChild(foot);
    grid.appendChild(card);
  }
}

function go(view){ document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); document.getElementById(`view-${view}`).classList.add('active'); window.scrollTo(0,0); }
function newVehicle(){ currentVeh=null; $('vehId').value=''; $('fecha').value=today(); $('vin').value=''; $('marca').value=''; $('modelo').value=''; $('anio').value=''; $('color').value=''; $('pais').value=''; $('notas').value=''; $('vehPhoto').value=''; $('vehPhotoThumb').innerHTML=''; go('veh'); }
async function editVehicle(id){ currentVeh=id; const vehicles=await neonList(); const v=vehicles.find(x=>(x.veh_id||x.vehId)===id) || {}; $('vehId').value=(v.veh_id||v.vehId)||id; $('fecha').value=v.fecha||today(); $('vin').value=v.vin||''; $('marca').value=v.marca||''; $('modelo').value=v.modelo||''; $('anio').value=v.anio||''; $('color').value=v.color||''; $('pais').value=v.pais||''; $('notas').value=v.notas||''; $('vehPhotoThumb').innerHTML=v.foto_vehiculo?`<img src="${v.foto_vehiculo}" class="thumb">`:''; go('veh'); }
async function saveVehicle(){ const v={vehId:$('vehId').value.trim(),fecha:$('fecha').value.trim()||today(),vin:$('vin').value.trim().toUpperCase(),marca:$('marca').value.trim(),modelo:$('modelo').value.trim(),anio:$('anio').value.trim(),color:$('color').value.trim(),pais:$('pais').value.trim(),notas:$('notas').value.trim(),fotoVehiculo:document.querySelector('#vehPhotoThumb img')?.src||null}; if(!v.vehId){alert('Asigna un Vehículo ID');return;} await neonSaveVehicle(v); go('home'); renderHome(); }

document.addEventListener('change', async (ev)=>{ 
  if(ev.target&&ev.target.id==='vehPhoto'){ 
    const f=ev.target.files&&ev.target.files[0]; if(!f) return; 
    const dataUrl = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); });
    try { const out = await uploadToBlobs(dataUrl, $('vehId').value.trim()||'veh'); const url = out.url || dataUrl; $('vehPhotoThumb').innerHTML = `<img src="${url}" class="thumb">`; } catch(e) { alert('No se pudo subir la imagen del vehículo'); }
  }
});

document.getElementById('addDamage')?.addEventListener('click', ()=>addDamageCard());
async function startDmg(id){ currentVeh = id; await renderDamages(); go('dmg'); }
async function renderDamages(){ const vehId=currentVeh||$('vehId').value.trim(); if(!vehId){go('home');return;} const list=await neonListDamages(vehId); const container=document.getElementById('damages'); container.innerHTML=''; if(!list || list.length===0){ addDamageCard({id:`d_${Date.now()}`,vehId,parte:'Parachoques delantero',ubic:'',sev:'Bajo',descrption:'',cost:0,imgs:[]}); return; } list.forEach(d=>addDamageCard(d)); }

function addDamageCard(prefill){ 
  const d=prefill?{...prefill}:{ id:`d_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, vehId: currentVeh||$('vehId').value.trim(), parte:'Parachoques delantero', ubic:'', sev:'Bajo', descrption:'', cost:0, imgs:[] }; 
  const card=document.createElement('div'); card.className='card'; card.style.padding='12px'; 
  card.innerHTML=`
  <div class='row3'>
    <div><div class='muted'>Parte</div>
      <select class='parte'>
        <option>Parachoques delantero</option><option>Parachoques trasero</option><option>Guardabarros izq.</option><option>Guardabarros der.</option>
        <option>Puerta delantera izq.</option><option>Puerta delantera der.</option><option>Puerta trasera izq.</option><option>Puerta trasera der.</option>
        <option>Capó</option><option>Techo</option><option>Cajuela/Portón</option><option>Faro izq.</option><option>Faro der.</option><option>Parabrisas</option>
      </select>
    </div>
    <div><div class='muted'>Ubicación</div><input class='ubic' type='text'></div>
    <div><div class='muted'>Severidad</div><select class='sev'><option>Bajo</option><option>Medio</option><option>Alto</option></select></div>
  </div>
  <div class='row3' style='margin-top:10px'>
    <div><div class='muted'>Descripción</div><textarea class='descrption' style='min-height:60px;'></textarea></div>
    <div><div class='muted'>Costo (USD)</div><input class='cost' type='number' min='0' step='1' value='0'></div>
    <div></div>
  </div>
  <div style='margin-top:10px'>
    <div class='muted'>Fotos</div>
    <input class='fotos' type='file' accept='image/*' capture='environment' multiple>
    <div class='thumbs' style='display:flex;gap:8px;flex-wrap:wrap'></div>
  </div>
  <div style='display:flex;gap:10px;margin-top:10px'>
    <button class='btn primary' data-save>Guardar</button>
    <button class='btn danger' data-delete>Eliminar</button>
  </div>`;

  const thumbs=card.querySelector('.thumbs'); 
  (d.imgs||[]).forEach((src,i)=>{ const im=new Image(); im.src=src; Object.assign(im.style,{width:'96px',height:'96px',objectFit:'cover',borderRadius:'10px',border:'1px solid #1c6b77',cursor:'zoom-in'}); im.onclick=()=>openViewer(d.imgs,i); thumbs.appendChild(im); });
  const input=card.querySelector('.fotos'); 
  input.addEventListener('change', async ()=>{ 
    const files=Array.from(input.files||[]);
    for(const f of files){ 
      const dataUrl = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); });
      try { const out = await uploadToBlobs(dataUrl, d.vehId); const url = out.url || dataUrl; d.imgs.push(url); const im=new Image(); im.src=url; Object.assign(im.style,{width:'96px',height:'96px',objectFit:'cover',borderRadius:'10px',border:'1px solid #1c6b77',cursor:'zoom-in'}); im.onclick=()=>openViewer(d.imgs, d.imgs.length-1); thumbs.appendChild(im);} catch(e) { alert('No se pudo subir una foto'); }
    }
  });

  card.querySelector('.parte').value=d.parte||'Parachoques delantero';
  card.querySelector('.ubic').value=d.ubic||'';
  card.querySelector('.sev').value=d.sev||'Bajo';
  card.querySelector('.descrption').value=d.descrption||'';
  card.querySelector('.cost').value=d.cost||0;

  card.querySelector('[data-save]').addEventListener('click', async ()=>{ 
    d.parte=card.querySelector('.parte').value; d.ubic=card.querySelector('.ubic').value; d.sev=card.querySelector('.sev').value; d.descrption=card.querySelector('.descrption').value; d.cost=Number(card.querySelector('.cost').value||0); 
    await neonSaveDamage(d); alert('Daño guardado'); 
  });
  card.querySelector('[data-delete]').addEventListener('click', async ()=>{ if(confirm('¿Eliminar daño?')){ await neonDeleteDamage(d.id); card.remove(); } });
  document.getElementById('damages').appendChild(card);
}

function sevGlobal(list){ if(!list||list.length===0) return 'BAJO'; const s=list.map(d=>({Bajo:1,Medio:2,Alto:3}[d.sev]||1)); const avg=s.reduce((a,b)=>a+b,0)/s.length; if(avg<=1.5) return 'BAJO'; if(avg<=2.3) return 'MEDIO'; return 'ALTO'; }
async function renderReport(){ const vehId=currentVeh; const vehicles=await neonList(); const v=vehicles.find(x=>(x.veh_id||x.vehId)===vehId) || {}; const damages=await neonListDamages(vehId)||[]; $('p_vehId').textContent=(v.veh_id||'—'); $('p_fecha').textContent=(v.fecha||'—'); $('p_vin').textContent=(v.vin||'—'); $('p_marca').textContent=(v.marca||'—'); $('p_modelo').textContent=(v.modelo||'—'); $('p_anio').textContent=(v.anio||'—'); $('p_color').textContent=(v.color||'—'); $('p_pais').textContent=(v.pais||'—'); $('p_notas').textContent=(v.notas||'—'); const total=damages.reduce((s,d)=>s+Number(d.cost||0),0); $('p_total').textContent=money(total); $('p_sevGlobal').textContent=sevGlobal(damages); const list=$('p_listado'); list.innerHTML=''; damages.forEach((d,i)=>{ const div=document.createElement('div'); div.className='card'; div.style.padding='10px'; div.style.marginBottom='10px'; const thumbs=(d.imgs||[]).map((src,idx)=>`<img src="${src}" style="width:96px;height:96px;object-fit:cover;border-radius:10px;border:1px solid #1c6b77;cursor:zoom-in" onclick="openViewer(${JSON.stringify(d.imgs||[])}, ${idx})">`).join(''); div.innerHTML=`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><strong>${i+1}. ${escapeHtml(d.parte||'')}</strong><span class="pill">${escapeHtml(d.sev||'')}</span><span class="muted">${escapeHtml(d.ubic||'')}</span><span class="pill money">${money(d.cost||0)}</span></div><div style="margin-top:6px;">${escapeHtml(d.descrption||'')}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">${thumbs}</div>`; list.appendChild(div); }); }
function toReport(){ renderReport(); go('report'); }
function exportPDF(){ const name=`LYN-${($('p_vehId').textContent||'ID')}-${($('p_fecha').textContent||today())}.pdf`; const prev=document.title; document.title=name; window.print(); setTimeout(()=>{document.title=prev},1200); }

// viewer
let IV = { list:[], idx:0, scale:1, posX:0, posY:0, start:null, pinch:null };
function openViewer(arr, index=0){ IV.list=(arr||[]).slice(); if(IV.list.length===0) return; IV.idx=Math.max(0,Math.min(index,IV.list.length-1)); IV.scale=1; IV.posX=0; IV.posY=0; $('imgViewer').style.display='block'; $('ivTotal').textContent=IV.list.length; loadIv(); }
function closeViewer(){ $('imgViewer').style.display='none'; }
function loadIv(){ const src=IV.list[IV.idx]; const img=$('ivImg'); IV.scale=1; IV.posX=0; IV.posY=0; img.src=src; $('ivNow').textContent=IV.idx+1; applyIvTransform(); }
function nextIv(){ if(IV.idx<IV.list.length-1){IV.idx++; loadIv();} }
function prevIv(){ if(IV.idx>0){IV.idx--; loadIv();} }
function applyIvTransform(){ const img=$('ivImg'); img.style.transform=`translate(calc(-50% + ${IV.posX}px), calc(-50% + ${IV.posY}px)) scale(${IV.scale})`; }
$('ivImg').addEventListener('wheel',(e)=>{ e.preventDefault(); const delta=e.deltaY>0?-0.1:0.1; IV.scale=Math.min(4,Math.max(1,IV.scale+delta)); applyIvTransform(); },{passive:false});
$('ivImg').addEventListener('mousedown',(e)=>{ IV.start={x:e.clientX,y:e.clientY,posX:IV.posX,posY:IV.posY}; });
window.addEventListener('mousemove',(e)=>{ if(!IV.start) return; IV.posX=IV.start.posX+(e.clientX-IV.start.x); IV.posY=IV.start.posY+(e.clientY-IV.start.y); applyIvTransform(); });
window.addEventListener('mouseup',()=>{ IV.start=null; });
$('ivImg').addEventListener('touchstart',(e)=>{ if(e.touches.length===1){ const t=e.touches[0]; IV.start={x:t.clientX,y:t.clientY,posX:IV.posX,posY:IV.posY}; IV.pinch=null; } else if(e.touches.length===2){ IV.start=null; const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); IV.pinch={dist:d, scale:IV.scale}; } },{passive:false});
$('ivImg').addEventListener('touchmove',(e)=>{ if(IV.start && e.touches.length===1){ const t=e.touches[0]; IV.posX=IV.start.posX+(t.clientX-IV.start.x); IV.posY=IV.start.posY+(t.clientY-IV.start.y); applyIvTransform(); } else if(IV.pinch && e.touches.length===2){ const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); const ratio=d/IV.pinch.dist; IV.scale=Math.min(4,Math.max(1,IV.pinch.scale*ratio)); applyIvTransform(); } },{passive:false});
$('ivImg').addEventListener('touchend',()=>{ IV.start=null; IV.pinch=null; });
$('ivClose').onclick=closeViewer; $('ivNext').onclick=nextIv; $('ivPrev').onclick=prevIv; $('imgViewerBack').onclick=closeViewer;

async function decodeVIN(){ const vin=$('vin').value.trim().toUpperCase(); if(vin.length!==17){ alert('El VIN debe tener 17 caracteres.'); return; } try{ const url=`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesExtended/${encodeURIComponent(vin)}?format=json`; const res=await fetch(url); const data=await res.json(); const r=(data&&data.Results&&data.Results[0])||{}; $('marca').value=r.Make||r.Manufacturer||''; $('modelo').value=r.Model||''; $('anio').value=r.ModelYear||''; $('pais').value=r.PlantCountry||r.PlantCity||''; }catch(e){ alert('No se pudo decodificar el VIN.'); } }

function toReport(){ renderReport(); go('report'); }
document.addEventListener('DOMContentLoaded', ()=>{ renderHome(); });
