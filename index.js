const $=id=>document.getElementById(id);const fmt=new Intl.NumberFormat('fr-FR');const formatDuration=seconds=>{const total=Math.max(1,Math.round(Number(seconds||0)/60));const h=Math.floor(total/60),m=total%60;return h?`${h}H${m?` ${m}mn`:''}`:`${m}mn`;};let map,markersLayer,routeLayer,userMarker,userPos=null,filtered=[],activeRouteSchoolId=null;const imgFallback=['assets/schools/extra-real-1.png','assets/schools/extra-real-2.png','assets/schools/extra-real-3.png'];const safeImg=(s,i=0)=>s.photo||imgFallback[i%imgFallback.length];const tarif=s=>Number(s.tarif||Object.values(s.tarifs_classes||{})[0]||0);const success=s=>Number(s.taux_moyen||String(s.taux_reussite||'0').match(/\d+/)?.[0]||0);const dist=(a,b)=>{const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(b[0]-a[0]),dLon=toRad(b[1]-a[1]);const A=Math.sin(dLat/2)**2+Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(A),Math.sqrt(1-A));};function init(){filtered=[...SCHOOLS];$('schoolCount').textContent=SCHOOLS.length;fillFilters();initMap();bind();ensureCompareUI();renderAll();bot('Bonjour, je suis MIA. Je peux trouver les écoles les plus proches, les meilleures écoles, les écoles publiques, les collèges, les lycées, les ressources et l’orientation.');const pending=new URLSearchParams(location.search).get('mia');if(pending)setTimeout(()=>askMia(pending),500);}function uniq(f,rows=SCHOOLS){return [...new Set(rows.map(s=>s[f]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'fr',{sensitivity:'base'}))}
function setSelectOptions(id,values,label){const el=$(id);if(!el)return;const current=el.value;el.innerHTML=`<option value="">${label}</option>`+values.map(v=>`<option value="${String(v).replace(/"/g,'&quot;')}">${v}</option>`).join('');if(values.includes(current))el.value=current;}
function updateDepartmentOptions(resetValue=true){const ia=$('iaFilter').value;const rows=ia?SCHOOLS.filter(s=>s.ia===ia):SCHOOLS;setSelectOptions('departmentFilter',uniq('departement',rows),'Tous les départements');if(resetValue)$('departmentFilter').value='';updateCommuneOptions(true);}
function updateCommuneOptions(resetValue=true){const ia=$('iaFilter').value,dept=$('departmentFilter').value;const rows=SCHOOLS.filter(s=>(!ia||s.ia===ia)&&(!dept||s.departement===dept));setSelectOptions('communeFilter',uniq('commune',rows),'Toutes les communes');if(resetValue)$('communeFilter').value='';}
function fillFilters(){setSelectOptions('iaFilter',uniq('ia'),'Toutes les IA');updateDepartmentOptions(false);setSelectOptions('cycleFilter',uniq('cycle'),'Tous les cycles');}
function bind(){['searchInput','communeFilter','typeFilter','cycleFilter'].forEach(id=>$(id).addEventListener('input',applyFilters));$('iaFilter').addEventListener('change',()=>{updateDepartmentOptions(true);applyFilters();});$('departmentFilter').addEventListener('change',()=>{updateCommuneOptions(true);applyFilters();});$('resetBtn').onclick=resetApp;$('globalSearchBtn').onclick=()=>{$('searchInput').value=$('globalSearch').value;location.hash='#ecoles';applyFilters()};$('aiBtn').onclick=askMia;$('aiQuery').addEventListener('keydown',e=>{if(e.key==='Enter')askMia()});document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{$('aiQuery').value=b.dataset.q;askMia()});$('detailModal').onclick=e=>{if(e.target.id==='detailModal')closeModal()};}function initMap(){if(!window.L){$('map').innerHTML='<div class="map-error"><b>La bibliothèque de carte n’a pas pu charger.</b><br>Vérifiez votre connexion Internet puis rechargez la page.</div>';return}map=L.map('map',{zoomControl:true}).setView([14.50,-14.50],7);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);markersLayer=L.layerGroup().addTo(map);const Locate=L.Control.extend({options:{position:'topleft'},onAdd(){const div=L.DomUtil.create('div','leaflet-bar');div.innerHTML='<button title="Ma position" style="padding:9px;border:0;background:white;cursor:pointer">📍</button>';L.DomEvent.disableClickPropagation(div);L.DomEvent.on(div,'click',locateMe);return div}});map.addControl(new Locate());setTimeout(()=>map.invalidateSize(),250)}function applyFilters(){const q=$('searchInput').value.toLowerCase(),ia=$('iaFilter').value,dept=$('departmentFilter').value,comm=$('communeFilter').value,type=$('typeFilter').value,cycle=$('cycleFilter').value;filtered=SCHOOLS.filter(s=>{const text=[s.nom,s.ia,s.ief,s.departement,s.commune,s.cycle,s.type,s.offre].join(' ').toLowerCase();return(!q||text.includes(q))&&(!ia||s.ia===ia)&&(!dept||s.departement===dept)&&(!comm||s.commune===comm)&&(!type||s.type===type)&&(!cycle||s.cycle===cycle)});renderAll()}
function resetApp(){
  ['searchInput','iaFilter','departmentFilter','communeFilter','typeFilter','cycleFilter','globalSearch','aiQuery'].forEach(id=>{const el=$(id);if(el)el.value='';});
  filtered=[...SCHOOLS];
  updateDepartmentOptions(false);
  if(routeLayer&&map){map.removeLayer(routeLayer);routeLayer=null;}
  activeRouteSchoolId=null;
  if(userMarker&&map){map.removeLayer(userMarker);userMarker=null;}
  userPos=null;
  if(map){map.closePopup();map.setView([14.50,-14.50],7);setTimeout(()=>map.invalidateSize(),50);}
  const modal=$('detailModal');if(modal)modal.classList.remove('open');
  const chat=$('chatMessages');if(chat)chat.innerHTML='<div class="msg bot">Réinitialisation terminée. Toutes les écoles sont de nouveau affichées.</div>';
  renderAll();
  if(map)map.setView([14.50,-14.50],7);
  const panel=$('routePanel');if(panel)panel.textContent=`${SCHOOLS.length} établissement(s) affiché(s). Cliquez sur un point pour consulter sa fiche.`;
}
window.resetApp=resetApp;
function renderAll(){renderMap();renderCards()}function icon(s){return L.divIcon({className:'',html:`<div style="width:24px;height:24px;border-radius:50%;background:${s.type==='Public'?'#0f766e':'#f59e0b'};display:grid;place-items:center;color:white;border:3px solid white;box-shadow:0 4px 14px #0004;font-size:12px">${s.cycle==='Secondaire'?'🎓':'🏫'}</div>`,iconSize:[24,24],iconAnchor:[12,12]})}function renderMap(){if(!map||!markersLayer)return;markersLayer.clearLayers();const bounds=[];filtered.forEach((s,i)=>{if(!s.lat||!s.lon)return;L.marker([s.lat,s.lon],{icon:icon(s)}).bindPopup(`<div class="pop"><img src="${safeImg(s,i)}"><b>${s.nom}</b><br>${s.type} • ${s.cycle}<br>${s.commune}<br>Tarif : ${fmt.format(tarif(s))} FCFA<br>Réussite : ${success(s)}% <small>(fictive)</small><br><button class="popup-btn" onclick="openDetail('${s.id}')">Voir fiche</button> <button class="popup-btn popup-compare" onclick="toggleCompare('${s.id}')">⚖ Comparer</button> <button class="popup-btn" onclick="showRoute('${s.id}')">Itinéraire</button></div>`).addTo(markersLayer);bounds.push([s.lat,s.lon])});if(bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:14});$('routePanel').textContent=`${filtered.length} établissement(s) affiché(s). Cliquez sur un point pour consulter sa fiche.`}function renderCards(){$('schoolsGrid').innerHTML=filtered.slice(0,12).map((s,i)=>`<article class="school-card"><img src="${safeImg(s,i)}"><div class="card-pad"><span class="tag">${s.type} • ${s.cycle}</span><h3>${s.nom}</h3><p>${s.commune}, ${s.departement}</p><div class="meta"><span>⭐ ${success(s)}% réussite</span><span>💰 ${fmt.format(tarif(s))} FCFA</span></div><br><button class="btn primary" onclick="openDetail('${s.id}')">Ouvrir la fiche</button></div></article>`).join('')}function locateMe(){if(!navigator.geolocation)return alert('Géolocalisation indisponible');navigator.geolocation.getCurrentPosition(p=>{userPos=[p.coords.latitude,p.coords.longitude];if(userMarker)map.removeLayer(userMarker);userMarker=L.marker(userPos).addTo(map).bindPopup('📍 Votre position').openPopup();map.setView(userPos,14)},()=>alert('Autorisez la localisation dans votre navigateur.'))}function showOnlyRouteSchool(s){
  if(!markersLayer||!map)return;
  markersLayer.clearLayers();
  L.marker([s.lat,s.lon],{icon:icon(s)})
    .bindPopup(`<div class="pop"><b>${s.nom}</b><br>${s.type} • ${s.cycle}<br>${s.commune}</div>`)
    .addTo(markersLayer);
}
function routeActions(){
  return `<div class="hero-actions" style="margin-top:10px;gap:8px;flex-wrap:wrap">
    <button class="btn" type="button" onclick="closeRoute()">✕ Fermer l’itinéraire</button>
  </div>`;
}
function closeRoute(){
  if(routeLayer&&map){map.removeLayer(routeLayer);routeLayer=null;}
  activeRouteSchoolId=null;
  if(map)map.closePopup();
  renderMap();
  const panel=$('routePanel');
  if(panel)panel.textContent=`${filtered.length} établissement(s) affiché(s). Cliquez sur un point pour consulter sa fiche.`;
}
window.closeRoute=closeRoute;
async function showRoute(id){
  const s=SCHOOLS.find(x=>x.id===id);
  if(!s||!s.lat||!s.lon)return false;
  activeRouteSchoolId=id;
  if(!userPos){
    $('routePanel').innerHTML=`<b>${s.nom}</b><br>Autorisez votre position pour calculer l’itinéraire routier.${routeActions()}`;
    navigator.geolocation?.getCurrentPosition(p=>{
      userPos=[p.coords.latitude,p.coords.longitude];
      if(userMarker)map.removeLayer(userMarker);
      userMarker=L.marker(userPos).addTo(map).bindPopup('📍 Votre position');
      showRoute(id);
    },()=>{
      activeRouteSchoolId=null;
      $('routePanel').innerHTML=`Localisation refusée. Autorisez-la dans le navigateur puis réessayez.${routeActions()}`;
    },{enableHighAccuracy:true,timeout:10000});
    return false;
  }
  showOnlyRouteSchool(s);
  $('routePanel').innerHTML=`Calcul de l’itinéraire routier OSRM vers <b>${s.nom}</b>...${routeActions()}`;
  try{
    const url=`https://router.project-osrm.org/route/v1/driving/${userPos[1]},${userPos[0]};${s.lon},${s.lat}?overview=full&geometries=geojson&steps=true`;
    const res=await fetch(url);
    if(!res.ok)throw new Error('OSRM indisponible');
    const data=await res.json();
    if(!data.routes||!data.routes.length)throw new Error('Aucun trajet');
    const r=data.routes[0];
    const coords=r.geometry.coordinates.map(([lon,lat])=>[lat,lon]);
    if(routeLayer)map.removeLayer(routeLayer);
    routeLayer=L.polyline(coords,{weight:7,opacity:.95,color:'#e11d48',lineCap:'round',lineJoin:'round'}).addTo(map);
    const bounds=routeLayer.getBounds();
    bounds.extend(userPos); bounds.extend([s.lat,s.lon]);
    map.fitBounds(bounds,{padding:[55,55],maxZoom:16});
    const osm=`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userPos[0]}%2C${userPos[1]}%3B${s.lat}%2C${s.lon}`;
    $('routePanel').innerHTML=`<b>Itinéraire routier vers ${s.nom}</b><br>Distance : ${(r.distance/1000).toFixed(2)} km • Durée estimée : ${formatDuration(r.duration)}<br><a href="${osm}" target="_blank" rel="noopener">Ouvrir les indications dans OpenStreetMap</a>${routeActions()}`;
  }catch(err){
    const osm=`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userPos[0]}%2C${userPos[1]}%3B${s.lat}%2C${s.lon}`;
    $('routePanel').innerHTML=`Le service OSRM n’a pas répondu. <a href="${osm}" target="_blank" rel="noopener">Ouvrir quand même l’itinéraire routier dans OpenStreetMap</a>${routeActions()}`;
  }
  return false;
}
window.showRoute=showRoute;
function showNearbySchools(limit=6){
  if(!userPos){
    bot('J’ai besoin de votre position. Autorisez la géolocalisation pour afficher les écoles les plus proches.');
    navigator.geolocation?.getCurrentPosition(p=>{
      userPos=[p.coords.latitude,p.coords.longitude];
      if(userMarker)map.removeLayer(userMarker);
      userMarker=L.marker(userPos).addTo(map).bindPopup('📍 Votre position');
      showNearbySchools(limit);
    },()=>bot('La localisation a été refusée. Vous pouvez l’autoriser dans les réglages du navigateur.'),{enableHighAccuracy:true,timeout:10000});
    return [];
  }
  filtered=[...SCHOOLS].filter(s=>s.lat&&s.lon).sort((a,b)=>dist(userPos,[a.lat,a.lon])-dist(userPos,[b.lat,b.lon])).slice(0,limit);
  renderAll();
  const bounds=filtered.map(s=>[s.lat,s.lon]); bounds.push(userPos);
  map.fitBounds(bounds,{padding:[45,45],maxZoom:15});
  $('routePanel').innerHTML=`<b>${filtered.length} écoles les plus proches</b><br>Triées selon votre position actuelle. Cliquez sur « Itinéraire » pour suivre la route.`;
  bot(`J’ai affiché les ${filtered.length} écoles les plus proches de vous sur la carte.`);
  return filtered;
}

const compareSchools=[];
function ensureCompareUI(){if($('compareDock'))return;document.body.insertAdjacentHTML('beforeend',`<div id="compareDock" class="compare-dock" aria-live="polite"><button class="compare-dock-close" type="button" title="Fermer le comparateur" aria-label="Fermer le comparateur" onclick="dismissCompareDock()">×</button><div><b>Comparateur d’écoles</b><span id="compareCount">0/3 école</span></div><div id="compareMini" class="compare-mini"></div><button id="openCompareBtn" class="btn primary" type="button" onclick="openCompareModal()" disabled>Comparer</button></div><div id="compareModal" class="compare-modal" onclick="if(event.target.id==='compareModal')closeCompareModal()"><div class="compare-dialog"><button class="close compare-modal-close" aria-label="Fermer la comparaison" onclick="closeCompareModal()">× Fermer</button><h2>Comparaison des écoles</h2><p class="compare-help">Vous pouvez comparer jusqu’à 3 écoles.</p><div id="compareTableWrap"></div></div></div>`);}
function updateCompareUI(){ensureCompareUI();$('compareCount').textContent=`${compareSchools.length}/3 école${compareSchools.length>1?'s':''}`;$('compareMini').innerHTML=compareSchools.map(s=>`<span>${s.nom}<button title="Retirer" onclick="toggleCompare('${s.id}')">×</button></span>`).join('');$('openCompareBtn').disabled=compareSchools.length<2;$('compareDock').classList.toggle('visible',compareSchools.length>0);if($('compareModal').classList.contains('open'))renderCompareTable();}
function toggleCompare(id){const s=SCHOOLS.find(x=>x.id===id);if(!s)return;const idx=compareSchools.findIndex(x=>x.id===id);if(idx>=0)compareSchools.splice(idx,1);else{if(compareSchools.length>=3){alert('Vous pouvez comparer au maximum 3 écoles. Retirez une école avant d’en ajouter une autre.');return;}compareSchools.push(s);}updateCompareUI();if($('detailModal')?.classList.contains('open'))openDetail(id);}
function compareValue(label,s){if(label==='Type')return s.type||'—';if(label==='Cycle')return s.cycle||'—';if(label==='IA')return s.ia||'—';if(label==='Département')return s.departement||'—';if(label==='Commune')return s.commune||'—';if(label==='Offre')return s.offre||'—';if(label==='Réussite')return `${success(s)} %*`;if(label==='Élèves')return `${fmt.format(s.nb_eleves||0)}*`;if(label==='Enseignants')return `${fmt.format(s.nb_enseignants||0)}*`;if(label==='Tarif annuel')return `${fmt.format(tarif(s))} FCFA*`;if(label==='Bâtiment')return s.etat_batiment||'—';if(label==='Accessibilité')return s.accessibilite||'—';return '—';}
function renderCompareTable(){const labels=['Type','Cycle','IA','Département','Commune','Offre','Réussite','Élèves','Enseignants','Tarif annuel','Bâtiment','Accessibilité'];$('compareTableWrap').innerHTML=compareSchools.length<2?'<div class="empty-compare">Ajoutez au moins deux écoles pour lancer la comparaison.</div>':`<div class="compare-scroll"><table class="compare-table"><thead><tr><th>Critère</th>${compareSchools.map(s=>`<th>${s.nom}<button onclick="toggleCompare('${s.id}')" title="Retirer">×</button></th>`).join('')}</tr></thead><tbody>${labels.map(l=>`<tr><th>${l}</th>${compareSchools.map(s=>`<td>${compareValue(l,s)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="compare-note">* Données fictives de démonstration.</p>`;}
function openCompareModal(){if(compareSchools.length<2){alert('Sélectionnez au moins deux écoles.');return;}ensureCompareUI();renderCompareTable();$('compareModal').classList.add('open');}
function closeCompareModal(){$('compareModal')?.classList.remove('open');}
function dismissCompareDock(){compareSchools.splice(0,compareSchools.length);closeCompareModal();updateCompareUI();}
window.toggleCompare=toggleCompare;window.openCompareModal=openCompareModal;window.closeCompareModal=closeCompareModal;window.dismissCompareDock=dismissCompareDock;
window.showNearbySchools=showNearbySchools;function openDetail(id){const s=SCHOOLS.find(x=>x.id===id),i=SCHOOLS.indexOf(s);if(!s)return;const selected=compareSchools.some(x=>x.id===s.id);$('detailContent').innerHTML=`<div class="modal-hero" style="background-image:url('${safeImg(s,i)}')"></div><div class="modal-body"><button class="close" onclick="closeModal()">Fermer</button><span class="tag">${s.type} • ${s.cycle}</span><h2>${s.nom}</h2><p><b>Inspection d’académie :</b> ${s.ia||'Non renseignée'}</p><p><b>Localisation :</b> ${s.commune}, ${s.departement}</p><p><b>Offre :</b> ${s.offre||'Enseignement général'}</p><p><b>Résultats :</b> ${s.taux_reussite||success(s)+'%'} <small>(donnée fictive)</small></p><p><b>Effectifs :</b> ${fmt.format(s.nb_eleves||0)} élèves et ${fmt.format(s.nb_enseignants||0)} enseignants <small>(données fictives)</small></p><p><b>Tarif :</b> ${fmt.format(tarif(s))} FCFA <small>(donnée fictive)</small></p><p><b>Source :</b> noms, zones et coordonnées issus du fichier fourni ; enrichissements pédagogiques fictifs.</p><div class="hero-actions"><button class="btn compare-action ${selected?'selected':''}" onclick="toggleCompare('${s.id}')">${selected?'✓ Retirer du comparateur':'⚖ Comparer cette école'}</button><button class="btn primary" onclick="closeModal();showRoute('${s.id}')">Itinéraire</button><a class="btn" href="publireportages.html">Publireportages</a><a class="btn" href="rejoindre-setecole.html">Renseigner cette école</a></div></div>`;$('detailModal').classList.add('open')}
function closeModal(){$('detailModal').classList.remove('open')}window.openDetail=openDetail;window.closeModal=closeModal;function bot(t){$('chatMessages').insertAdjacentHTML('beforeend',`<div class="msg bot">${t}</div>`);$('chatMessages').scrollTop=99999}function user(t){$('chatMessages').insertAdjacentHTML('beforeend',`<div class="msg user">${t}</div>`)}function askMia(forced){
  const q=(forced||$('aiQuery').value).trim();
  if(!q)return;
  user(q);
  const l=q.toLowerCase();
  const amount=(l.match(/\b(\d{5,7})\b/)||[])[1];
  if(l.includes('proche')||l.includes('près de moi')||l.includes('autour de moi')){
    showNearbySchools(6);
  }else if(l.includes('meilleur')||l.includes('réussite')){
    filtered=[...SCHOOLS].sort((a,b)=>success(b)-success(a)).slice(0,10);renderAll();bot('J’ai affiché les 10 établissements aux meilleurs résultats.');
  }else if(l.includes('public')){
    filtered=SCHOOLS.filter(s=>s.type==='Public');renderAll();bot(`${filtered.length} écoles publiques sont affichées.`);
  }else if(l.includes('collège')||l.includes('college')){
    filtered=SCHOOLS.filter(s=>String(s.cycle).toLowerCase().includes('coll'));renderAll();bot(`${filtered.length} collèges sont affichés.`);
  }else if(l.includes('lycée')||l.includes('lycee')){
    filtered=SCHOOLS.filter(s=>String(s.cycle).toLowerCase().includes('second')||String(s.offre||'').toLowerCase().includes('lycée'));renderAll();bot(`${filtered.length} lycées ou établissements secondaires sont affichés.`);
  }else if(l.includes('orientation')||l.includes('métier')){
    location.href='orientation.html';
  }else if(l.includes('cours')||l.includes('exercice')||l.includes('pdf')){
    location.href='ressources.html';
  }else if(l.includes('réinitial')||l.includes('toutes les écoles')){
    resetApp();
  }else{
    bot('Je peux afficher : « écoles les plus proches », « meilleures écoles », « écoles publiques », « collèges », « lycées », « cours maths » ou « orientation ».');
  }
  $('aiQuery').value='';
}
window.askMia=askMia;document.addEventListener('DOMContentLoaded',init);