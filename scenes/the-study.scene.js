/* The Study - a seated figure at a desk before a wall where a river of stars is projected.
   Figure: MakeHuman 1.1 base mesh + default rig/weights (CC0 1.0, makehumancommunity/makehuman), posed offline by
   linear-blend skinning into a seated typing pose. Built on the Apex engine. Query: ?t= &q=0|1|2 &freeze=1 &exp= */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),onError:fail,onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},900);}});
if(!eng)return;
const cam=eng.camera;

/* ---------- interior lighting: dark ambient, one high key light from beyond the wall (no sky visible) ---------- */
{const w=32,h=16,d=new Float32Array(w*h*3);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const up=1-j/h,o=(j*w+i)*3;d[o]=.010+.01*up;d[o+1]=.016+.014*up;d[o+2]=.016+.014*up;}
 eng.setEnvMap({data:d,w,h,intensity:1});}
eng.setTerrain(buildGrid(()=>-30),{mode:'meadow',skirt:false,water:false});
eng.setFog({density:.0,falloff:.1,volumetric:0});
eng.setTimeOfDay(38,-92,0);

/* ---------- room ---------- */
const box=(w,h,d,r)=>eng.addMesh(r?genRoundedBox(w,h,d,r,3):genBox(w,h,d));
eng.addObject({m:box(16,14,.2),p:[0,7,-.1],s:1,rot:[0,0,0],castShadow:false,mat:{a:[1,1,1],m:0,r:.9,mode:'projwall',modelA:1}});
eng.addObject({m:eng.addMesh(genPlaneGrid(16,8)),p:[0,0,6],s:1,rot:[0,0,0],castShadow:false,mat:{a:[1,1,1],m:0,r:.5,mode:'floorpool'}});
const dark={a:[.025,.02,.018],m:0,r:.6};
/* the rest of the room, so the free camera never sees past the set */
const plaster={a:[.32,.3,.27],m:0,r:.9};
eng.addObject({m:box(.2,14,16),p:[-6,7,7],s:1,rot:[0,0,0],castShadow:false,mat:plaster});
eng.addObject({m:box(.2,14,16),p:[6,7,7],s:1,rot:[0,0,0],castShadow:false,mat:plaster});
eng.addObject({m:box(12.4,14,.2),p:[0,7,14],s:1,rot:[0,0,0],castShadow:false,mat:plaster});
eng.addObject({m:box(12.4,.2,16),p:[0,10,7],s:1,rot:[0,0,0],castShadow:false,mat:plaster});
eng.addObject({m:box(.42,.3,.03),p:[2.25,1.62,.02],s:1,rot:[0,0,0],mat:{a:[.02,.02,.02],m:0,r:.4}});            /* picture frame */
eng.addObject({m:box(.32,.22,.02),p:[2.25,1.62,.035],s:1,rot:[0,0,0],mat:{a:[.16,.15,.13],m:0,r:.8}});
eng.addObject({m:box(.08,.12,.02),p:[-2.15,1.58,.01],s:1,rot:[0,0,0],mat:{a:[.2,.2,.19],m:0,r:.5}});            /* light switch */

/* ---------- desk: dark wood top with a warm edge, two pedestals with glass side panels ---------- */
const wood={a:[.11,.045,.02],m:0,r:.35,clearcoat:.6,clearcoatRough:.15};
eng.addObject({m:box(2.15,.05,.78,.01),p:[0,.77,1.57],s:1,rot:[0,0,0],mat:wood});
for(const x of [-.82,.82]){eng.addObject({m:box(.5,.74,.72,.008),p:[x,.37,1.57],s:1,rot:[0,0,0],mat:wood});
 eng.addObject({m:box(.02,.6,.6),p:[x+(x<0?.26:-.26),.36,1.57],s:1,rot:[0,0,0],castShadow:false,mat:{a:[.4,.45,.45],m:0,r:.05,transparent:'pane',extents:[.01,.3,.3],glow:[.6,.7,.7],intensity:.6,alpha:.03,order:1}});}
eng.addObject({m:box(1.1,.45,.03),p:[0,.5,1.22],s:1,rot:[0,0,0],mat:wood});
/* lamp, books, laptop, mug */
const lathe=(prof,n)=>{const vb=[],ib=[];for(let i=0;i<prof.length;i++){const [r,y]=prof[i];for(let j=0;j<=n;j++){const a=j/n*TAU;vb.push(Math.cos(a)*r,y,Math.sin(a)*r,0,0,0,j/n,i/(prof.length-1));}}
 for(let i=0;i<prof.length-1;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;ib.push(a,a+1,b,a+1,b+1,b);}return weldNormals({vb:new Float32Array(vb),ib:new Uint16Array(ib)});};
eng.addObject({m:eng.addMesh(lathe([[0,0],[.09,0],[.09,.03],[.03,.05],[.025,.12],[.04,.16],[.02,.2],[.015,.38],[0,.4]],24)),p:[-.86,.795,1.45],s:1,rot:[0,0,0],mat:{a:[.03,.025,.02],m:.5,r:.35}});
eng.addObject({m:eng.addMesh(lathe([[.2,0],[.2,.01],[.12,.26],[.11,.27],[0,.27]],32)),p:[-.86,1.06,1.45],s:1,rot:[0,0,0],mat:{a:[.04,.035,.03],m:0,r:.7}});
eng.addObject({m:box(.36,.05,.24),p:[-.62,.82,1.53],s:1,rot:[0,.15,0],mat:{a:[.5,.47,.4],m:0,r:.7}});
eng.addObject({m:box(.32,.04,.22),p:[-.6,.865,1.54],s:1,rot:[0,-.1,0],mat:{a:[.08,.07,.07],m:0,r:.6}});
eng.addObject({m:box(.4,.02,.27),p:[.5,.805,1.61],s:1,rot:[0,0,0],mat:{a:[.18,.18,.19],m:.8,r:.35}});
eng.addObject({m:box(.4,.27,.012),p:[.5,.94,1.47],s:1,rot:[-.22,0,0],mat:{a:[.06,.06,.065],m:.7,r:.3}});
eng.addObject({m:eng.addMesh(lathe([[0,0],[.042,0],[.044,.11],[.04,.11],[0,.105]],20)),p:[1.02,.795,1.53],s:1,rot:[0,0,0],mat:{a:[.5,.44,.38],m:0,r:.4}});

/* ---------- the figure (CC0 MakeHuman, posed), black robe and a hidden chair ---------- */
const FIG='__FIGURE_B64__';
const b64=str=>{const A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',L=new Uint8Array(128);for(let i=0;i<64;i++)L[A.charCodeAt(i)]=i;
 const n=str.length,pad=str.endsWith('==')?2:str.endsWith('=')?1:0,out=new Uint8Array(n*3/4-pad);let o=0;
 for(let i=0;i<n;i+=4){const v=L[str.charCodeAt(i)]<<18|L[str.charCodeAt(i+1)]<<12|L[str.charCodeAt(i+2)]<<6|L[str.charCodeAt(i+3)];if(o<out.length)out[o++]=v>>16&255;if(o<out.length)out[o++]=v>>8&255;if(o<out.length)out[o++]=v&255;}return out;};
const fig=(()=>{const bin=b64(FIG),dv=new DataView(bin.buffer),nv=dv.getUint32(0,true),nt=dv.getUint32(4,true);
 const pos=new Float32Array(bin.buffer.slice(8,8+nv*12)),idx=new Uint16Array(bin.buffer.slice(8+nv*12,8+nv*12+nt*6));
 const vb=new Float32Array(nv*8);for(let i=0;i<nv;i++){vb[i*8]=pos[i*3];vb[i*8+1]=pos[i*3+1];vb[i*8+2]=pos[i*3+2];}
 return weldNormals({vb,ib:idx});})();
const FX=-.05,FZ=2.55,SEAT=.36;
const cloth={a:[.003,.003,.0035],m:0,r:.9};
eng.addObject({m:eng.addMesh(fig),p:[FX,SEAT,FZ],s:.135,rot:[0,Math.PI,0],mat:cloth});
/* cloak: from the shoulders, widening over the chair and pooling on the floor */
eng.addObject({m:eng.addMesh(lathe([[0,.92],[.2,.9],[.25,.8],[.29,.6],[.36,.36],[.46,.15],[.56,.04],[.6,0],[0,0]],48)),p:[FX,0,FZ+.1],s:1,rot:[0,0,0],sv:[1,1,.75],mat:cloth});
eng.addObject({m:box(.48,.05,.46),p:[FX,SEAT-.03,FZ+.05],s:1,rot:[0,0,0],mat:dark});

/* ---------- life: dust in the beam ---------- */
eng.addEmitter({kind:'dust',pos:[.1,2.1,2.0],count:140,vel:[.01,.012,0],life:14,spread:[1.1,.9,1.1],size:.004,gravity:0,turbulence:.05,color:[.95,.97,1],alpha:.55});

/* ---------- camera: locked composition, an almost imperceptible push-in ---------- */
eng.setPost({exposure:+(Q.get('exp')||1),tone:'agx',look:[1.18,1.05],saturation:1.0,curve:.3,bloom:.07,threshold:1.2,knee:.6,grain:.04,chromatic:.004,vignette:.6,flare:0,dirt:0,dofMaxCoC:2,lut:'teal-orange',lutStrength:.3,contactShadows:.9});
cam.fstop=8;cam.shutterAngle=180;
function frameCam(t){const k=.5-.5*Math.cos(Math.min(t/60,1)*Math.PI);
 const wide=window.innerWidth>window.innerHeight;
 /* solved from the reference: projection top at the frame top, desk top at 69%, baseboard at 78%, rug edge at 94% */
 cam.fov=(wide?52:65.4)*DEG;cam.pos=[0,1.11,6.78-.4*k];cam.target=[0,1.11+Math.tan(9.76*DEG)*6.78,0];cam.focusTarget=[FX,1.2,FZ];}
/* ---------- free camera: orbit / zoom / pan layered on top of the scripted shot ----------
   drag = orbit, pinch or wheel = zoom, two-finger drag or right/shift-drag = pan, double-tap = back to the cinematic shot */
function makeOrbit(canvas,o){
 const st={yaw:0,pitch:0,zoom:1,pan:[0,0,0],cur:{yaw:0,pitch:0,zoom:1,pan:[0,0,0]},touched:false,last:0};
 const ptr=new Map();let pinch0=0,zoom0=1,mid0=null,lastTap=0;
 const minZ=o.minZoom||.35,maxZ=o.maxZoom||3,floorY=o.floorY===undefined?.02:o.floorY;
 const reset=()=>{st.yaw=0;st.pitch=0;st.zoom=1;st.pan=[0,0,0];st.touched=false;if(o.onReset)o.onReset();};
 const touch=()=>{if(!st.touched&&o.onTouch)o.onTouch();st.touched=true;};
 let basis=null;   /* camera right/up of the last frame, for screen-space panning */
 function panBy(dx,dy,dist){if(!basis)return;const k=dist*.0016;for(let i=0;i<3;i++)st.pan[i]+=(-basis.r[i]*dx+basis.u[i]*dy)*k;}
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,b:e.button,sh:e.shiftKey});
  if(ptr.size===2){const [a,b]=[...ptr.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);zoom0=st.zoom;mid0=[(a.x+b.x)/2,(a.y+b.y)/2];}
  const now=performance.now();if(ptr.size===1&&now-lastTap<300)reset();lastTap=now;});
 canvas.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(ptr.size===1){if(Math.abs(dx)+Math.abs(dy)<.5)return;touch();
   if(p.b===2||p.sh)panBy(dx,dy,st.dist||1);else{st.yaw-=dx*.006;st.pitch=clamp(st.pitch+dy*.005,-1.2,1.2);}}
  else if(ptr.size===2){touch();const [a,b]=[...ptr.values()],d=Math.max(Math.hypot(a.x-b.x,a.y-b.y),1),m=[(a.x+b.x)/2,(a.y+b.y)/2];
   st.zoom=clamp(zoom0*pinch0/d,minZ,maxZ);panBy(m[0]-mid0[0],m[1]-mid0[1],st.dist||1);mid0=m;}});
 const up=e=>ptr.delete(e.pointerId);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 canvas.addEventListener('wheel',e=>{e.preventDefault();touch();st.zoom=clamp(st.zoom*(1+e.deltaY*.0012),minZ,maxZ);},{passive:false});
 /* apply(cam, dt): call right after the scripted shot has set cam.pos / cam.target */
 st.apply=(cam,dt)=>{const c=st.cur,k=1-Math.exp(-dt*10);
  c.yaw+=(st.yaw-c.yaw)*k;c.pitch+=(st.pitch-c.pitch)*k;c.zoom+=(st.zoom-c.zoom)*k;for(let i=0;i<3;i++)c.pan[i]+=(st.pan[i]-c.pan[i])*k;
  const tg=v3.add(cam.target,c.pan),v=v3.sub(cam.pos,cam.target),r=v3.len(v)*c.zoom;
  let az=Math.atan2(v[2],v[0])+c.yaw,el=clamp(Math.asin(clamp(v[1]/Math.max(v3.len(v),1e-6),-1,1))+c.pitch,-.2,1.45);
  let p=[tg[0]+r*Math.cos(el)*Math.cos(az),tg[1]+r*Math.sin(el),tg[2]+r*Math.cos(el)*Math.sin(az)];
  p[1]=Math.max(p[1],floorY);cam.pos=p;cam.target=tg;st.dist=r;
  const f=v3.norm(v3.sub(tg,p)),rr=v3.norm(v3.cross(f,[0,1,0])),uu=v3.cross(rr,f);basis={r:rr,u:uu};};
 st.reset=reset;return st;}

let T=0,drift=true;
const orbit=makeOrbit($('c'),{minZoom:.12,maxZoom:1.6,floorY:.15,onTouch:()=>{drift=false;$('bMode').textContent='Cinematic';},onReset:()=>{drift=true;$('bMode').textContent='Reset';}});
eng.start(dt=>{if(drift)T+=dt;frameCam(T);orbit.apply(cam,dt);});
if(Q.has('t'))T=+Q.get('t');
$('top').textContent='Drag: orbit   Pinch/scroll: zoom   Two fingers: pan   Double-tap: reset';$('bMode').textContent='Reset';$('bMode').onclick=()=>{if(orbit.touched)orbit.reset();else T=0;};
$('bTime').textContent='Pause';let paused=false;$('bTime').onclick=()=>{paused=!paused;eng.pause(paused);$('bTime').textContent=paused?'Play':'Pause';};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').onclick=()=>{$('bSnd').textContent=eng.audio.toggle()?'Sound on':'Sound off';};
if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
eng.frozen=Q.has('freeze');window.__eng=eng;
})();
