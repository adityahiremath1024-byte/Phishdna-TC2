function initGlobe(canvasId){
  const canvas=document.getElementById(canvasId);
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const SIZE=320;
  canvas.width=SIZE;
  canvas.height=SIZE;
  const CX=SIZE/2;
  const CY=SIZE/2;
  const R=SIZE/2-20;

  function hexRgba(hex,a){
    const r=parseInt(hex.slice(1,3),16);
    const g=parseInt(hex.slice(3,5),16);
    const b=parseInt(hex.slice(5,7),16);
    return`rgba(${r},${g},${b},${a})`;
  }

  const pts=[];
  for(let lat=-80;lat<=80;lat+=10){
    const latR=lat*Math.PI/180;
    const density=Math.max(4,Math.round(Math.cos(latR)*20));
    for(let i=0;i<density;i++){
      pts.push([latR,(i/density)*Math.PI*2-Math.PI]);
    }
  }

  const THREAT_COLORS=['#38bdf8','#f43f5e','#4ade80','#fbbf24','#a78bfa'];

  function rndPt(){
    return[(Math.random()*140-70)*Math.PI/180,(Math.random()*360-180)*Math.PI/180];
  }

  const arcs=Array.from({length:7},(_,i)=>({
    from:rndPt(),
    to:rndPt(),
    t:Math.random(),
    speed:0.0025+Math.random()*0.003,
    color:THREAT_COLORS[i%THREAT_COLORS.length],
    trail:0.7+Math.random()*0.3
  }));

  const markers=[
    [0.65,-0.5,'#f43f5e'],
    [0.88,0.17,'#38bdf8'],
    [0.52,1.28,'#fbbf24'],
    [-0.15,-0.72,'#4ade80'],
    [0.6,2.18,'#a78bfa'],
    [0.3,-1.4,'#f43f5e']
  ];

  let rot=0;

  function project(lat,lng,rMult){
    const rr=(rMult||1)*R;
    const adjLng=lng+rot;
    const x=rr*Math.cos(lat)*Math.sin(adjLng);
    const y=-rr*Math.sin(lat);
    const z=rr*Math.cos(lat)*Math.cos(adjLng);
    return[CX+x,CY+y,z];
  }

  function drawGlobe(){
    ctx.clearRect(0,0,SIZE,SIZE);

    const atm=ctx.createRadialGradient(CX,CY,R*0.6,CX,CY,R*1.3);
    atm.addColorStop(0,'transparent');
    atm.addColorStop(0.7,'rgba(56,189,248,0.03)');
    atm.addColorStop(1,'rgba(56,189,248,0.08)');
    ctx.fillStyle=atm;
    ctx.beginPath();
    ctx.arc(CX,CY,R*1.3,0,Math.PI*2);
    ctx.fill();

    const glow=ctx.createRadialGradient(CX,CY-R*0.2,0,CX,CY,R);
    glow.addColorStop(0,'rgba(56,189,248,0.04)');
    glow.addColorStop(1,'transparent');
    ctx.fillStyle=glow;
    ctx.beginPath();
    ctx.arc(CX,CY,R,0,Math.PI*2);
    ctx.fill();

    const sorted=[...pts].map(p=>{
      const[px,py,pz]=project(p[0],p[1]);
      return{x:px,y:py,z:pz,lat:p[0],lng:p[1]};
    }).sort((a,b)=>a.z-b.z);

    for(const p of sorted){
      if(p.z<-R*0.15) continue;
      const visibility=Math.max(0,(p.z+R*0.15)/(R*1.15));
      const alpha=visibility*0.55+0.05;
      const size=visibility*1.8+0.4;
      ctx.fillStyle=hexRgba('#38bdf8',alpha);
      ctx.beginPath();
      ctx.arc(p.x,p.y,size,0,Math.PI*2);
      ctx.fill();
    }

    for(const arc of arcs){
      arc.t+=arc.speed;
      if(arc.t>1.4) {
        arc.t=0;
        arc.from=rndPt();
        arc.to=rndPt();
        arc.color=THREAT_COLORS[Math.floor(Math.random()*THREAT_COLORS.length)];
      }
      const visible=Math.min(arc.t,1);
      const STEPS=60;
      const maxI=Math.floor(visible*STEPS);
      for(let i=0;i<maxI;i++){
        const t0=i/STEPS;
        const lat=arc.from[0]+(arc.to[0]-arc.from[0])*t0;
        const lng=arc.from[1]+(arc.to[1]-arc.from[1])*t0;
        const lift=1+Math.sin(t0*Math.PI)*0.18;
        const[px,py,pz]=project(lat,lng,lift);
        if(pz<0) continue;
        const tNorm=t0/visible;
        const head=Math.pow(Math.max(0,1-Math.abs(tNorm-0.85)*3),2);
        const tailFade=t0<0.15?t0/0.15:1;
        const depthFade=(pz/R)*0.6+0.4;
        const alpha=(0.15+head*0.75)*tailFade*depthFade*arc.trail;
        const size=0.8+head*2.2;
        ctx.fillStyle=hexRgba(arc.color,alpha);
        ctx.beginPath();
        ctx.arc(px,py,size,0,Math.PI*2);
        ctx.fill();
      }

      if(arc.t>0.05&&arc.t<1.0){
        const headT=Math.min(arc.t,0.98);
        const lat=arc.from[0]+(arc.to[0]-arc.from[0])*headT;
        const lng=arc.from[1]+(arc.to[1]-arc.from[1])*headT;
        const lift=1+Math.sin(headT*Math.PI)*0.18;
        const[px,py,pz]=project(lat,lng,lift);
        if(pz>0){
          ctx.fillStyle=hexRgba(arc.color,0.95);
          ctx.beginPath();
          ctx.arc(px,py,3,0,Math.PI*2);
          ctx.fill();
          ctx.strokeStyle=hexRgba(arc.color,0.4);
          ctx.lineWidth=1;
          ctx.beginPath();
          ctx.arc(px,py,6+Math.sin(Date.now()*0.01)*2,0,Math.PI*2);
          ctx.stroke();
        }
      }
    }

    const now=Date.now();
    for(const[lat,lng,color] of markers){
      const[px,py,pz]=project(lat,lng);
      if(pz<0) continue;
      const pulse=(Math.sin(now*0.0025+lat*5)*0.5+0.5);

      ctx.strokeStyle=hexRgba(color,0.25+pulse*0.3);
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.arc(px,py,4+pulse*6,0,Math.PI*2);
      ctx.stroke();

      ctx.strokeStyle=hexRgba(color,0.15+pulse*0.2);
      ctx.lineWidth=0.5;
      ctx.beginPath();
      ctx.arc(px,py,8+pulse*10,0,Math.PI*2);
      ctx.stroke();

      ctx.fillStyle=hexRgba(color,0.9);
      ctx.beginPath();
      ctx.arc(px,py,2.5,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(px-0.7,py-0.7,0.8,0,Math.PI*2);
      ctx.fill();
    }

    const edgeGrd=ctx.createRadialGradient(CX,CY,R*0.7,CX,CY,R);
    edgeGrd.addColorStop(0,'transparent');
    edgeGrd.addColorStop(1,'rgba(56,189,248,0.1)');
    ctx.strokeStyle=edgeGrd;
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.arc(CX,CY,R,0,Math.PI*2);
    ctx.stroke();

    rot+=0.0025;
    requestAnimationFrame(drawGlobe);
  }

  drawGlobe();
}

function initBgParticles(canvasId){
  const canvas=document.getElementById(canvasId);
  if(!canvas) return;
  const ctx=canvas.getContext('2d');

  function resize(){
    canvas.width=window.innerWidth;
    canvas.height=window.innerHeight;
  }
  resize();
  window.addEventListener('resize',resize);

  const particles=Array.from({length:60},()=>({
    x:Math.random()*window.innerWidth,
    y:Math.random()*window.innerHeight,
    vx:(Math.random()-0.5)*0.25,
    vy:(Math.random()-0.5)*0.25,
    r:Math.random()*1.5+0.3,
    a:Math.random()*0.35+0.05
  }));

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const p of particles){
      p.x+=p.vx;
      p.y+=p.vy;
      if(p.x<0) p.x=canvas.width;
      if(p.x>canvas.width) p.x=0;
      if(p.y<0) p.y=canvas.height;
      if(p.y>canvas.height) p.y=0;
      ctx.fillStyle=`rgba(56,189,248,${p.a})`;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
}
