import wp from 'web-push';
const DB='https://studylog-cd02a-default-rtdb.firebaseio.com', ROOT='chorePlanner', SITE='https://pkh0848-rgb.github.io/home-planner/';
const PUB='BPLF0T4mL9Z9wk6_KOcBVl2qPIUCLOk074gGcvuttLriD8wppSz9Zx8qVGv0nt9xsjXWrHNJhFR7CU2opMXvXHc';
const PRIV=process.env.VAPID_PRIVATE;
if(!PRIV){console.error('no VAPID_PRIVATE');process.exit(1);}
wp.setVapidDetails('mailto:pkh0848@gmail.com', PUB, PRIV);
const z=n=>String(n).padStart(2,'0');
const k=new Date(Date.now()+324e5), Y=k.getUTCFullYear(), M=k.getUTCMonth(), D=k.getUTCDate();
const today=Y+'-'+z(M+1)+'-'+z(D), dow=new Date(Date.UTC(Y,M,D)).getUTCDay(), dim=new Date(Date.UTC(Y,M+1,0)).getUTCDate();
const g=async p=>{const r=await fetch(DB+'/'+p+'.json');return r.ok?r.json():null;};
const ks=d=>d.getUTCFullYear()+'-'+z(d.getUTCMonth()+1)+'-'+z(d.getUTCDate());
const dated=r=>['daily','days','monthday','monthweek'].includes(r.freq);
const sched=r=>{
  if(r.createdK&&today<r.createdK)return false;
  if(r.freq==='daily')return true;
  if(r.freq==='days')return (r.days||[]).includes(dow);
  if(r.freq==='monthday')return D===Math.min(r.dom||1,dim);
  if(r.freq==='monthweek'){const n=r.nths||[r.nth||1];return dow===(r.wd||0)&&n.includes(Math.ceil(D/7));}
  return false;
};
const routines=await g(ROOT+'/routines')||{}, doneT=await g(ROOT+'/done/'+today)||{}, exT=await g(ROOT+'/extras/'+today)||{}, subs=await g(ROOT+'/pushSubs')||{};
const items=[];
for(const id in routines){const r=routines[id];if(dated(r)&&sched(r)&&!doneT[id])items.push((r.emoji?r.emoji+' ':'')+r.name);}
for(const x in exT){if(!doneT[x])items.push('📍 '+exT[x].name);}
const wkd=new Date(Date.UTC(Y,M,D));wkd.setUTCDate(wkd.getUTCDate()-((dow+6)%7));
const week=[];for(let i=0;i<7;i++){week.push(ks(wkd));wkd.setUTCDate(wkd.getUTCDate()+1);}
const wIds=Object.keys(routines).filter(i=>routines[i].freq==='weekly');
let wRem=0;
if(wIds.length){const dw={};for(const d of week)dw[d]=await g(ROOT+'/done/'+d)||{};for(const id of wIds){let done=false;for(const d of week)if(dw[d][id]){done=true;break;}if(!done)wRem++;}}
let title=items.length?'🏠 오늘 할 일 '+items.length+'개':'🏠 오늘 할 일';
let body=items.length?items.join(', '):'오늘 예정된 집안일이 없어요 🎉';
if(wRem>0)body+=' / 🗓️ 이번주 안에 '+wRem+'건 남음';
const payload=JSON.stringify({title,body,url:SITE});
let sent=0,rm=0,fail=0;
for(const key in subs){
  const e=subs[key], s=e&&e.sub?e.sub:e;
  if(!s||!s.endpoint)continue;
  try{await wp.sendNotification(s,payload);sent++;}
  catch(err){
    if(err.statusCode===404||err.statusCode===410){await fetch(DB+'/'+ROOT+'/pushSubs/'+key+'.json',{method:'DELETE'});rm++;}
    else{fail++;console.error('push',err.statusCode);}
  }
}
console.log('today',today,'items',items.length,'wRem',wRem,'subs',Object.keys(subs).length,'sent',sent,'rm',rm,'fail',fail);
