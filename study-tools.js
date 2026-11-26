// Study actions share the ordinary solo test engine and its save/review paths.
const studyDialog=$('studyDialog'), studyBody=$('studyBody');
let studyTab='', studyVersion=0;
function studyMessage(text){$('studyMessage').textContent=text;}
function studyButton(text,action){
 const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=text;
 b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){studyMessage(e.message||'Could not finish. Please retry.');}finally{b.disabled=false;}};
 return b;
}
function studyRow(title,detail){
 const row=document.createElement('article');row.className='studyRow';const label=document.createElement('strong');
 label.textContent=title;row.append(label);
 const p=document.createElement('p');p.textContent=detail;row.append(p);studyBody.append(row);return row;
}
function statsFor(q){return QS[progressStorageKey(q.id)]||{};}
function revisionQueue(questions,stats,now){
 return questions.filter(q=>q.gradeable&&q.attemptable).map(q=>{
  const s=stats(q);let rank=0;
  if(s.d&&s.d<=now)rank+=3;
  if(s.confidence==='Guess'||(s.confidence==='Sure'&&s.lastGrade==='wrong'))rank+=2;
  if(s.w&&s.w>=s.c)rank+=2;
  if(s.lastGrade==='wrong'||s.confidence==='Unsure')rank++;
  return {q,rank,d:s.d||0};
 }).filter(x=>x.rank).sort((a,b)=>b.rank-a.rank||a.d-b.d).map(x=>x.q);
}
async function startFocused(questions,testMode='practice'){
 if(!signedIn())return;
 const ids=questions.filter(q=>q.gradeable&&q.attemptable).map(q=>q.id);
 if(!ids.length)throw Error('No eligible questions in this selection.');
 if(answers.size&&!submitted&&!await ask('Start a new test?','Your current attempt will be saved in Performance.','Start'))return;
 studyDialog.close();startSoloSession(ids,testMode,{marks:1,neg:0,qsec:30},0);
}
function mistakeView(){
 const missed=DATA.questions.filter(q=>statsFor(q).w>0).sort((a,b)=>statsFor(b).w-statsFor(a).w);
 if(!missed.length){studyMessage('Your incorrect answers will appear here after a graded attempt.');return;}
 studyMessage(missed.length+' questions with a recorded mistake');
 const filter=document.createElement('select');filter.setAttribute('aria-label','Mistake category');
 const categories=['Concept gap','Misread','Guess'];
 for(const text of ['All categories',...categories])filter.add(new Option(text,text));studyBody.append(filter);
 const list=document.createElement('div');studyBody.append(list);
 function show(){
  list.replaceChildren();const subset=missed.filter(q=>filter.selectedIndex===0||statsFor(q).mistakeTag===filter.value);
  list.append(studyButton('Retry these questions',()=>startFocused(subset)));
  let offset=0;
  function more(){for(const q of subset.slice(offset,offset+30)){
   const s=statsFor(q);const row=studyRow(q.prompt,q.chapter+' · '+s.w+' incorrect attempt'+(s.w===1?'':'s'));list.append(row);
   const select=document.createElement('select');select.setAttribute('aria-label','Reason for mistake');
   select.add(new Option('Tag mistake',''));categories.forEach(c=>select.add(new Option(c,c)));select.value=s.mistakeTag||'';
   select.onchange=()=>{s.mistakeTag=select.value;s.tagTime=Date.now();persistSoon();if(filter.selectedIndex)show();};row.append(select,studyButton('Retry',()=>startFocused([q])));
  }offset+=30;if(offset<subset.length){const next=studyButton('Show more',()=>{next.remove();more();});list.append(next);}}
  more();
 }
 filter.onchange=show;show();
}
function dailyView(){
 const queue=revisionQueue(DATA.questions,statsFor,Date.now());
 if(!queue.length){studyMessage('You have no questions due or flagged for extra practice in this subject.');return;}
 const minutes=document.createElement('select');minutes.setAttribute('aria-label','Study time');
 for(const m of [10,20,30])minutes.add(new Option(m+' minutes',String(m)));
 const row=studyRow('Today’s revision','');row.append(minutes);
 const plan=()=>queue.slice(0,Math.ceil(Number(minutes.value)*60/90));
 const update=()=>row.querySelector('p').textContent=plan().length+' questions today · '+(queue.length-plan().length)+' left for a later session. Budgeted at 90 seconds per question.';
 minutes.onchange=update;update();row.append(studyButton('Start revision',()=>startFocused(plan())));
}
function priorityView(){
 const exams=[...new Set(DATA.questions.flatMap(q=>q.examTags.map(t=>t.family||t.label)))].filter(Boolean).sort();
 if(!exams.length){studyMessage('This bank has no exam tags.');return;}
 const exam=document.createElement('select'),year=document.createElement('select');exam.setAttribute('aria-label','Exam');year.setAttribute('aria-label','Year');
 exams.forEach(x=>exam.add(new Option(x,x)));studyBody.append(exam,year);const results=document.createElement('div');studyBody.append(results);
 const requested=new URLSearchParams(location.search).get('exam');if(exams.includes(requested))exam.value=requested;
 function tags(q){return q.examTags.filter(t=>(t.family||t.label)===exam.value);}
 function draw(){results.replaceChildren();const grouped=new Map();
  for(const q of DATA.questions){if(!tags(q).some(t=>!year.value||yrsOf(t).map(String).includes(year.value)))continue;
   const g=grouped.get(q.chapter)||{qs:[],c:0,w:0};g.qs.push(q);const s=statsFor(q);g.c+=s.c||0;g.w+=s.w||0;grouped.set(q.chapter,g);}
  const priority=g=>g.qs.length*(g.c+g.w?1-g.c/(g.c+g.w):0.5);
  for(const [ch,g] of [...grouped].sort((a,b)=>priority(b[1])-priority(a[1]))){
   const row=studyRow(ch,g.qs.length+' exam questions · '+(g.c+g.w?Math.round(100*g.c/(g.c+g.w))+'% accuracy':'No attempts yet'));
   results.append(row);row.append(studyButton('Practise chapter',()=>startFocused(g.qs)));
  }
 }
 function years(){year.replaceChildren(new Option('All years',''));const ys=new Set(DATA.questions.flatMap(q=>tags(q).flatMap(yrsOf)));[...ys].sort((a,b)=>b-a).forEach(y=>year.add(new Option(y,y)));draw();}
 exam.onchange=years;year.onchange=draw;years();
}
async function openStudy(tab){
 const version=++studyVersion;studyTab=tab;studyBody.replaceChildren();studyMessage('');$('studyTitle').textContent=tab;
 if(!studyDialog.open)studyDialog.showModal();
 try{
  if(tab==='Mistake notebook')mistakeView();
  if(tab==='Daily revision')dailyView();
  if(tab==='Exam priorities')priorityView();
  if(tab==='Original papers')await paperView(version);
  if(tab==='Offline practice')await offlineView(version);
 }catch(e){if(version===studyVersion)studyMessage(e.message||'Unable to open this view.');}
}
document.querySelectorAll('[data-study]').forEach(b=>b.onclick=()=>openStudy(b.dataset.study));
$('studyClose').onclick=()=>studyDialog.close();studyDialog.addEventListener('close',()=>{if(!studyDialog.open)studyVersion++;});
function collectPapers(subjects){
 const groups=new Map();
 for(const {id:sid,bank} of subjects)for(const q of bank.questions){
  if(!q.gradeable||!q.attemptable)continue;
  for(const tag of q.examTags||[]){
   const meta=q.paper||{},explicit=meta.id&&q.examTags.length===1;
   const years=yrsOf(tag);
   for(const year of years.length?years:['']){
   const name=[tag.label||tag.family,year&&!String(tag.label||'').includes(String(year))?year:'',tag.stage&&!String(tag.label||'').toLowerCase().includes(tag.stage.toLowerCase())?tag.stage:''].filter(Boolean).join(' ').trim();
   const key=explicit?'id:'+meta.id:'tag:'+name.toLowerCase();
   if(key==='tag:')continue;
   const g=groups.get(key)||{key,title:explicit?meta.id:name,subjectIds:new Set(),entries:new Map(),totals:new Set(),exam:new Set(),year:new Set(),stage:new Set(),shift:new Set()};
   const shift=String(meta.id||tag.label||'').match(/(?:shift|session)\s*[-:]?\s*(?:[1-9]\d*|[IVX]+\b|morning|evening|afternoon)|\b(?:morning|afternoon|evening)\b/i);
   g.exam.add(tag.family||tag.label);if(year)g.year.add(String(year));
   const stage=tag.stage||String(tag.label||'').match(/\b(?:prelims?|preliminary|pre|mains?|interview)\b/i)?.[0];if(stage)g.stage.add(stage);if(shift)g.shift.add(shift[0].toLowerCase());
   const n=explicit?Number(meta.no):0;const slot=n>0?'position:'+n:sid+'/'+q.id;
   const prior=g.entries.get(slot);
   if(prior&&(prior.q.prompt!==q.prompt||JSON.stringify(prior.q.options.map(o=>[o.text,o.image]))!==JSON.stringify(q.options.map(o=>[o.text,o.image]))||JSON.stringify(prior.q.correct)!==JSON.stringify(q.correct)))g.conflict=true;
   if(!prior)g.entries.set(slot,{q,sid,n});if(explicit&&+meta.total>0)g.totals.add(+meta.total);
   g.subjectIds.add(sid);groups.set(key,g);
   }
  }
 }
 return [...groups.values()].map(g=>{
  const entries=[...g.entries.values()].sort((a,b)=>(a.n||Infinity)-(b.n||Infinity));
  const total=[...g.totals][0];
  const complete=!g.conflict&&g.totals.size===1&&total===entries.length&&entries.every((e,i)=>e.n===i+1);
  return {...g,entries,total,complete};
 });
}
async function paperView(version){
 studyMessage('Loading published subjects…');const sources=[];const failed=[];
 for(const s of SUBJECTS.filter(s=>!s.id.startsWith('paper-'))){
  try{sources.push({id:s.id,bank:await ensureData(s)});}catch{failed.push(s.name);}
  if(version!==studyVersion)return;
 }
 const papers=collectPapers(sources);studyMessage(failed.length?'Unavailable subjects: '+failed.join(', '):'Select an exam sitting. Completeness requires original question numbers and the paper total.');
 const query=document.createElement('input');query.type='search';query.placeholder='Find exam, year, stage or shift';query.setAttribute('aria-label',query.placeholder);studyBody.append(query);
 const filters={};
 for(const key of ['exam','year','stage','shift']){
  const el=document.createElement('select');el.setAttribute('aria-label','Filter by '+key);
  el.add(new Option('All '+({exam:'exams',year:'years',stage:'stages',shift:'shifts'}[key]),''));
  for(const value of [...new Set(papers.flatMap(p=>[...p[key]]))].sort())el.add(new Option(value,value));
  filters[key]=el;el.onchange=options;studyBody.append(el);
 }
 const select=document.createElement('select');select.setAttribute('aria-label','Exam sitting');studyBody.append(select);const row=studyRow('','');
 function selected(){return papers[Number(select.value)];}
 function describe(){const p=selected();row.hidden=!p||select.selectedIndex<0;if(row.hidden)return;row.querySelector('strong').textContent=p.title;row.querySelector('p').textContent=p.entries.length+' questions · '+p.subjectIds.size+' subjects · '+(p.complete?'Verified complete, in original order':p.conflict?'Conflicting original positions — verify the bank':p.entries.every(e=>e.n)?'Partial paper in recorded order':'Partial collection · original order unverified');}
 function options(){select.replaceChildren();papers.forEach((p,i)=>{if(Object.entries(filters).every(([key,el])=>!el.value||p[key].has(el.value))&&p.title.toLowerCase().includes(query.value.toLowerCase()))select.add(new Option(p.title,i));});describe();}
 query.oninput=options;select.onchange=describe;row.append(studyButton('Start paper',async()=>{
  if(!signedIn())return;const p=selected();if(!p||p.conflict)throw Error('Resolve the conflicting question positions before starting.');
  const id='paper-'+crypto.randomUUID(),bank={title:p.title,chapters:[],questions:[],groups:[]},chs=new Map();
  for(const {q,sid} of p.entries){const ch=sid+'/'+q.chapterNo;if(!chs.has(ch)){chs.set(ch,chs.size+1);bank.chapters.push({no:chs.get(ch),title:q.chapter});}
   bank.questions.push({...q,id:encodeURIComponent(sid)+'/'+q.id,chapterNo:chs.get(ch),origin:{sid,id:q.id}});
  }
  await QM.kvSet('cache:'+id,bank);const subject={id,name:p.title,data:bank};SUBJECTS.push(subject);
  studyDialog.close();await openSubject(id,false);history.replaceState(history.state,'','builder.html?s='+encodeURIComponent(id));startSoloSession(bank.questions.map(q=>q.id),'exam',{marks:1,neg:0,qsec:0},0);
 }));options();
}
const assetCache='pyq-study-assets-v1';
async function offlineView(version){
 const s=SUBJ;const bank=DATA;const pinned=await QM.kvGet('cache:download:'+s.id);if(version!==studyVersion)return;
 const edition=s.cloud?String(s.cloud.version):bank.subtitle||'Built-in edition';
 const assets=new Set(bank.questions.flatMap(q=>[...(q.images||[]),...q.options.map(o=>o.image)].filter(Boolean)));
 const bankSize=new Blob([JSON.stringify(bank)]).size;
 studyMessage((navigator.onLine?'Online':'Offline')+' · Question bank '+(bankSize/1048576).toFixed(1)+' MB plus '+assets.size+' figures. Offline attempts sync after reconnection.');
 const row=studyRow(s.name,pinned?'Saved '+new Date(pinned.ts).toLocaleDateString()+' · '+pinned.edition+' · '+(pinned.bytes/1048576).toFixed(1)+' MB'+(edition!==pinned.edition?' · Update available':''):'Available for download · '+edition);
 row.append(studyButton(pinned?'Refresh download':'Download for offline practice',async()=>{
  if(!signedIn())return;
  if(!navigator.serviceWorker||!window.caches)throw Error('Offline downloads require HTTPS and service worker support.');
  await navigator.serviceWorker.register('sw.js');await QM.deadline(navigator.serviceWorker.ready,20000);
  const cache=await caches.open(assetCache);let bytes=bankSize,done=0;
  assets.add('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
  for(const asset of assets){
   const url=new URL(asset,location.href);if(!['https:',location.protocol].includes(url.protocol))throw Error('Unsupported figure URL.');
   let response=await cache.match(url.href);
   if(!response){response=await fetch(url.href,{credentials:'omit'});if(!response.ok)throw Error('Could not download '+url.pathname);await cache.put(url.href,response.clone());}
   bytes+=(await response.blob()).size;studyMessage('Saved assets '+(++done)+' / '+assets.size);
  }
  const stamp={ts:Date.now(),edition,bytes};await QM.kvSet('cache:offline:'+s.id,bank);await QM.kvSet('cache:download:'+s.id,stamp);
  studyMessage('Ready for offline solo practice on this device · '+(bytes/1048576).toFixed(1)+' MB');
 }));
}
