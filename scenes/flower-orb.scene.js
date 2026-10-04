/* Flower Orb - a glass sphere holding turquoise water and flowers, on a beach under a pink sky.
   Built on the Apex engine library (v2). Query: ?q=0|1|2 &scale= &t= &freeze=1 &dof=0 */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),onError:fail,
 onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},700);}});
if(!eng)return;
const cam=eng.camera;
let seed=777;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

/* ---------- beach ---------- */
const grid=buildGrid(islandH);eng.setTerrain(grid,{mode:'island'});
const ANG=.7,dir=[Math.cos(ANG),Math.sin(ANG)],side=[-dir[1],dir[0]];
const pad=findBeachPad(grid,ANG);
let k=0;while(k<40&&gridH(grid,pad[0]+dir[0]*k,pad[1]+dir[1]*k)>.7)k+=.25;   /* dry sand a few metres above the swash */
const OX=pad[0]+dir[0]*k,OZ=pad[1]+dir[1]*k,OH=gridH(grid,OX,OZ);
eng.setFocusArea(OX,OZ,OX+dir[0]*16,OZ+dir[1]*16);
eng.setClouds({coverage:.62});
eng.setFog({density:.0011});
eng.setWind({strength:.25});
eng.setPost({exposure:1.25,bloom:.08,threshold:.9,knee:.6,saturation:1.3,look:[1.08,1.22],vignette:.38,grain:.015,chromatic:.01,dofMaxCoC:Q.get('dof')==='0'?0:4});

/* ---------- breaking waves (the FFT ocean has no breakers) ----------
   Each breaker is a CPU-animated strip: 16-point cross-section blended between four key profiles
   (0 swell -> 1 steep face -> 2 plunging lip -> 3 collapsed bore), offset along the crest so the break peels.
   The lip landing throws spray; the bore turns into a whitewater sheet that runs up the sand and drains back. */
let sD=0;while(sD<80&&gridH(grid,OX+dir[0]*sD,OZ+dir[1]*sD)>-.25)sD+=.25;   /* ~25 cm deep */
let sW=0;while(sW<80&&gridH(grid,OX+dir[0]*sW,OZ+dir[1]*sW)>0)sW+=.1;       /* still-water line */
const g15=z=>1.5*Math.exp(-Math.pow(z/2.8,2));
const KEYS=[
 [-9,-7,-5,-3.4,-2.1,-1.1,-.35,.4,.9,1.4,1.9,2.4,3,3.8,4.8,6].map(z=>[z,g15(z)]),
 [[-9,0],[-7,.12],[-5,.38],[-3.4,.75],[-2.1,1.12],[-1.1,1.38],[-.35,1.5],[.25,1.48],[.7,1.36],[.95,1.18],[.82,1.02],[.55,.86],[.36,.62],[.3,.36],[.42,.14],[.7,0]],
 [[-9,0],[-7,.12],[-5,.36],[-3.4,.7],[-2.1,1.05],[-1.1,1.32],[-.2,1.5],[.9,1.5],[1.9,1.3],[2.6,.95],[2.85,.5],[2.75,.12],[.75,.75],[.4,.45],[.45,.15],[.8,0]],
 [[-9,0],[-7,.05],[-5,.12],[-3.4,.2],[-2.1,.3],[-1.1,.38],[-.2,.45],[.9,.48],[1.9,.45],[2.6,.38],[3.1,.28],[3.5,.18],[3.8,.12],[4.1,.07],[4.4,.03],[4.8,0]]];
const NP=16,SEG=90,BL=70,PER=9;
const sm01=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
function profAt(k,j){k=clamp(k,0,3);const a=Math.min(Math.floor(k),2),f=sm01(k-a),A=KEYS[a][j],B=KEYS[a+1][j];return [A[0]+(B[0]-A[0])*f,A[1]+(B[1]-A[1])*f];}
const shoreYaw=(()=>{let best=0,bd=-9;for(let a=0;a<TAU;a+=.002){const M=m4.model(0,0,0,0,a,0,1),d=-(M[8]*dir[0]+M[10]*dir[1]);if(d>bd){bd=d;best=a;}}return best;})();
const RM=m4.model(0,0,0,0,shoreYaw,0,1),AX0=[RM[0],RM[1],RM[2]],AX2=[RM[8],RM[9],RM[10]];
const toWorld=(p,x,y,z)=>[p[0]+AX0[0]*x+AX2[0]*z,p[1]+y,p[2]+AX0[2]*x+AX2[2]*z];
const ENV=[],JIT=[];for(let i=0;i<=SEG;i++){const u=i/SEG;ENV.push(Math.pow(Math.sin(Math.PI*u),.55)*(.8+.35*(vn2(u*5.3,1.7)-.3)));JIT.push(1.2*(vn2(u*3.1,8.)-.5));}
function breakerVB(vb,kG,amp,peel){
 const n=(SEG+1)*NP;
 for(let i=0;i<=SEG;i++){const u=i/SEG,x=(u-.5)*BL,env=ENV[i],k=kG+peel*(u-.5)+.15*(vn2(u*7,3)-.5);
  for(let j=0;j<NP;j++){const [z,y]=profAt(k,j),o=(i*NP+j)*8;vb[o]=x;vb[o+1]=y*env*amp;vb[o+2]=z*(.35+.65*env)+JIT[i];vb[o+6]=u;vb[o+7]=j/(NP-1);}}
 /* grid normals (central differences), then a flipped copy for the back side */
 for(let i=0;i<=SEG;i++)for(let j=0;j<NP;j++){const o=(i*NP+j)*8,P=(a,b)=>{a=clamp(a,0,SEG);b=clamp(b,0,NP-1);const q=(a*NP+b)*8;return [vb[q],vb[q+1],vb[q+2]];};
  const du=v3.sub(P(i+1,j),P(i-1,j)),dv=v3.sub(P(i,j+1),P(i,j-1));let nn=v3.cross(dv,du);const l=Math.hypot(nn[0],nn[1],nn[2])||1;
  vb[o+3]=nn[0]/l;vb[o+4]=nn[1]/l;vb[o+5]=nn[2]/l;}
 vb.copyWithin(n*8,0,n*8);for(let i=n;i<2*n;i++){vb[i*8+3]*=-1;vb[i*8+4]*=-1;vb[i*8+5]*=-1;}}
function breakerMesh(){const n=(SEG+1)*NP,vb=new Float32Array(n*16),ib=[];
 for(let i=0;i<SEG;i++)for(let j=0;j<NP-1;j++){const a=i*NP+j,b=a+NP;ib.push(a,a+1,b,a+1,b+1,b);}
 const m=ib.length;for(let t=0;t<m;t+=3)ib.push(ib[t]+n,ib[t+2]+n,ib[t+1]+n);
 breakerVB(vb,0,.3,.5);return {vb,ib:new Uint16Array(ib)};}
/* whitewater sheet: a terrain-following grid rebuilt each frame, local z toward the shore */
const WX=40,WZ=14;
function sheetMesh(){const vb=new Float32Array((WX+1)*(WZ+1)*8),ib=[];
 for(let i=0;i<WX;i++)for(let j=0;j<WZ;j++){const a=i*(WZ+1)+j,b=a+WZ+1;ib.push(a,b,a+1,a+1,b,b+1);}return {vb,ib:new Uint16Array(ib)};}
function sheetVB(vb,c,L){
 for(let i=0;i<=WX;i++)for(let j=0;j<=WZ;j++){const x=(i/WX-.5)*BL*.85,z=(j/WZ-.5)*L,w=toWorld(c,x,0,z),o=(i*(WZ+1)+j)*8;
  vb[o]=x;vb[o+1]=Math.max(gridH(grid,w[0],w[2]),0)+.035;vb[o+2]=z;vb[o+3]=0;vb[o+4]=1;vb[o+5]=0;vb[o+6]=i/WX;vb[o+7]=j/WZ;}}
const waves=[{ph:0,off:3,peel:.6},{ph:.5,off:-9,peel:-.5}].map(w=>{
 const g=breakerMesh(),m=eng.addMesh(g),sg=sheetMesh(),sm=eng.addMesh(sg);
 return {...w,vb:g.vb,m,svb:sg.vb,sm,
  o:eng.addObject({m,p:[OX,-.05,OZ],s:1,sv:[1,1.4,1],rot:[0,shoreYaw,0],castShadow:false,mat:{a:[0,0,0],m:0,r:0,mode:7,wave:{h:1.5}}}),
  so:eng.addObject({m:sm,p:[OX,0,OZ],s:1,rot:[0,shoreYaw,0],castShadow:false,mat:{a:[1,1,1],m:0,r:0,mode:0,glass:{foam:true,aTop:0,aBot:6,backfaces:false}}})};});
const lerpP=(p,pts)=>{for(let i=1;i<pts.length;i++)if(p<=pts[i][0]){const [p0,v0]=pts[i-1],[p1,v1]=pts[i];return v0+(v1-v0)*sm01((p-p0)/(p1-p0));}return pts[pts.length-1][1];};
let lastT=0;
function updateWaves(t){
 const dt=clamp(t-lastT,0,.1);lastT=t;
 for(const w of waves){const p=((t/PER+w.ph)%1+1)%1;
  /* breaker: k (shape), amp (height), d (distance offshore from the orb) */
  const k=p<.55?Math.pow(p/.55,1.6):p<.68?1+(p-.55)/.13:p<.82?2+(p-.68)/.14:3;
  const amp=p<.55?.32+.68*sm01(p/.5):p<.82?1:Math.max(0,1-(p-.82)/.12);
  const d=lerpP(p,[[0,sD+20],[.6,sD+8.5],[.82,sD+5.5],[.95,sD+1.5],[1,sD+1.5]]);
  const c=[OX+dir[0]*d+side[0]*w.off,-.05,OZ+dir[1]*d+side[1]*w.off];
  w.o.p=c;breakerVB(w.vb,k,amp,w.peel);eng.updateMesh(w.m,w.vb);
  w.o.mat.r=sm01((p-.55)/.2);w.o.mat.m=t;
  /* spray where the lip lands (k ~ 2) and mist while it collapses */
  if(dt>0&&amp>.2)for(let i=2;i<SEG;i+=4){const u=i/SEG,kk=k+w.peel*(u-.5);
   if(kk>1.8&&kk<2.4&&Math.random()<dt*(kk<2.2?26:10)){const [z,y]=profAt(kk,10),pw=toWorld(c,(u-.5)*BL,y*ENV[i]*amp*1.4,z*(.35+.65*ENV[i])+JIT[i]);
    eng.spawnParticles(0,[pw[0],Math.max(pw[1],.15),pw[2]],5+3*Math.random(),9,1.2,[-dir[0]*2.4,2.2,-dir[1]*2.4],3.2);}
   else if(kk>2.4&&kk<2.95&&Math.random()<dt*8){const [z,y]=profAt(kk,8),pw=toWorld(c,(u-.5)*BL,y*ENV[i]*amp*1.4,z*(.35+.65*ENV[i])+JIT[i]);
    eng.spawnParticles(0,[pw[0],Math.max(pw[1],.1),pw[2]],3,5,1.6,[-dir[0]*1.5,1,-dir[1]*1.5],3.6);}}
  /* whitewater: bore -> run-up onto the sand -> backwash */
  const pp=p<.3?p+1:p;let F,L,a;
  if(pp<.62){a=0;F=d;L=4;}
  else if(pp<.95){F=lerpP(pp,[[.62,sD+5.5],[.82,sD+2.5],[.95,sW]]);L=lerpP(pp,[[.62,3],[.8,8],[.95,7]]);a=sm01((pp-.62)/.06);}
  else if(pp<1.1){const q=(pp-.95)/.15;F=sW-3.4*Math.sin(q*Math.PI/2);L=7-3.5*q;a=1-.25*q;}
  else{const q=(pp-1.1)/.2;F=sW-3.4+(3.9)*sm01(q);L=3.5-1.5*q;a=.75*(1-q);}
  const sc=[OX+dir[0]*(F+L/2)+side[0]*w.off,0,OZ+dir[1]*(F+L/2)+side[1]*w.off];
  w.so.p=sc;sheetVB(w.svb,sc,L);eng.updateMesh(w.sm,w.svb);w.so.mat.glass.aTop=a;w.so.mat.glass.aBot=L;}}

/* ---------- glass orb + water ---------- */
const R=.22,CY=OH+R*.86,FILL=-.32;           /* sphere radius (m), centre height (sunk a little into the sand), water line in local units */
const shell=genSphere(1,72,48);
function genLiquid(fill,rad){   /* sphere cap below y=fill with a flat top disc, unit space */
 const vb=[],ib=[],NT=36,NA=64,tf=Math.acos(fill);
 for(let i=0;i<=NT;i++){const th=tf+(Math.PI-tf)*i/NT,sn=Math.sin(th),cs=Math.cos(th);
  for(let j=0;j<=NA;j++){const a=j/NA*TAU,x=Math.cos(a)*sn,z=Math.sin(a)*sn;vb.push(x*rad,cs*rad,z*rad,x,cs,z,j/NA,i/NT);}}
 for(let i=0;i<NT;i++)for(let j=0;j<NA;j++){const a=i*(NA+1)+j,b=a+NA+1;ib.push(a,b,a+1,a+1,b,b+1);}
 const c=vb.length/8,rr=Math.sin(tf)*rad;vb.push(0,fill*rad,0,0,1,0,.5,.5);
 for(let j=0;j<=NA;j++){const a=j/NA*TAU;vb.push(Math.cos(a)*rr,fill*rad,Math.sin(a)*rr,0,1,0,0,0);}
 for(let j=0;j<NA;j++)ib.push(c,c+2+j,c+1+j);
 return {vb:new Float32Array(vb),ib:new Uint16Array(ib)};}
const orbP=[OX,CY,OZ];
eng.addObject({m:eng.addMesh(genLiquid(FILL,.965)),p:orbP,s:R,rot:[0,0,0],castShadow:false,
 mat:{a:[.02,.78,.70],m:0,r:.02,mode:0,glass:{liquid:true,aTop:.62}}});
eng.addObject({m:eng.addMesh(shell),p:orbP,s:R,rot:[0,0,0],castShadow:false,
 mat:{a:[1,.97,1],m:0,r:.02,mode:0,glass:{aTop:.10,aBot:.10,ior:1.45,r:1}}});
/* a faint contact shadow: an invisible-in-colour cap that only casts (the glass itself does not) */
eng.addObject({m:eng.addMesh(genSphere(1,16,10)),p:[OX,OH+R*.25,OZ],s:R*.55,rot:[0,0,0],mat:{a:[0,0,0],m:0,r:1,mode:0,glass:{hidden:true}}});

/* ---------- flowers: a bouquet inside the orb, a few fallen ones outside ---------- */
const leaf={stem:[.10,.20,.05],leaf:[.09,.20,.04],leaf2:[.16,.26,.06],leafRough:.45};
/* heads sit around the water line; stems go down into the orb floor (their lower part is hidden under the sand) */
const HH={cosmos:.55,daisy:.42,spike:.62,buttercup:.32};
function bunch(kind,n,rMax,headY,sc,tilt){const a=new Float32Array(n*8);
 for(let i=0;i<n;i++){const an=rnd()*TAU,rr=Math.sqrt(rnd())*rMax,s=sc[0]+(sc[1]-sc[0])*rnd(),hy=headY+(rnd()-.5)*.05;
  a.set([OX+Math.cos(an)*rr,hy-HH[kind]*s,OZ+Math.sin(an)*rr,s,rnd()*TAU,tilt*(rnd()*.8+.2),rnd()*TAU,rnd()],i*8);}return a;}
const wl=CY+FILL*R;   /* world height of the water line */
const F=(kind,sd,inst,mat)=>eng.addFoliage({geom:genFlower(kind,sd),instances:inst,cell:4,farFrac:1,mat:{...leaf,...mat}});
F('cosmos',11,bunch('cosmos',5,R*.5,wl+.045,[.85,1.0],.6),{petal:[.86,.62,.02],petal2:[.92,.74,.06],center:[.8,.45,.02],petalRough:.45,trans:1.1});
F('daisy',12,bunch('daisy',4,R*.45,wl+.06,[1.2,1.4],.5),{petal:[.88,.70,.03],petal2:[.95,.80,.10],center:[.85,.55,.02],petalRough:.45,trans:1});
F('cosmos',13,bunch('cosmos',3,R*.5,wl+.03,[.8,.95],.6),{petal:[.62,.02,.22],petal2:[.78,.06,.36],center:[.55,.04,.18],petalRough:.4,trans:1.1});
F('cosmos',14,bunch('cosmos',5,R*.55,wl+.01,[.75,.9],.7),{petal:[.88,.42,.58],petal2:[.94,.62,.74],center:[.8,.4,.5],petalRough:.42,trans:1.1});
F('spike',15,bunch('spike',3,R*.25,CY+R*.62,[.55,.62],.25),{petal:[.86,.38,.56],petal2:[.92,.55,.70],center:[.8,.4,.5],petalRough:.5,trans:1});
/* fallen yellow heads on the sand: stems buried, only the flower shows */
{const n=6,a=new Float32Array(n*8);
 for(let i=0;i<n;i++){const an=(i<4?-.9+i*.55:2.2+i*.4)+rnd()*.3,rr=R*(1.15+rnd()*.5),x=OX+(-dir[0]*Math.cos(an)+side[0]*Math.sin(an))*rr,z=OZ+(-dir[1]*Math.cos(an)+side[1]*Math.sin(an))*rr,s=.8+rnd()*.3;
  a.set([x,gridH(grid,x,z)+.012-HH.cosmos*s,z,s,rnd()*TAU,.5,rnd()*TAU,rnd()],i*8);}
 F('cosmos',21,a,{petal:[.88,.66,.02],petal2:[.95,.78,.08],center:[.8,.45,.02],petalRough:.45,trans:1});}

/* ---------- pebbles ringing the orb, glitter and gem chips on the sand ---------- */
const noFlutter=g=>{for(let i=0;i<g.vb.length/8;i++)g.vb[i*8+7]=3;return g;};
{const n=90,a=new Float32Array(n*8);let m=0;
 for(let i=0;i<n;i++){const an=rnd()*TAU,rr=R*(.82+rnd()*.42),x=OX+Math.cos(an)*rr,z=OZ+Math.sin(an)*rr;
  if(v3.dot([Math.cos(an),0,Math.sin(an)],[dir[0],0,dir[1]])>.55&&rnd()<.7)continue;
  const s=.009+rnd()*.012;a.set([x,gridH(grid,x,z)+s*.25,z,s,rnd()*TAU,0,0,0],m*8);m++;}
 eng.addInstanced({kind:'debris',geom:noFlutter(genPebble(2)),instances:a.subarray(0,m*8),shadow:true});}
{const n=900,a=new Float32Array(n*8);
 for(let i=0;i<n;i++){const an=rnd()*TAU,rr=R*1.1+Math.pow(rnd(),1.6)*2.2,x=OX+Math.cos(an)*rr-dir[0]*.4,z=OZ+Math.sin(an)*rr-dir[1]*.4;
  const big=rnd()<.08,s=big?.006+rnd()*.008:.0015+rnd()*.002;a.set([x,gridH(grid,x,z)+s*.3,z,s,rnd()*TAU,0,0,rnd()],i*8);}
 eng.addInstanced({kind:'gem',geom:noFlutter(genSphere(1,8,6)),instances:a,shadow:false});}

/* ---------- pink glass hearts ---------- */
function genHeart(){
 const tab=[];for(let i=0;i<720;i++){const t=i/720*TAU,x=16*Math.pow(Math.sin(t),3),y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);tab.push([Math.atan2(y+3,x),Math.hypot(x,y+3)/17]);}
 const rAt=a=>{let b=tab[0],bd=9;for(const q of tab){let d=Math.abs(q[0]-a);d=Math.min(d,TAU-d);if(d<bd){bd=d;b=q;}}return b[1];};
 const g=genSphere(1,48,32),vb=g.vb;
 for(let i=0;i<vb.length;i+=8){const x=vb[i],y=vb[i+1],z=vb[i+2],l=Math.hypot(x,y),h=rAt(Math.atan2(y,x));
  vb[i]=l>1e-5?x*h:0;vb[i+1]=l>1e-5?y*h:0;vb[i+2]=z*.42*Math.pow(Math.max(h,.2),.5);}
 return weldNormals(g);}
const heartM=eng.addMesh(genHeart());
for(const [lat,back,sc,yaw] of [[.42,.05,.05,.5],[-.36,-.42,.045,-.4]]){
 const x=OX+side[0]*lat-dir[0]*back,z=OZ+side[1]*lat-dir[1]*back;
 eng.addObject({m:heartM,p:[x,gridH(grid,x,z)+sc*.32,z],s:sc,rot:[-1.25,yaw+ANG,0],castShadow:true,
  mat:{a:[1,.35,.62],m:0,r:.05,mode:0,glass:{aTop:.82,aBot:.82,ior:1.5,r:.6}}});}

/* ---------- camera: low, close, shallow focus on the orb, sea behind ---------- */
cam.fov=38*DEG;cam.fstop=1.8;cam.bokehScale=Q.get('dof')==='0'?0:1.25;
const rig={mode:'film',yaw:0,pitch:0,dist:1.7};
function setMode(m){rig.mode=m;$('bMode').textContent=m==='film'?'Film':'Free';}
const tgt=[OX,CY,OZ];
function update(dt,t){
 updateWaves(t);
 let yaw=Math.atan2(dir[1],dir[0])+Math.PI+.05,pit=.10,d=rig.dist;
 const asp=cv.width/Math.max(cv.height,1);if(asp>1.2)d*=.85;
 if(rig.mode==='film'){yaw+=.10*Math.sin(t*.07);pit+=.025*Math.sin(t*.05);}
 else{yaw+=rig.yaw;pit=clamp(pit+rig.pitch,.03,1.2);}
 const cp=Math.cos(pit),p=[tgt[0]+d*cp*Math.cos(yaw),tgt[1]+d*Math.sin(pit),tgt[2]+d*cp*Math.sin(yaw)];
 p[1]=Math.max(p[1],gridH(grid,p[0],p[2])+.1);
 cam.pos=p;cam.target=[tgt[0]+dir[0]*.05,tgt[1]+.2,tgt[2]+dir[1]*.05];cam.focusTarget=tgt;}

/* ---------- input + HUD ---------- */
$('top').textContent='Drag: orbit   Pinch or wheel: zoom';
const ptr=new Map(),cv=$('c');let pinch0=0,dist0=1;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptr.size===2){const [a,b]=[...ptr.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);dist0=rig.dist;}});
cv.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(ptr.size===1&&Math.abs(dx)+Math.abs(dy)>1){setMode('free');rig.yaw-=dx*.005;rig.pitch=clamp(rig.pitch+dy*.004,-.1,1.1);}
 else if(ptr.size===2){const [a,b]=[...ptr.values()];setMode('free');rig.dist=clamp(dist0*pinch0/Math.max(Math.hypot(a.x-b.x,a.y-b.y),1),.55,5);}});
const pup=e=>ptr.delete(e.pointerId);cv.addEventListener('pointerup',pup);cv.addEventListener('pointercancel',pup);
cv.addEventListener('wheel',e=>{e.preventDefault();setMode('free');rig.dist=clamp(rig.dist*(1+e.deltaY*.001),.55,5);},{passive:false});
const SAZ=ANG/DEG;
const TOD=[{n:'Pink hour',el:3.5,az:SAZ+150},{n:'Golden hour',el:12,az:SAZ-25},{n:'Noon',el:58,az:SAZ-90},{n:'Dusk',el:-1.5,az:SAZ+8}];let ti=0;
$('bTime').textContent=TOD[0].n;
$('bMode').onclick=()=>{setMode(rig.mode==='film'?'free':'film');if(rig.mode==='film'){rig.yaw=0;rig.pitch=0;rig.dist=1.7;}};
$('bTime').onclick=()=>{ti=(ti+1)%TOD.length;eng.setTimeOfDay(TOD[ti].el,TOD[ti].az,3.5);$('bTime').textContent=TOD[ti].n;};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').onclick=()=>{$('bSnd').textContent=eng.audio.toggle()?'Sound on':'Sound off';};

if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
eng.setTimeOfDay(Q.has('el')?+Q.get('el'):TOD[0].el,Q.has('az')?+Q.get('az'):TOD[0].az,0);
if(Q.has('t'))eng.time=+Q.get('t');eng.frozen=Q.has('freeze');window.__eng=eng;
eng.start(update);
})();
