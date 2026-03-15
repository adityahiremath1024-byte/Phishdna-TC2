function analyzeUrls(text){
  const re=/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const urls=text.match(re)||[];
  const suspicious=[];
  for(const url of urls){
    const flags=[];
    const lo=url.toLowerCase();
    const raw=lo.replace(/https?:\/\//,'').split(/[/?]/)[0];
    const domain=raw.split(':')[0];
    for(const tld of SUSP_TLDS) if(domain.endsWith(tld)) flags.push(`Suspicious extension (${tld})`);
    for(const s of URL_SHORT) if(raw.includes(s)) flags.push('URL shortener — hides real destination');
    if(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) flags.push('IP address URL — no legitimate domain');
    if(domain.split('.').length>=5) flags.push('Excessive subdomains — domain spoofing');
    for(const brand of LOOKALIKE){
      if(domain.includes(brand)){
        const parts=domain.split('.');
        const base=parts.length>=2?parts[parts.length-2]:'';
        if(!base.includes(brand)){flags.push(`Lookalike domain — impersonates ${brand.charAt(0).toUpperCase()+brand.slice(1)}`);break;}
      }
    }
    const pm=raw.match(/:(\d+)$/);
    if(pm&&![80,443,8080,8443].includes(+pm[1])) flags.push(`Non-standard port :${pm[1]}`);
    if(flags.length) suspicious.push({url:url.length>90?url.slice(0,90)+'...':url,flags:flags.slice(0,4)});
  }
  return{suspicious,total:urls.length};
}

function findMatches(text,platform){
  const lo=text.toLowerCase();
  const matches={};
  for(const[k,v] of Object.entries(ATTACK_PATTERNS)){
    const f=v.keywords.filter(kw=>lo.includes(kw));
    if(f.length) matches[k]=f;
  }
  if(PLATFORM_PATTERNS[platform]){
    const f=PLATFORM_PATTERNS[platform].keywords.filter(kw=>lo.includes(kw));
    if(f.length) matches[`platform_${platform}`]=f;
  }
  return matches;
}

function kwScore(text,platform){
  const lo=text.toLowerCase();
  let s=0.08;
  s+=Math.min(URGENCY_WORDS.filter(w=>lo.includes(w)).length*0.11,0.33);
  s+=Math.min(THREAT_WORDS.filter(w=>lo.includes(w)).length*0.14,0.42);
  s+=Math.min(MANIP_WORDS.filter(w=>lo.includes(w)).length*0.09,0.18);
  if(PLATFORM_PATTERNS[platform])
    s+=Math.min(PLATFORM_PATTERNS[platform].keywords.filter(k=>lo.includes(k)).length*0.12,0.36);
  return Math.min(s,0.94);
}

function getVerdict(s){
  if(s>=0.80) return{level:'danger',label:'High Risk — Threat Detected'};
  if(s>=0.55) return{level:'warning',label:'Suspicious — Proceed With Caution'};
  if(s>=0.35) return{level:'low',label:'Low Risk — Likely Safe'};
  return{level:'safe',label:'Clean — No Threats Detected'};
}

function analyze(text,platform){
  const{suspicious,total}=analyzeUrls(text);
  let score=kwScore(text,platform);
  score=Math.min(score+Math.min(suspicious.length*0.15,0.30),0.97);
  const matches=findMatches(text,platform);
  const topCat=Object.keys(matches).sort((a,b)=>matches[b].length-matches[a].length)[0]||null;
  if(topCat&&score<0.40) score=Math.min(score+0.22,0.94);
  else if(!topCat&&score>0.55) score*=0.72;
  const finalScore=Math.round(score*10000)/10000;
  const verdict=getVerdict(finalScore);
  const lo=text.toLowerCase();
  const uc=URGENCY_WORDS.filter(w=>lo.includes(w)).length;
  const tc=THREAT_WORDS.filter(w=>lo.includes(w)).length;
  const mc=MANIP_WORDS.filter(w=>lo.includes(w)).length;
  const indicators=[];
  if(uc) indicators.push({type:'urgency',label:`${uc} urgency trigger${uc!==1?'s':''}`,count:uc});
  if(tc) indicators.push({type:'threat',label:`${tc} threat word${tc!==1?'s':''}`,count:tc});
  if(mc) indicators.push({type:'manipulation',label:`${mc} manipulation phrase${mc!==1?'s':''}`,count:mc});
  if(suspicious.length) indicators.push({type:'url',label:`${suspicious.length} suspicious URL${suspicious.length!==1?'s':''}`,count:suspicious.length});
  let category=null;
  if(topCat&&finalScore>=0.35){
    const src=topCat.startsWith('platform_')?PLATFORM_PATTERNS[topCat.replace('platform_','')]:ATTACK_PATTERNS[topCat];
    if(src) category={id:topCat,title:src.title,what_they_want:src.what_they_want,risk_level:src.risk_level,advice:src.advice,matched_keywords:matches[topCat].slice(0,6)};
  }
  const highlights=buildHighlights(text,topCat);
  return{score:finalScore,confidence_percent:Math.round(finalScore*1000)/10,verdict,category,highlights,platform,threat_indicators:indicators,url_analysis:{total_urls:total,suspicious_urls:suspicious}};
}

function buildHighlights(text,topCat){
  const lo=text.toLowerCase();
  const seen=new Set();
  const res=[];
  let kwList=[];
  if(topCat){
    if(topCat.startsWith('platform_')) kwList=PLATFORM_PATTERNS[topCat.replace('platform_','')]?.keywords||[];
    else kwList=ATTACK_PATTERNS[topCat]?.keywords||[];
  }
  const sources=[[kwList,'category'],[URGENCY_WORDS,'urgency'],[THREAT_WORDS,'threat'],[MANIP_WORDS,'manipulation']];
  for(const[words,type] of sources)
    for(const w of words)
      if(lo.includes(w.toLowerCase())&&!seen.has(w.toLowerCase())){res.push({text:w,type});seen.add(w.toLowerCase());}
  return res;
}
