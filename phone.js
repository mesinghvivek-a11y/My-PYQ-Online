(() => {
 const small = matchMedia('(max-width: 700px), (max-height: 500px) and (max-width: 920px) and (pointer: coarse)');
 const menu = document.getElementById('phoneMenu');
 const filters = document.querySelector('.phoneFilterShell');
 function setMenu(open) {
  if (!menu) return;
  menu.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menuOpen', open);
 }
 function layout() {
  setMenu(false);
  if (filters) filters.open = !small.matches;
 }
 layout();
 if(small.addEventListener) small.addEventListener('change',layout);
 else small.addListener(layout);
 if (menu) {
  menu.onclick = () => {
   const account = document.getElementById('acctPop');
   if (account) account.hidden = true;
   setMenu(menu.getAttribute('aria-expanded') !== 'true');
  };
  document.addEventListener('click', e => {
   if (e.target.closest('#homeLinks a') || !e.target.closest('nav') || e.target.closest('#acct')) setMenu(false);
  },true);
  document.addEventListener('keydown',e=>{
   if(e.key==='Escape' && menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}
  });
 }
 if(filters){
  const count=document.getElementById('phoneFilterCount');
  function updateCount(){
   const selected=['examFilter','yearFilter','groupFilter','viewFilter'].filter(id=>{
    const value=document.getElementById(id)?.value;
    return value && value!=='all';
   }).length;
   const n=selected + (+!!document.querySelector('#mkChs input:checked')) + (+!!document.getElementById('searchBox').value);
   count.textContent=n?n+' active':'';
  }
  new MutationObserver(updateCount).observe(document.getElementById('chSummary'),{subtree:true,childList:true,characterData:true});
  filters.addEventListener('input',updateCount);
  filters.addEventListener('change',updateCount);
  updateCount();
 }
})();
