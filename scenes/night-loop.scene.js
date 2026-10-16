/* Night Loop - an original night-track cinematic demo on the Apex engine. A steep curved ramp with red edge lights and a steel
   frame; a white sports car drives up it, launches, flips once, lands and drifts in smoke; six shots cut between a low hero
   angle, a side follow, a chase, an overhead drone, an LED beauty shot, a hero orbit and a pull-back. Film time is a pure
   function of time, so it can be seeked. Query: ?t=seconds (0-46) &freeze=1 &q=0|1|2 */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),minScale:.75,onError:fail,onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},800);}});
if(!eng)return;
const cam=eng.camera;
const DUR=46,G=9.8;

/* ---------- geometry helpers (same conventions as the treasure chest scene) ---------- */
function rotX(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c];}
function rotY(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c];}
function place(g,o){o=o||{};const pre=o.pre||[0,0,0],mid=o.mid||[0,0,0],at=o.at||[0,0,0],rx=o.rx||0,yaw=o.yaw||0,s=o.s||1;
 const vb=new Float32Array(g.vb.length);
 for(let i=0;i<g.vb.length;i+=8){
  let p=[g.vb[i]*s+pre[0],g.vb[i+1]*s+pre[1],g.vb[i+2]*s+pre[2]],n=[g.vb[i+3],g.vb[i+4],g.vb[i+5]];
  p=rotY(v3.add(rotX(p,rx),mid),yaw);p=v3.add(p,at);
  n=rotY(rotX(n,rx),yaw);
  vb.set([p[0],p[1],p[2],n[0],n[1],n[2],g.vb[i+6],g.vb[i+7]],i);}
 return {vb,ib:g.ib};}
function mergeG(list){let nv=0,ni=0;for(const g of list){nv+=g.vb.length/8;ni+=g.ib.length;}
 const vb=new Float32Array(nv*8),ib=new Uint32Array(ni);let ov=0,oi=0;
 for(const g of list){vb.set(g.vb,ov*8);for(let k=0;k<g.ib.length;k++)ib[oi+k]=g.ib[k]+ov;ov+=g.vb.length/8;oi+=g.ib.length;}
 return {vb,ib};}
/* a surface of revolution about +y from a [radius, y] profile */
function lathe(prof,n){const vb=[],ib=[],m=prof.length;
 for(let i=0;i<m;i++){const [r,y]=prof[i];for(let j=0;j<=n;j++){const a=j/n*TAU;vb.push(Math.cos(a)*r,y,Math.sin(a)*r,0,1,0,j/n,i/(m-1));}}
 for(let i=0;i<m-1;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;ib.push(a,b,a+1,a+1,b,b+1);}
 return weldNormals({vb:new Float32Array(vb),ib:new Uint32Array(ib)});}
/* a square-section bar from a to b, drawn double-sided */
function tube(a,b,r){const d=v3.sub(b,a),D=v3.norm(d);
 const t=Math.abs(D[1])<.9?[0,1,0]:[1,0,0];const u=v3.norm(v3.cross(D,t)),w=v3.cross(u,D);
 const c=[[1,0],[0,1],[-1,0],[0,-1]].map(([x,y])=>[u[0]*x*r+w[0]*y*r,u[1]*x*r+w[1]*y*r,u[2]*x*r+w[2]*y*r]);
 const vb=[],ib=[];
 for(let k=0;k<4;k++){const q=c[k],q2=c[(k+1)%4],nrm=v3.norm(v3.add(q,q2));
  const base=vb.length/8;
  for(const [p,uu,vv] of [[v3.add(a,q),0,0],[v3.add(b,q),0,1],[v3.add(b,q2),1,1],[v3.add(a,q2),1,0]])vb.push(p[0],p[1],p[2],nrm[0],nrm[1],nrm[2],uu,vv);
  ib.push(base,base+1,base+2,base,base+2,base+3,base,base+2,base+1,base,base+3,base+2);}
 return {vb:new Float32Array(vb),ib:new Uint32Array(ib)};}
/* a grid surface fn(s,w) -> {p,n}, drawn double-sided so the winding never hides it */
function sweep(nS,nW,fn){const vb=[],ib=[];
 for(let i=0;i<=nS;i++)for(let j=0;j<=nW;j++){const r=fn(i/nS,j/nW);vb.push(r.p[0],r.p[1],r.p[2],r.n[0],r.n[1],r.n[2],j/nW,i/nS);}
 for(let i=0;i<nS;i++)for(let j=0;j<nW;j++){const a=i*(nW+1)+j,b=a+nW+1;ib.push(a,b,a+1,a+1,b,b+1,a,a+1,b,a+1,b+1,b);}
 return {vb:new Float32Array(vb),ib:new Uint32Array(ib)};}
const lerp3=(a,b,s)=>[a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s,a[2]+(b[2]-a[2])*s];

/* ---------- environment: night, dark asphalt, one floodlight, a red rim light, post ---------- */
eng.setFog({density:.004,falloff:.04,horizon:[1e6,2e6],rayleigh:0,mie:0,g:.76});
eng.setClouds({coverage:0});
eng.setTimeOfDay(-30,200,0);
eng.setPost({tone:'agx',exposure:1.5,look:[1,1],saturation:1.08,curve:.22,bloom:.35,threshold:.9,knee:.5,grain:.02,chromatic:.003,vignette:.45,dofMaxCoC:10});
cam.fstop=2.8;cam.bokehScale=2;cam.shutterAngle=180;
eng.addObject({m:eng.addMesh(place(genBox(900,.4,900),{mid:[0,-.2,0]})),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.022,.022,.026],m:0,r:.5,wet:.5}});
eng.addObject({m:eng.addMesh(place(genBox(44,.02,.2),{mid:[26,.01,0]})),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.7,.7,.68],m:0,r:.6}});
const flood=eng.addLight({type:'spot',pos:[-40,46,40],dir:[.6,-.6,-.5],color:[1,.96,.9],intensity:900,range:200,angle:.34,inner:.22});
flood.dir=v3.norm(v3.sub([14,6,-2],flood.pos));
eng.addLight({type:'point',pos:[18,14,-16],color:[1,.1,.05],intensity:9,range:60});

/* ---------- the ramp: a circular arc of radius R, from horizontal on the ground up to 60 degrees; steel frame underneath ---------- */
const R=24,PHI=Math.PI/3,W=4.4,HALF=W/2;
const curve=ph=>({p:[R*Math.sin(ph),R*(1-Math.cos(ph)),0],T:[Math.cos(ph),Math.sin(ph),0],N:[-Math.sin(ph),Math.cos(ph),0]});
eng.addObject({m:eng.addMesh(sweep(56,4,(s,w)=>{const c=curve(s*PHI);return {p:[c.p[0],c.p[1],(w-.5)*W],n:c.N};})),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.34,.34,.35],m:0,r:.6,wet:.4}});
/* red LED edge strips along both kerbs */
for(const z of [-HALF,HALF]){const pts=[];for(let k=0;k<=40;k++){const c=curve(k/40*PHI);pts.push([c.p[0]+c.N[0]*.06,c.p[1]+c.N[1]*.06,z]);}
 eng.addRibbon({points:pts,width:.09,color:[1,.12,.06],intensity:2.2,taper:false});}
/* steel frame under the outer side of the ramp */
const steel=[],A=(k,z)=>{const c=curve(k/6*PHI);return [c.p[0]-c.N[0]*.6,c.p[1]-c.N[1]*.6,z];};
for(let k=0;k<=6;k++){for(const z of [-HALF*.9,HALF*.9]){const a=A(k,z);if(a[1]>.3)steel.push(tube([a[0],0,z],a,.12));}
 if(k>=2)steel.push(tube(A(k,-HALF*.9),A(k,HALF*.9),.1));
 if(k<6)for(const z of [-HALF*.9,HALF*.9])steel.push(tube(A(k,z),A(k+1,z),.08));}
eng.addObject({m:eng.addMesh(mergeG(steel)),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.12,.12,.13],m:.8,r:.4}});

/* ---------- the car: an original low coupe, forward +X, up +Y, built once and moved by a model matrix each frame ---------- */
const carParts={paint:[],glass:[],rubber:[],light:[],red:[]};
carParts.paint.push(place(genRoundedBox(4.2,.62,1.9,.22,4),{mid:[0,.66,0]}));
carParts.paint.push(place(genBox(.5,.05,1.7),{mid:[-1.95,1.06,0]}));
carParts.glass.push(place(genRoundedBox(2.2,.5,1.6,.24,4),{mid:[-.25,1.2,0]}));
const tyre=lathe([[0,-.13],[.34,-.13],[.34,.13],[0,.13]],20);
for(const x of [1.35,-1.35])for(const z of [.98,-.98])carParts.rubber.push(place(tyre,{rx:Math.PI/2,mid:[x,.34,z]}));
carParts.light.push(place(genBox(.06,.14,1.5),{mid:[2.11,.66,0]}));
carParts.red.push(place(genBox(.06,.12,1.5),{mid:[-2.11,.74,0]}));
const carM=new Float32Array(16),carObjs=[];
const addCar=(list,mat)=>{const o={m:eng.addMesh(mergeG(list)),p:[0,0,0],s:1,rot:[0,0,0],matrix:carM,mat};eng.addObject(o);carObjs.push(o);};
addCar(carParts.paint,{a:[.86,.88,.92],m:.15,r:.22,clearcoat:.7,clearcoatRough:.05});
addCar(carParts.glass,{a:[.02,.03,.04],m:0,r:.08,clearcoat:1,clearcoatRough:.02});
addCar(carParts.rubber,{a:[.02,.02,.025],m:0,r:.7});
addCar(carParts.light,{a:[0,0,0],m:0,r:1,emissive:[7,7,6]});
addCar(carParts.red,{a:[0,0,0],m:0,r:1,emissive:[4,.15,.08]});
const headL=eng.addLight({type:'spot',pos:[0,1,0],dir:[1,0,0],color:[1,.96,.88],intensity:300,range:80,angle:.5,inner:.35});
const smoke=eng.addEmitter({kind:'smoke',pos:[0,-50,0],count:620,spread:[1.6,.5,2.4],vel:[0,.5,0],life:6,size:2.1,growth:2.2,turbulence:.4,alpha:.5,color:[.8,.8,.82],on:false});
const thruster=eng.addRibbon({points:[[0,-50,0],[0,-50,0]],width:.14,color:[.4,.9,1],intensity:2.6,taper:true});

/* ---------- the motion: drive up the ramp (2.0-4.3 s), flight with one flip (to landing), a circular drift, then a stop ---------- */
const tD0=2.0,tD1=4.3,VL=R*1.5*PHI/(tD1-tD0);             /* launch speed from the ramp's end slope */
const L0=curve(PHI),VX=VL*L0.T[0],VY=VL*L0.T[1],Y0=L0.p[1];
const TF=(VY+Math.sqrt(VY*VY+2*G*Y0))/G,TLAND=tD1+TF,XL=L0.p[0]+VX*TF;   /* flight time to the ground */
const TSTOP=16.5,RC=9,WD=.85,DRIFT=.28;
const pose=(pos,F,U,flying,drifting)=>({pos,F,U,flying,drifting});
function flight(tau){const a=5*Math.PI/3*tau/TF,ca=Math.cos(a),sa=Math.sin(a);
 return pose([L0.p[0]+VX*tau,Y0+VY*tau-G/2*tau*tau,0],
  [ca*L0.T[0]+sa*L0.N[0],ca*L0.T[1]+sa*L0.N[1],0],[-sa*L0.T[0]+ca*L0.N[0],-sa*L0.T[1]+ca*L0.N[1],0],true,false);}
function carPose(T){
 if(T<tD0)return pose([0,0,0],[1,0,0],[0,1,0],false,false);
 if(T<tD1){const c=curve(PHI*Math.pow((T-tD0)/(tD1-tD0),1.5));return pose(c.p,c.T,c.N,false,false);}
 if(T<TLAND)return flight(T-tD1);
 const th=WD*Math.min(Math.max(T-TLAND,0),TSTOP-TLAND),C=[XL,0,-RC];
 const p=[C[0]+RC*Math.sin(th),0,C[2]+RC*Math.cos(th)],tan=[Math.cos(th),0,-Math.sin(th)];
 const inw=v3.norm([C[0]-p[0],0,C[2]-p[2]]);
 const F=v3.norm(v3.add(v3.mul(tan,Math.cos(DRIFT)),v3.mul(inw,Math.sin(DRIFT))));
 return pose(p,F,[0,1,0],false,T>=TLAND&&T<TSTOP);}
function setCar(c){const R3=v3.cross(c.F,c.U);
 carM.set([c.F[0],c.F[1],c.F[2],0,c.U[0],c.U[1],c.U[2],0,R3[0],R3[1],R3[2],0,c.pos[0],c.pos[1],c.pos[2],1]);
 for(const o of carObjs)o.p=c.pos.slice();}

/* ---------- camera shots: each returns the base pose for film time T; the viewer's orbit is layered on top ---------- */
function shot(T){
 if(T<2.2){const s=T/2.2;return {pos:lerp3([-38,3,30],[-34,2.6,26],s),tgt:[8,8,0],fov:38,focus:[4,6,0]};}
 if(T<8.5){const c=carPose(T).pos;return {pos:v3.add(c,[-6,2.6,14]),tgt:v3.add(c,[2,2,0]),fov:42,focus:c};}
 if(T<14){const c=carPose(T).pos;return {pos:[36,2.4,14],tgt:v3.add(c,[0,1,0]),fov:44,focus:c};}
 if(T<22){const s=(T-14)/8;return {pos:lerp3([30,46,40],[26,58,30],s),tgt:[30,0,-2],fov:50,focus:[30,0,-2]};}
 if(T<29){const s=(T-22)/7;return {pos:lerp3([-10,1.2,22],[-8,1.6,20],s),tgt:[10,9,0],fov:46,focus:[10,9,0]};}
 if(T<37){const e=carPose(TSTOP).pos,a=(T-29)*.5;return {pos:[e[0]+8*Math.cos(a),2.2,e[2]+8*Math.sin(a)],tgt:v3.add(e,[0,.8,0]),fov:40,focus:e};}
 const s=Math.min((T-37)/9,1);return {pos:lerp3([44,12,46],[70,22,80],s),tgt:[22,8,0],fov:46,focus:[22,8,0]};}

/* ---------- HUD and the viewer's orbit (drag, pinch, wheel; double-tap or Film returns) ---------- */
function makeOrbit(canvas,o){
 const st={yaw:0,pitch:0,zoom:1,pan:[0,0,0],cur:{yaw:0,pitch:0,zoom:1,pan:[0,0,0]},mode:'film',ft:0,touched:false};
 const ptr=new Map();let pinch0=0,zoom0=1,mid0=null,lastTap=0;
 const minZ=o.minZoom||.35,maxZ=o.maxZoom||3,floorY=o.floorY===undefined?.02:o.floorY;
 const setMode=m=>{st.mode=m;st.touched=m==='free';if(o.onMode)o.onMode(m);};
 const film=()=>{if(st.mode!=='film'){st.ft=0;setMode('film');}};
 const touch=()=>{if(st.mode!=='free')setMode('free');};
 let basis=null;
 function panBy(dx,dy,dist){if(!basis)return;const k=dist*.0016;for(let i=0;i<3;i++)st.pan[i]+=(-basis.r[i]*dx+basis.u[i]*dy)*k;}
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,b:e.button,sh:e.shiftKey});
  if(ptr.size===2){const [a,b]=[...ptr.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);zoom0=st.zoom;mid0=[(a.x+b.x)/2,(a.y+b.y)/2];}
  const now=performance.now();if(ptr.size===1&&now-lastTap<300)film();lastTap=now;});
 canvas.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(ptr.size===1){if(Math.abs(dx)+Math.abs(dy)<.5)return;touch();
   if(p.b===2||p.sh)panBy(dx,dy,st.dist||1);else{st.yaw-=dx*.006;st.pitch=clamp(st.pitch+dy*.005,-1.2,1.2);}}
  else if(ptr.size===2){touch();const [a,b]=[...ptr.values()],d=Math.max(Math.hypot(a.x-b.x,a.y-b.y),1),m=[(a.x+b.x)/2,(a.y+b.y)/2];
   st.zoom=clamp(zoom0*pinch0/d,minZ,maxZ);panBy(m[0]-mid0[0],m[1]-mid0[1],st.dist||1);mid0=m;}});
 const up=e=>ptr.delete(e.pointerId);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 canvas.addEventListener('wheel',e=>{e.preventDefault();touch();st.zoom=clamp(st.zoom*(1+e.deltaY*.0012),minZ,maxZ);},{passive:false});
 st.apply=(cam,dt)=>{
  const c=st.cur,k=1-Math.exp(-dt*(st.mode==='film'?2.5:10));
  c.yaw+=(st.yaw-c.yaw)*k;c.pitch+=(st.pitch-c.pitch)*k;c.zoom+=(st.zoom-c.zoom)*k;for(let i=0;i<3;i++)c.pan[i]+=(st.pan[i]-c.pan[i])*k;
  const tg=v3.add(cam.target,c.pan),v=v3.sub(cam.pos,cam.target),r=v3.len(v)*c.zoom;
  const az=Math.atan2(v[2],v[0])+c.yaw,el=clamp(Math.asin(clamp(v[1]/Math.max(v3.len(v),1e-6),-1,1))+c.pitch,-.2,1.45);
  let p=[tg[0]+r*Math.cos(el)*Math.cos(az),tg[1]+r*Math.sin(el),tg[2]+r*Math.cos(el)*Math.sin(az)];
  p[1]=Math.max(p[1],floorY);cam.pos=p;cam.target=tg;st.dist=r;
  const f=v3.norm(v3.sub(tg,p)),rr=v3.norm(v3.cross(f,[0,1,0])),uu=v3.cross(rr,f);basis={r:rr,u:uu};};
 st.film=film;st.free=()=>setMode('free');return st;}
let T=+(Q.get('t')||0),paused=false;
const orbit=makeOrbit($('c'),{minZoom:.3,maxZoom:2.5,floorY:.25,onMode:m=>{$('bMode').textContent=m==='film'?'Film':'Free';}});
$('top').textContent='Night Loop  ·  Apex engine cinematic demo';
$('bMode').textContent='Film';$('bMode').onclick=()=>{if(orbit.mode==='film')orbit.free();else orbit.film();};
$('bTime').textContent='Pause';$('bTime').onclick=()=>{paused=!paused;$('bTime').textContent=paused?'Play':'Pause';};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').textContent='Auto';$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').style.display='none';

/* ---------- per-frame: pose the car, lights, smoke, thruster trail and the shot ---------- */
eng.start(dt=>{
 if(!paused)T+=dt;
 const t=T%DUR,c=carPose(t);setCar(c);
 const hf=v3.norm(v3.add(c.F,[0,-.08,0]));
 headL.pos=v3.add(c.pos,v3.add(v3.mul(c.F,2.3),[0,.75,0]));headL.dir=hf;
 smoke.on=c.drifting;
 if(c.drifting)smoke.pos=v3.add(c.pos,v3.add(v3.mul(c.F,-1.3),[0,.2,0]));
 const pts=[];for(let j=0;j<12;j++){const tau=Math.max(0,t-tD1-j*.06);
  if(t>=tD1&&t<TLAND){const fp=flight(Math.min(tau,TF));pts.push(v3.add(fp.pos,v3.add(v3.mul(fp.F,-2.1),[0,.45,0])));}}
 thruster.update(pts.length>1?pts:[[0,-50,0],[0,-50,0]]);
 const sh=shot(t);
 cam.pos=sh.pos.slice();cam.target=sh.tgt.slice();cam.fov=sh.fov*DEG;cam.focusTarget=sh.focus.slice();
 orbit.apply(cam,dt);
});
if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'));$('bQ').textContent=QN[qi];}
eng.frozen=Q.has('freeze');window.__eng=eng;
})();
