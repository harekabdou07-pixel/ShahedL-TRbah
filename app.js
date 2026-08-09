/* شاهد لتربح — game state and ad bridge */
const $ = id => document.getElementById(id);
const KEY='shahed_state_v3';
const HOUR=60*60*1000;
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{
  coins:0,cash:0,
  tries:{wheel:2,shake:2,instant:2},
  resetAt:Date.now()+HOUR,
  loginClaimed:false
};
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function render(){
  $('cash').textContent=state.cash.toFixed(2);
  $('profileCash').textContent='$'+state.cash.toFixed(2);
  ['wheel','shake','instant'].forEach(t=>$(t+'Tries').textContent=state.tries[t]+'/2');
  $('coinBalance').textContent=state.coins.toLocaleString('en-US');
  save();
}
function addCoins(n, label='المكافأة'){
  state.coins+=n;
  while(state.coins>=50000){state.coins-=50000;state.cash+=0.10;}
  render(); toast('+'+n.toLocaleString('en-US')+' عملة');
}
function toast(msg){
  const x=$('toast'); x.textContent=msg; x.classList.add('show');
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>x.classList.remove('show'),1600);
}
/* Native bridge: when packaged for Android, a native ad layer can replace this.
   On the web preview it deliberately uses a safe demo ad so no fake ad revenue is generated. */
async function watchAd(name,reward,cb){
  const ok=await demoAd(name);
  if(ok){ addCoins(reward,name); if(cb)cb(); }
}
function demoAd(name){
  return new Promise(resolve=>{
    $('adTitle').textContent=name;
    $('adModal').classList.add('show');
    let left=3; $('adCountdown').textContent=left;
    const timer=setInterval(()=>{
      left--; $('adCountdown').textContent=Math.max(left,0);
      if(left<=0){clearInterval(timer);$('adClose').disabled=false;}
    },1000);
    $('adClose').disabled=true;
    $('adClose').onclick=()=>{ $('adModal').classList.remove('show');resolve(true); };
  });
}
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $(id).classList.add('active');
  render();
  if(id==='instant')buildBoard();
  window.scrollTo({top:0,behavior:'smooth'});
}
function claimLogin(){
  if(state.loginClaimed){toast('تم استلام مكافأة الدخول');return;}
  state.loginClaimed=true; addCoins(200,'تسجيل الدخول');
}
function play(type){
  if(state.tries[type]>0){
    state.tries[type]--; render();
    if(type==='wheel') spinWheel();
    else if(type==='shake') shakePrize();
    else instantPlay();
  }else{
    watchAd('فرصة إضافية',1000,()=>{ /* ad reward already credited */ state.tries[type]=1; render(); });
  }
}
function spinWheel(){
  const prizes=[500,1000,1500,2000,2500,5000];
  if(Math.random()<0.12){state.cash+=5;render();toast('الجائزة: $5 💵');}
  else addCoins(prizes[Math.floor(Math.random()*prizes.length)]);
}
function shakePrize(){
  const prizes=[500,1000,1500,2000,2500,5000];
  if(Math.random()<0.12){state.cash+=5;render();toast('الجائزة: $5 💵');}
  else addCoins(prizes[Math.floor(Math.random()*prizes.length)]);
}
function buildBoard(){
  const b=$('board'); b.innerHTML='';
  for(let i=0;i<9;i++){
    const x=document.createElement('button'); x.textContent='?';
    x.onclick=()=>{
      if(x.dataset.done)return;
      if(state.tries.instant>0){
        state.tries.instant--; x.dataset.done='1';
        x.textContent=['👑','👑','💵','👑','⭐'][Math.floor(Math.random()*5)];
        render(); if(x.textContent==='💵'){state.cash+=5;render();toast('الجائزة: $5 💵')}else addCoins(1000);
      }else watchAd('فرصة إضافية',1000,()=>{state.tries.instant=1;render();});
    }; b.appendChild(x);
  }
}
function resetHourly(){
  if(Date.now()>=state.resetAt){
    state.tries={wheel:2,shake:2,instant:2};
    state.resetAt=Date.now()+HOUR; save(); toast('تم تجديد الفتحتين المجانيتين');
  }
}
function tick(){
  resetHourly();
  const d=Math.max(0,state.resetAt-Date.now());
  const h=String(Math.floor(d/3600000)).padStart(2,'0');
  const m=String(Math.floor(d%3600000/60000)).padStart(2,'0');
  const s=String(Math.floor(d%60000/1000)).padStart(2,'0');
  $('timer').textContent=`${h}:${m}:${s}`;
}
setInterval(tick,1000); tick(); render();
