/* Ember Orbs - macro still life: a glass orb of bubbles over glowing ember crystals on a black puck, a second orb and a
   glowing bell jar out of focus behind, smoke drifting in the dark. Built on the Apex engine (v7).
   Query: ?q=0|1|2 &freeze=1 &dof=0 &t= */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),onError:fail,onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},900);}});
if(!eng)return;
const cam=eng.camera;
let seed=97;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

/* ---------- studio darkness: a black room with one soft window high behind the camera (the orb's top highlight) ---------- */
{const w=128,h=64,d=new Float32Array(w*h*3);
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const u=i/w,v=j/h,o=(j*w+i)*3,lon=(u-.5)*TAU,th=v*Math.PI,dir=[Math.sin(th)*Math.cos(lon),Math.cos(th),Math.sin(th)*Math.sin(lon)];
  let r=.006,g=.005,b=.006;
  const win=sstep(.05,.0,Math.abs(dir[0]-.02)-.5)*sstep(.02,0,Math.abs(dir[1]-.94)-.022)*(dir[2]<0?1:0);   /* long softbox strip overhead, behind the orb: the top highlight arc */   /* soft window up and behind the camera */
  r+=30*win;g+=29*win;b+=27*win;
  const low=sstep(-.05,-.35,dir[1]);r+=.04*low;g+=.015*low;b+=.008*low;                                  /* warm bounce from the lit floor */
  d[o]=r;d[o+1]=g;d[o+2]=b;}
 eng.setEnvMap({data:d,w,h,intensity:1});}
eng.setTerrain(buildGrid(()=>-30),{mode:'meadow',skirt:false,water:false});
eng.setTimeOfDay(-18,250,0);eng.setSky({stars:0,moon:false,aurora:0});
eng.setFog({density:0,volumetric:0});

/* ---------- geometry helpers ---------- */
function merge(g,list){            /* bake many copies of g: list of {p,s:[sx,sy,sz],ry} -> one mesh (one draw call) */
 const nv=g.vb.length/8,vb=new Float32Array(nv*8*list.length),ib=new Uint32Array(g.ib.length*list.length);
 list.forEach((t,k)=>{const c=Math.cos(t.ry||0),s=Math.sin(t.ry||0);
  for(let i=0;i<nv;i++){const o=i*8,O=(k*nv+i)*8;let x=g.vb[o]*t.s[0],y=g.vb[o+1]*t.s[1],z=g.vb[o+2]*t.s[2];
   let nx=g.vb[o+3]/t.s[0],ny=g.vb[o+4]/t.s[1],nz=g.vb[o+5]/t.s[2];const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
   vb[O]=c*x+s*z+t.p[0];vb[O+1]=y+t.p[1];vb[O+2]=-s*x+c*z+t.p[2];vb[O+3]=c*nx+s*nz;vb[O+4]=ny;vb[O+5]=-s*nx+c*nz;vb[O+6]=g.vb[o+6];vb[O+7]=g.vb[o+7];}
  for(let i=0;i<g.ib.length;i++)ib[k*g.ib.length+i]=g.ib[i]+k*nv;});
 return {vb,ib};}
function lathe(prof,n){const vb=[],ib=[];for(let i=0;i<prof.length;i++){const [r,y]=prof[i];for(let j=0;j<=n;j++){const a=j/n*TAU;vb.push(Math.cos(a)*r,y,Math.sin(a)*r,0,0,0,j/n,i/(prof.length-1));}}
 for(let i=0;i<prof.length-1;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;ib.push(a,a+1,b,a+1,b+1,b);}return weldNormals({vb:new Float32Array(vb),ib:new Uint16Array(ib)});}
function shard(){const g=genSphere(1,5,3),vb=g.vb;            /* faceted crystal chunk */
 const k=[.6+rnd()*.8,.6+rnd()*1.2,.6+rnd()*.8];for(let i=0;i<vb.length;i+=8){const j=.75+.5*rnd();vb[i]*=k[0]*j;vb[i+1]*=k[1]*j;vb[i+2]*=k[2]*j;}
 const n=g.ib.length/3,v2=new Float32Array(n*24),i2=new Uint16Array(n*3);   /* flat shading: unweld every face */
 for(let t=0;t<n;t++){const ids=[g.ib[t*3],g.ib[t*3+1],g.ib[t*3+2]],P=ids.map(i=>[vb[i*8],vb[i*8+1],vb[i*8+2]]),nn=v3.norm(v3.cross(v3.sub(P[1],P[0]),v3.sub(P[2],P[0])));
  for(let q=0;q<3;q++){v2.set([...P[q],...nn,0,0],(t*3+q)*8);i2[t*3+q]=t*3+q;}}
 return {vb:v2,ib:i2};}
function tube(pts,r,seg){const vb=[],ib=[];const n=pts.length;
 for(let i=0;i<n;i++){const a=pts[Math.max(i-1,0)],b=pts[Math.min(i+1,n-1)],t=v3.norm(v3.sub(b,a)),s=v3.norm(v3.cross(t,[0,1,0])),u=v3.cross(s,t);
  for(let j=0;j<=seg;j++){const an=j/seg*TAU,nn=v3.add(v3.mul(s,Math.cos(an)),v3.mul(u,Math.sin(an)));const p=v3.add(pts[i],v3.mul(nn,r));vb.push(...p,...nn,i/n,j/seg);}}
 for(let i=0;i<n-1;i++)for(let j=0;j<seg;j++){const a=i*(seg+1)+j,b=a+seg+1;ib.push(a,b,a+1,a+1,b,b+1);}return {vb:new Float32Array(vb),ib:new Uint16Array(ib)};}
const add=(g,p,mat,o)=>eng.addObject(Object.assign({m:eng.addMesh(g),p,s:1,rot:[0,0,0],mat},o||{}));

/* ---------- ground: rusty concrete ---------- */
const conc=eng.createMaps(genMaterialMaps('asphalt',256,21));
add(genPlaneGrid(8,8),[0,0,-1],{a:[.24,.12,.07],m:1,r:1,maps:conc,uvScale:160,stochastic:true});
/* dark back wall and a shelf on the left */
add(genBox(10,4,.1),[0,2,-3.2],{a:[.02,.018,.016],m:0,r:.8},{castShadow:false});
add(genBox(1.9,.06,.5),[-1.15,.48,-1.75],{a:[.07,.04,.025],m:0,r:.6});
add(genBox(1.9,.48,.04),[-1.15,.24,-1.52],{a:[.03,.02,.015],m:0,r:.7});

/* ---------- hero orb ---------- */
const R=.12,C=[0,.137,0];
add(lathe([[0,.006],[.148,.006],[.156,.012],[.156,.026],[.15,.031],[.104,.031],[.1,.028],[0,.028]],64),[0,0,0],{a:[.025,.02,.018],m:0,r:.42,clearcoat:.5,clearcoatRough:.2});
add(tube([[-.15,.012,.02],[-.26,.01,.07],[-.4,.012,.04],[-.55,.01,.1],[-.75,.012,.08],[-1.0,.01,.14]],.007,10),[0,0,0],{a:[.02,.02,.02],m:0,r:.25,clearcoat:.8});
add(tube([[-.14,.012,.05],[-.3,.011,.15],[-.5,.01,.18],[-.8,.011,.26]],.005,8),[0,0,0],{a:[.025,.022,.02],m:0,r:.3,clearcoat:.8});
/* molten bed: a red-hot spherical cap filling the bottom of the orb */
{const cap=lathe([[0,-.96],[.25,-.93],[.5,-.83],[.68,-.7],[.8,-.58],[.86,-.5],[.0,-.5]],48);
 add(cap,C,{a:[.5,.08,.03],m:0,r:.4,emissive:[2.6,.42,.08]},{s:R*.97});}
/* ember crystals heaped on the bed: hot orange chunks + pale rose quartz */
const hot=[],pale=[];
for(let i=0;i<140;i++){const a=rnd()*TAU,rr=Math.sqrt(rnd())*R*.82,y=-R*.55+R*.18*rnd()+R*.12*(1-rr/(R*.82)),sz=R*(.035+.07*rnd());
 if(Math.hypot(rr,y)>R*.9)continue;(rnd()<.8?hot:pale).push({p:[C[0]+Math.cos(a)*rr,C[1]+y,C[2]+Math.sin(a)*rr],s:[sz,sz,sz],ry:rnd()*TAU});}
const sh=shard();
add(merge(sh,hot),[0,0,0],{a:[1,.4,.12],m:0,r:.25,emissive:[3.4,.75,.12],transmission:.5,thickness:.3});
add(merge(sh,pale),[0,0,0],{a:[1,.6,.45],m:0,r:.2,emissive:[1.6,.5,.22],clearcoat:.6});
/* bubbles: a few big ones in the middle, a cloud of small ones, all above the embers */
const bub=[];
for(let i=0;i<260&&bub.length<95;i++){const big=bub.length<7,r=big?R*(.12+.14*rnd()):R*(.018+.06*Math.pow(rnd(),2));
 const a=rnd()*TAU,rr=Math.sqrt(rnd())*R*(big?.45:.85),y=-R*.25+rnd()*R*.85;const p=[C[0]+Math.cos(a)*rr,C[1]+y,C[2]+Math.sin(a)*rr*.9];
 if(Math.hypot(p[0]-C[0],p[1]-C[1],p[2]-C[2])+r>R*.95)continue;if(bub.some(b=>Math.hypot(b.p[0]-p[0],b.p[1]-p[1],b.p[2]-p[2])<b.s[0]+r))continue;bub.push({p,s:[r,r,r]});}
add(merge(genSphere(1,20,14),bub),[0,0,0],{a:[.05,.035,.025],m:0,r:.03,clearcoat:1,clearcoatRough:.02,iridescence:.3,iridThickness:520,
 rim:{color:[5,2.1,.6],power:1.6,strength:2.2},emissive:[.12,.05,.012]});
/* sparkling dust caught in the glass */
eng.addEmitter({kind:'sparks',pos:C.slice(),count:120,vel:[0,.004,0],life:6,spread:[R*.75,R*.6,R*.75],size:.0012,gravity:0,turbulence:.01,color:[1,.75,.45],alpha:1,stretch:0});
/* the glass shell itself: refracts everything above, Fresnel reflection of the window on top */
add(genSphere(R,96,64),C,{a:[1,1,1],m:0,r:.02,transparent:'glass',tint:[.97,.93,.88],ior:1.5,dispersion:.012,thickness:.035,writeDepth:true},{castShadow:false});
const Lhot=eng.addLight({type:'point',pos:[C[0],C[1]-R*.45,C[2]],color:[1,.42,.12],intensity:4,range:1.1});

/* ---------- second orb behind left: amber glass with yellow and blue lights inside ---------- */
const C2=[-.36,.23,-.85],R2=.21;
add(lathe([[0,0],[.2,0],[.2,.03],[0,.03]],40),[C2[0],0,C2[2]],{a:[.03,.025,.02],m:0,r:.5});
{const lights=[];for(let i=0;i<34;i++){const a=rnd()*TAU,rr=Math.sqrt(rnd())*R2*.7,y=(rnd()-.4)*R2*1.1;lights.push({p:[C2[0]+Math.cos(a)*rr,C2[1]+y,C2[2]+Math.sin(a)*rr],s:[.008+.01*rnd(),.008+.01*rnd(),.008+.01*rnd()]});}
 add(merge(genSphere(1,10,8),lights.slice(0,26)),[0,0,0],{a:[1,.8,.2],m:0,r:.4,emissive:[6,4,.6]});
 add(merge(genSphere(1,10,8),lights.slice(26)),[0,0,0],{a:[.3,.4,1],m:0,r:.4,emissive:[.8,1.4,5]});
 add(merge(genSphere(1,6,4),Array.from({length:40},()=>({p:[C2[0]+(rnd()-.5)*R2,C2[1]-R2*.55+rnd()*.06,C2[2]+(rnd()-.5)*R2],s:[.02,.02,.02],ry:rnd()*6}))),[0,0,0],{a:[.25,.3,.05],m:0,r:.6});}
add(genSphere(R2,72,48),C2,{a:[1,1,1],m:0,r:.03,transparent:'glass',tint:[.9,.85,.45],ior:1.5,dispersion:.01,thickness:.06,writeDepth:true},{castShadow:false});
eng.addLight({type:'point',pos:C2.slice(),color:[1,.8,.35],intensity:1.4,range:1.1});

/* ---------- bell jar on the right: glowing amber dome over embers ---------- */
const C3=[.48,0,-.62];
add(lathe([[0,0],[.19,0],[.2,.01],[.2,.03],[0,.03]],48),C3,{a:[.02,.02,.02],m:0,r:.35,clearcoat:.6});
{const em=[];for(let i=0;i<50;i++){const a=rnd()*TAU,rr=Math.sqrt(rnd())*.13,sz=.012+.02*rnd();em.push({p:[C3[0]+Math.cos(a)*rr,.03+sz*.6+rnd()*.03,C3[2]+Math.sin(a)*rr],s:[sz,sz,sz],ry:rnd()*TAU});}
 add(merge(sh,em),[0,0,0],{a:[1,.5,.3],m:0,r:.3,emissive:[4,1.3,.3]});}
const dome=lathe([[.15,.03],[.15,.2],[.145,.26],[.13,.31],[.105,.35],[.07,.375],[0,.385]],64);
add(dome,C3,{a:[1,.55,.2],m:0,r:.3,emissive:[.85,.22,.03]},{s:.985});                   /* inner glow skin: the lit amber glass */
add(dome,C3,{a:[1,1,1],m:0,r:.03,transparent:'glass',tint:[1,.6,.3],ior:1.5,dispersion:.01,thickness:.3,writeDepth:true},{castShadow:false});
eng.addLight({type:'point',pos:[C3[0],.12,C3[2]],color:[1,.45,.12],intensity:3,range:1.6});
/* a dark glass vessel looming behind the bell jar */
add(lathe([[0,0],[.25,0],[.27,.4],[.26,.7],[.2,.85],[.12,.92],[.13,1.0],[0,1.0]],48),[.95,0,-1.25],{a:[.03,.015,.01],m:0,r:.08,clearcoat:1});

/* ---------- smoke drifting on the left ---------- */
eng.addEmitter({kind:'smoke',pos:[-.75,.5,-1.6],count:110,vel:[.04,.015,0],life:18,spread:[.75,.16,.25],size:.3,gravity:0,turbulence:.12,growth:1.5,color:[.8,.9,1],alpha:.65,soft:.9});
eng.addLight({type:'spot',pos:[-1.3,1.4,-1.0],dir:v3.norm([.3,-.9,-.6]),angle:.7,inner:.4,color:[.6,.75,.9],intensity:40,range:3});
eng.addLight({type:'spot',pos:[.3,1.2,1.1],dir:v3.norm([-.3,-1.1,-1.1]),angle:.9,inner:.3,color:[1,.62,.38],intensity:.6,range:3.5});   /* dim warm spill on the floor */

/* ---------- lens: 50 mm-ish macro, f/1.4, focus on the hero orb ---------- */
eng.setPost({tone:'agx',look:[1.15,1.2],saturation:1.12,curve:.22,bloom:.05,threshold:1.6,knee:.5,grain:.035,chromatic:.012,vignette:.55,flare:0,dirt:.04,
 dofMaxCoC:Q.get('dof')==='0'?0:9,lut:'warm',lutStrength:.25,contactShadows:.9,exposure:+(Q.get('exp')||.008)});
cam.fstop=3.5;cam.bokehScale=Q.get('dof')==='0'?0:2.6;cam.breathing=.3;cam.shutterAngle=180;
cam.lens={k1:-.02,k2:0,ca:.008,blades:9,bladeRotation:.25,bubble:.55,streaks:0,astig:.35};
/* ---------- free camera: orbit / zoom / pan layered on top of the scripted shot ----------
   drag = orbit, pinch or wheel = zoom, two-finger drag or right/shift-drag = pan, double-tap = back to the cinematic shot */
function makeOrbit(canvas,o){
 /* modes: 'film' = automatic cinematic moves (o.film.keys: [t, yaw, pitch, zoom, [panX,panY,panZ]] looping over o.film.dur s),
    'free' = user control (drag orbit, pinch/wheel zoom, two-finger or right/shift-drag pan, double-tap = back to film) */
 const st={yaw:0,pitch:0,zoom:1,pan:[0,0,0],cur:{yaw:0,pitch:0,zoom:1,pan:[0,0,0]},mode:'film',ft:0,touched:false};
 const ptr=new Map();let pinch0=0,zoom0=1,mid0=null,lastTap=0;
 const minZ=o.minZoom||.35,maxZ=o.maxZoom||3,floorY=o.floorY===undefined?.02:o.floorY,F=o.film;
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
 /* looping Catmull-Rom through the film keys, eased per segment: no cuts, no stops */
 function filmAt(t){const K=F.keys,n=K.length,T=((t%F.dur)+F.dur)%F.dur;let i=0;while(i<n-1&&T>=K[i+1][0])i++;
  const k1=K[i],k2=K[(i+1)%n],t2=i+1<n?k2[0]:F.dur,u0=(T-k1[0])/Math.max(t2-k1[0],1e-3),u=u0*u0*(3-2*u0);
  const k0=K[(i-1+n)%n],k3=K[(i+2)%n],c=(a,b,cc,d)=>.5*(2*b+(-a+cc)*u+(2*a-5*b+4*cc-d)*u*u+(-a+3*b-3*cc+d)*u*u*u);
  return {yaw:c(k0[1],k1[1],k2[1],k3[1]),pitch:c(k0[2],k1[2],k2[2],k3[2]),zoom:c(k0[3],k1[3],k2[3],k3[3]),
   pan:[0,1,2].map(j=>c((k0[4]||[0,0,0])[j],(k1[4]||[0,0,0])[j],(k2[4]||[0,0,0])[j],(k3[4]||[0,0,0])[j])),focus:k1[5]};}
 st.apply=(cam,dt)=>{
  if(st.mode==='film'&&F){st.ft+=dt;const f=filmAt(st.ft);st.yaw=f.yaw;st.pitch=f.pitch;st.zoom=f.zoom;st.pan=f.pan;st.filmFocus=f.focus;}else st.filmFocus=null;
  if(st.snap){st.snap=false;Object.assign(st.cur,{yaw:st.yaw,pitch:st.pitch,zoom:st.zoom,pan:st.pan.slice()});}
  const c=st.cur,k=1-Math.exp(-dt*(st.mode==='film'?2.5:10));
  c.yaw+=(st.yaw-c.yaw)*k;c.pitch+=(st.pitch-c.pitch)*k;c.zoom+=(st.zoom-c.zoom)*k;for(let i=0;i<3;i++)c.pan[i]+=(st.pan[i]-c.pan[i])*k;
  const tg=v3.add(cam.target,c.pan),v=v3.sub(cam.pos,cam.target),r=v3.len(v)*c.zoom;
  let az=Math.atan2(v[2],v[0])+c.yaw,el=clamp(Math.asin(clamp(v[1]/Math.max(v3.len(v),1e-6),-1,1))+c.pitch,-.2,1.45);
  let p=[tg[0]+r*Math.cos(el)*Math.cos(az),tg[1]+r*Math.sin(el),tg[2]+r*Math.cos(el)*Math.sin(az)];
  p[1]=Math.max(p[1],floorY);if(o.bounds)p=o.bounds(p);cam.pos=p;cam.target=tg;st.dist=r;
  const f=v3.norm(v3.sub(tg,p)),rr=v3.norm(v3.cross(f,[0,1,0])),uu=v3.cross(rr,f);basis={r:rr,u:uu};};
 st.film=film;st.free=()=>setMode('free');return st;}

let T=+(Q.get('t')||0),drift=true;
const orbit=makeOrbit($('c'),{minZoom:.3,maxZoom:3.2,floorY:.03,onMode:m=>{drift=m==='film';$('bMode').textContent=m==='film'?'Film':'Free';},
 film:{dur:64,keys:[[0,0,0,1],[9,.55,.08,.72],[19,.95,.55,1.05],[29,.25,-.12,.42,[0,-.01,0]],[38,-.3,-.12,.9,[-.17,.16,-.4],'back'],[47,-.55,-.06,1.1,[-.2,.17,-.46],'back'],[56,-.3,.1,.8]]}});
function frameCam(dt){if(drift)T+=dt;const wide=window.innerWidth>window.innerHeight,k=Math.sin(T*.11),k2=Math.sin(T*.07+1);
 cam.fov=(wide?17.5:28)*DEG;const d=wide?1.42:1.6;
 cam.pos=[.07+.04*k,.37+.01*k2,d];cam.target=[.045+.015*k,.1,0];cam.focusTarget=[C[0],C[1],C[2]+R*.7];
 Lhot.intensity=4*(1+.06*Math.sin(T*3.1)+.04*Math.sin(T*7.7));}   /* embers breathe */


/* ---------- HUD ---------- */
$('top').textContent='Film: automatic camera   Drag: orbit   Pinch/scroll: zoom   Double-tap: Film';$('bMode').textContent='Film';
$('bMode').onclick=()=>{if(orbit.mode==='film')orbit.free();else orbit.film();};
const _fc=frameCam;
$('bTime').textContent='Pause';let paused=false;$('bTime').onclick=()=>{paused=!paused;eng.pause(paused);$('bTime').textContent=paused?'Play':'Pause';};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').onclick=()=>{$('bSnd').textContent=eng.audio.toggle()?'Sound on':'Sound off';};
eng.start(dt=>{_fc(dt);orbit.apply(cam,dt);if(orbit.filmFocus==='back')cam.focusTarget=C2;});
if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
if(Q.has('ft')){orbit.ft=+Q.get('ft');orbit.snap=true;}
eng.frozen=Q.has('freeze');window.__eng=eng;
})();
