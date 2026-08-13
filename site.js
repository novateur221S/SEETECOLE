document.addEventListener('DOMContentLoaded',()=>{
  const menu=document.getElementById('menuBtn'),nav=document.querySelector('.navlinks');
  if(menu&&nav)menu.onclick=()=>nav.classList.toggle('open');

  // Repère aussi les URL réécrites en ligne (/actualites, /actualites.html, sous-dossiers).
  if(nav){
    const normalize=value=>{
      let part=(value||'').split('#')[0].split('?')[0].replace(/\/+$/,'').split('/').pop().toLowerCase();
      if(!part) part='index';
      return part.replace(/\.html?$/,'');
    };
    const current=normalize(window.location.pathname);
    nav.querySelectorAll('a[href]').forEach(link=>{
      const target=normalize(new URL(link.getAttribute('href'),window.location.href).pathname);
      const isActive=target===current || (current==='index' && target==='index');
      link.classList.toggle('active',isActive);
      link.classList.toggle('is-current-page',isActive);
      if(isActive) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
  }
  const fab=document.getElementById('miaFab'),w=document.getElementById('miaWidget'),close=document.getElementById('miaClose'),send=document.getElementById('miaWidgetSend'),inp=document.getElementById('miaWidgetInput'),msgs=document.getElementById('miaWidgetMessages');
  if(!fab||!w||!inp||!msgs)return;
  fab.onclick=()=>w.classList.toggle('open');
  if(close)close.onclick=()=>w.classList.remove('open');
  const add=(type,text)=>{msgs.insertAdjacentHTML('beforeend',`<div class="msg ${type}">${text}</div>`);msgs.scrollTop=msgs.scrollHeight;};
  const answer=()=>{
    const q=inp.value.trim();if(!q)return;
    add('user',q);const l=q.toLowerCase();
    if((l.includes('proche')||l.includes('près de moi')||l.includes('autour de moi'))&&typeof window.showNearbySchools==='function'){
      add('bot','Je lance la géolocalisation et j’affiche les écoles les plus proches sur la carte.');
      window.showNearbySchools(6);
    }else if((l.includes('meilleur')||l.includes('réussite')||l.includes('public')||l.includes('lycée')||l.includes('college')||l.includes('collège'))&&typeof window.askMia==='function'){
      add('bot','J’applique votre demande directement sur la carte.');window.askMia(q);
    }else if(l.includes('proche')||l.includes('école')||l.includes('ecole')){
      add('bot','La recherche cartographique se trouve sur l’accueil. Je vous y conduis pour utiliser la proximité, les filtres et les itinéraires routiers.');
      setTimeout(()=>location.href='index.html?mia='+encodeURIComponent(q)+'#ecoles',350);
    }else if(l.includes('cours')||l.includes('exercice')||l.includes('pdf')){
      add('bot','La page Ressources contient les cours et exercices PDF.');
    }else if(l.includes('orientation')||l.includes('métier')||l.includes('metier')){
      add('bot','La page Orientation recommande des métiers selon vos centres d’intérêt.');
    }else{
      add('bot','Je peux vous aider avec : écoles les plus proches, meilleures réussites, écoles publiques, collèges, lycées, itinéraires, ressources et orientation.');
    }
    inp.value='';
  };
  if(send)send.onclick=answer;
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')answer()});
});
