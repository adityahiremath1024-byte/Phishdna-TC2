let currentPlat='email';
let scanCount=0;
let scanHistory=[];

function doScan(){
  const text=e('mainTA').value.trim();
  if(!text||text.length<10){showErr('Input too short — enter at least 10 characters.');return;}
  e('errBanner').style.display='none';
  const btn=e('scanBtn');
  const cfg=PLAT_CFG[currentPlat];
  btn.disabled=true;
  const spinClass=cfg.btnClass?'lt':'';
  btn.innerHTML=`<span class="spinner ${spinClass}"></span>Analyzing...`;
  e('resultWrap').innerHTML='';
  e('attackGrid').style.display='none';
  setTimeout(()=>{
    const result=analyze(text,currentPlat);
    renderResult(result,text);
    scanCount++;
    const pill=e('scanCountPill');
    pill.style.display='block';
    pill.textContent=scanCount+' scan'+(scanCount!==1?'s':'');
    const preview=text.slice(0,55)+(text.length>55?'…':'');
    const time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    scanHistory.unshift({...result,preview,time,inputText:text});
    if(scanHistory.length>20) scanHistory.pop();
    renderHistory();
    btn.disabled=false;
    btn.className='scan-btn'+(cfg.btnClass?' '+cfg.btnClass:'');
    btn.innerHTML=`<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 7l2 2 3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Analyze with PhishDNA`;
  },620);
}

(function init(){
  const grid=e('agGrid');
  grid.innerHTML=ATTACK_CARDS.map(c=>`
    <div class="acard">
      <span class="adot" style="background:${c.color}"></span>
      <div><div class="at">${c.title}</div><div class="ad">${c.desc}</div></div>
    </div>`).join('');
  renderPresets('email');
  e('mainTA').addEventListener('keydown',ev=>{
    if(ev.ctrlKey&&ev.key==='Enter'){ev.preventDefault();doScan();}
  });
  initGlobe('globeCanvas');
  initBgParticles('bgCanvas');
})();
