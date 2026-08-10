/* شاهد لتربح — game state and ad bridge */
const $ = id => document.getElementById(id);
const KEY='shahed_state_v3';
const HOUR=60*60*1000;
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{
  coins:0,
  tries:{wheel:2,shake:2,instant:2},
  resetAt:Date.now()+HOUR,
  loginClaimed:false
};
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function render(){
  $('cash').textContent=state.coins.toLocaleString('en-US');
  $('profileCash').textContent=state.coins.toLocaleString('en-US')+' 👑';
  ['wheel','shake','instant'].forEach(t=>$(t+'Tries').textContent=state.tries[t]+'/2');
  $('coinBalance').textContent=state.coins.toLocaleString('en-US');
  save();
}
function addCoins(n, label='المكافأة'){
  state.coins+=n;
  render(); toast('+'+n.toLocaleString('en-US')+' عملة');
}
function toast(msg){
  const x=$('toast'); x.textContent=msg; x.classList.add('show');
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>x.classList.remove('show'),1600);
}
/* Native Google Mobile Ads bridge.
   Android uses the production AdMob unit IDs configured in MainActivity.java.
   The browser/GitHub Pages preview uses a demo modal and never generates ad revenue. */
let pendingRewardedCallback = null;
function watchAd(name,reward,cb){
  if(window.AndroidAdMob && typeof window.AndroidAdMob.showRewardedAd==="function"){
    pendingRewardedCallback = typeof cb === 'function' ? cb : null;
    window.showRewardedAd(reward);
    return;
  }
  // Safe browser preview only.
  demoAd(name).then(ok=>{
    if(ok){
      addCoins(reward,name);
      if(cb)cb();
    }
  });
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
  if(id!=='rewards') window.maybeShowInterstitial();
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
  if(Math.random()<0.12){addCoins(5000);}
  else addCoins(prizes[Math.floor(Math.random()*prizes.length)]);
}
function shakePrize(){
  const prizes=[500,1000,1500,2000,2500,5000];
  if(Math.random()<0.12){addCoins(5000);}
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
        render(); if(x.textContent==='👑'){addCoins(5000)}else addCoins(1000);
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


/* ===== Rewarded Ads bridge ===== */
(function(){
  let pending=0;

  window.showRewardedAd=function(reward){
    pending=Math.max(1,Number(reward)||100);
    if(window.AndroidAdMob && typeof window.AndroidAdMob.showRewardedAd==="function"){
      window.AndroidAdMob.showRewardedAd(pending);
      return;
    }
    // Browser preview: no real ads.
    demoAd("إعلان مكافأة").then(ok=>{
      if(ok) window.onNativeRewardedAd(pending);
    });
  };

  window.onNativeRewardedAd=function(reward){
    const earned=Math.max(0,Number(reward)||pending);
    addCoins(earned);
    pending=0;
    const cb=pendingRewardedCallback;
    pendingRewardedCallback=null;
    if(typeof cb==="function")cb();
  };

  window.onNativeRewardedAdFailed=function(){
    pending=0;
    pendingRewardedCallback=null;
    toast("تعذر تحميل الإعلان. حاول لاحقًا");
  };

  window.shahedRewardedAd={show:window.showRewardedAd};
})();

/* Interstitial: called when the user changes sections. Android throttles it. */
window.maybeShowInterstitial=function(){
  if(window.AndroidAdMob && typeof window.AndroidAdMob.showInterstitialAd==="function"){
    window.AndroidAdMob.showInterstitialAd();
  }
};
