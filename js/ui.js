function e(id){return document.getElementById(id);}

function switchPlat(plat){
  currentPlat=plat;
  document.querySelectorAll('.ptab').forEach(t=>{
    const cfg=PLAT_CFG[t.dataset.plat];
    t.className='ptab';
    if(t.dataset.plat===plat) t.classList.add(cfg.tabClass);
  });
  const cfg=PLAT_CFG[plat];
  const card=e('scanCard');
  card.className='scan-card '+cfg.cardClass;
  e('platBadge').style.color=cfg.color;
  e('platBadge').textContent=cfg.icon+' '+cfg.label+' Scanner';
  e('mainTA').placeholder=cfg.ph;
  const btnEl=e('scanBtn');
  btnEl.className='scan-btn'+(cfg.btnClass?' '+cfg.btnClass:'');
  btnEl.disabled=true;
  e('mainTA').value='';
  e('charCount').textContent='No input';
  e('clrBtn').style.display='none';
  renderPresets(plat);
  clearResult();
}

function renderPresets(plat){
  const bar=e('presetsBar');
  const prs=PRESETS[plat]||[];
  bar.innerHTML=prs.map((p,i)=>`<button class="pbtn" onclick="loadPreset(${i})">${p.label}</button>`).join('');
}

function loadPreset(i){
  const ps=PRESETS[currentPlat]||[];
  if(!ps[i]) return;
  e('mainTA').value=ps[i].text;
  document.querySelectorAll('.pbtn').forEach((b,j)=>b.classList.toggle('act',j===i));
  onInput();
  clearResult();
}

function onInput(){
  const v=e('mainTA').value;
  e('charCount').textContent=v.length>0?v.length+' chars':'No input';
  e('clrBtn').style.display=v?'flex':'none';
  e('scanBtn').disabled=!v.trim()||v.trim().length<10;
  e('errBanner').style.display='none';
}

function clearAll(){
  e('mainTA').value='';
  onInput();
  document.querySelectorAll('.pbtn').forEach(b=>b.classList.remove('act'));
  clearResult();
}

function clearResult(){
  e('resultWrap').innerHTML='';
  e('attackGrid').style.display='';
}

function showErr(msg){
  e('errBanner').style.display='flex';
  e('errMsg').textContent=msg;
}

function scoreRingSVG(pct,color,size){
  size=size||88;
  const r=(size-10)/2;
  const circ=2*Math.PI*r;
  const dash=(pct/100)*circ;
  return`<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="5"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${dash} ${circ}" style="filter:drop-shadow(0 0 6px ${color}88)"/>
    </svg>
    <div class="ring-center">
      <span class="ring-n" style="color:${color}">${pct}%</span>
      <span class="ring-l">RISK</span>
    </div>
  </div>`;
}

function highlightText(text,highlights){
  if(!highlights||!highlights.length) return escHtml(text);
  const sorted=[...highlights].sort((a,b)=>b.text.length-a.text.length);
  let parts=[{t:text,type:null}];
  for(const{text:phrase,type} of sorted){
    const next=[];
    for(const part of parts){
      if(part.type!==null){next.push(part);continue;}
      const lo=part.t.toLowerCase();
      const idx=lo.indexOf(phrase.toLowerCase());
      if(idx===-1){next.push(part);continue;}
      if(idx>0) next.push({t:part.t.slice(0,idx),type:null});
      next.push({t:part.t.slice(idx,idx+phrase.length),type});
      if(idx+phrase.length<part.t.length) next.push({t:part.t.slice(idx+phrase.length),type:null});
    }
    parts=next;
  }
  const titles={category:'Attack keyword',urgency:'Urgency trigger',threat:'Threat word',manipulation:'Manipulation phrase'};
  return parts.map(p=>p.type?`<mark class="hl hl-${p.type}" title="${titles[p.type]||''}">${escHtml(p.t)}</mark>`:escHtml(p.t)).join('');
}

function escHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderResult(result,inputText){
  const cfg=RISK_CFG[result.verdict.level];
  const platCfg=PLAT_CFG[result.platform];
  const actionSteps={
    danger:['Do NOT click any links or download any attachments.','Report the message to your email provider / platform immediately.','Block the sender and warn others who may have received it.','If you already clicked a link, change your passwords immediately and check your accounts.'],
    warning:['Treat this with caution — verify the sender through official channels.','Do not provide any personal information or credentials.','Contact the organization directly using a number from their official website.','If in doubt, delete the message.'],
    low:['The message appears mostly safe but has some minor indicators.','Verify the sender independently before taking any action.','Do not click unusual links even if the overall risk is low.'],
    safe:['No significant threats detected in this message.','Always stay vigilant — attackers improve their tactics daily.','Trust your instincts — if something feels off, verify first.']
  };
  const steps=actionSteps[result.verdict.level]||actionSteps.safe;

  let html=`<div class="res"><div class="verd ${result.verdict.level}">
    <div class="vl">
      <div class="vdw"><div class="vdp" style="background:${cfg.color}"></div><div class="vd" style="background:${cfg.color}"></div></div>
      <div>
        <div class="vlbl" style="color:${cfg.color}">${result.verdict.label}</div>
        <div class="vsub">Keyword engine · pattern analysis</div>
        <span class="vplat" style="color:${platCfg.color};border-color:${platCfg.color}40;background:${platCfg.color}10">${platCfg.icon} ${platCfg.label.toUpperCase()} SCAN</span>
      </div>
    </div>
    ${scoreRingSVG(result.confidence_percent,cfg.color)}
  </div>`;

  if(result.threat_indicators&&result.threat_indicators.length){
    html+=`<div class="tchips">${result.threat_indicators.map(ind=>`
      <div class="tchip ${ind.type}">
        <span class="tcnt">${ind.count}</span>
        <span>${ind.type==='urgency'?'⚡':ind.type==='threat'?'⛔':ind.type==='manipulation'?'🎣':'🔗'}</span>
        ${ind.label}
      </div>`).join('')}</div>`;
  }

  if(result.category){
    html+=`<div class="dna">
      <div class="dna-top">
        <div><div class="at-lbl">Attack Type Identified</div><div class="at-ttl">${result.category.title}</div></div>
        <div class="rbadge ${result.category.risk_level}">${result.category.risk_level}</div>
      </div>
      <div class="dna-g">
        <div class="dna-b"><div class="dna-bl">What They Want</div><div class="dna-bv">${result.category.what_they_want}</div></div>
        <div class="dna-b"><div class="dna-bl">Matched Triggers</div><div class="ktags">${result.category.matched_keywords.map(k=>`<span class="ktag">${escHtml(k)}</span>`).join('')}</div></div>
      </div>
      <div class="adv">
        <div style="flex-shrink:0;margin-top:1px"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#38bdf8" stroke-width="1.5"/><path d="M8 5v4M8 11v.5" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/></svg></div>
        <div class="adv-t">${result.category.advice}</div>
      </div>
    </div>`;
  } else if(result.verdict.level==='safe'||result.verdict.level==='low'){
    html+=`<div class="safe-c">
      <div><svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="20" stroke="#4ade80" stroke-width="2" fill="rgba(74,222,128,0.07)"/><path d="M13 22l7 7 11-14" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div><div class="safe-t">No Threats Detected</div><div class="safe-d">This message appears clean. No known attack patterns, urgency triggers, or suspicious indicators were found.</div></div>
    </div>`;
  }

  if(result.url_analysis&&result.url_analysis.total_urls>0){
    html+=`<div class="url-card">
      <div class="url-hdr">
        <div class="url-ttl"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 8.5L8.5 5.5M6 3l1-1a3 3 0 014.24 4.24l-1 1M8 11l-1 1A3 3 0 012.76 7.76l1-1" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/></svg>URL Intelligence</div>
        <span class="url-cnt">${result.url_analysis.total_urls} URL${result.url_analysis.total_urls!==1?'s':''} found</span>
      </div>`;
    if(result.url_analysis.suspicious_urls.length){
      html+=result.url_analysis.suspicious_urls.map(u=>`
        <div class="url-item">
          <div class="url-addr">${escHtml(u.url)}</div>
          <div class="url-flags">${u.flags.map(f=>`<span class="uflag">⚠ ${escHtml(f)}</span>`).join('')}</div>
        </div>`).join('');
    } else {
      html+=`<div class="url-clean"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#4ade80" stroke-width="1.5"/><path d="M4.5 7l2 2 3-3" stroke="#4ade80" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>All ${result.url_analysis.total_urls} URL${result.url_analysis.total_urls!==1?'s':''} appear clean.</div>`;
    }
    html+=`</div>`;
  }

  if(result.highlights&&result.highlights.length){
    html+=`<div class="hmap">
      <div class="hmap-hdr">
        <span class="hmap-ttl">Threat Heatmap</span>
        <div class="legend">
          <div class="li"><span class="ld" style="background:#fda4af"></span>Attack Keyword</div>
          <div class="li"><span class="ld" style="background:#fde68a"></span>Urgency</div>
          <div class="li"><span class="ld" style="background:#fed7aa"></span>Threat</div>
          <div class="li"><span class="ld" style="background:#ddd6fe"></span>Manipulation</div>
        </div>
      </div>
      <div class="hmap-txt">${highlightText(inputText,result.highlights)}</div>
    </div>`;
  }

  html+=`<div class="act-card">
    <div class="act-ttl">What You Should Do</div>
    <div class="act-list">${steps.map((s,i)=>`
      <div class="act-item"><span class="act-n">${i+1}</span><span>${escHtml(s)}</span></div>`).join('')}
    </div>
  </div>`;

  html+=`</div>`;
  const wrap=e('resultWrap');
  wrap.innerHTML=`<div class="res-wrap">${html}</div>`;
  wrap.scrollIntoView({behavior:'smooth',block:'start'});
}

function renderHistory(){
  if(!scanHistory.length){e('histWrap').innerHTML='';return;}
  const rows=scanHistory.map((item,i)=>{
    const cfg=RISK_CFG[item.verdict.level];
    const plat=PLAT_CFG[item.platform];
    return`<button class="hist-item" onclick="loadHistory(${i})">
      <span class="hdot" style="background:${cfg.dot}"></span>
      <div class="hbody">
        <div class="htxt">${escHtml(item.preview)}</div>
        <div class="hmeta">
          <span style="color:${cfg.color}">${item.confidence_percent}% risk</span>
          ${item.category?`<span style="color:var(--t3)">${escHtml(item.category.title)}</span>`:''}
          <span style="color:var(--t3)">${plat.icon} ${plat.label}</span>
        </div>
      </div>
      <span class="htime">${item.time}</span>
    </button>`;
  }).join('');
  e('histWrap').innerHTML=`<div class="hist">
    <div class="hist-hdr">
      <span class="hist-ttl">Scan History</span>
      <span class="hist-cnt">${scanHistory.length} scan${scanHistory.length!==1?'s':''}</span>
    </div>
    <div class="hist-list">${rows}</div>
  </div>`;
}

function loadHistory(i){
  const item=scanHistory[i];
  if(!item) return;
  switchPlat(item.platform);
  e('mainTA').value=item.inputText;
  onInput();
  renderResult(item,item.inputText);
}
