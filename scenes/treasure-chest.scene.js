/* Sunken Treasure - an open chest of gold coins on a sandy lagoon bed, sunlight shafts from the top right, kelp behind,
   a wrecked hull far back, purple coral and a rock at the sides. Built on the Apex engine with a water medium
   (setWaterMedium: Beer-Lambert absorption, in-scatter, sun and ambient tinted by the water column).
   The sun is placed by its screen position so the shafts start at the top right of the frame. The shafts need a sun glow in the
   water sky that is brighter than the god-ray pass threshold (luminance 60); the engine copy used for this build has that term.
   Query: ?cint=intensity of the caustic light &gi=0 &dof=0 &freeze=1 &q=0|1|2 &sun=sx,sy (screen position of the sun) */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),minScale:.75,onError:fail,onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},800);}});
if(!eng)return;
const cam=eng.camera;
let seed=2024;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const BASE=-6;                                   /* sandy bed, metres below the surface (y = 0) */

/* ---------- geometry helpers: rotations, placement, merging ---------- */
function rotX(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c];}
function rotY(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c];}
/* place a {vb,ib} geometry: local -> +pre -> rotX(rx) -> +mid -> rotY(yaw) -> +at (scale s applied first) */
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
/* kelp frond: a flat ribbon along a spine, facing the camera */
function ribbon(pts,wf){const vb=[],ib=[],n=pts.length;
 for(let i=0;i<n;i++){const a=pts[Math.max(i-1,0)],b=pts[Math.min(i+1,n-1)],T=v3.norm(v3.sub(b,a)),S=v3.norm(v3.cross(T,[0,0,1])),N=v3.norm(v3.cross(S,T)),t=i/(n-1),w=wf(t);
  const L=v3.sub(pts[i],v3.mul(S,w)),R=v3.add(pts[i],v3.mul(S,w));
  vb.push(L[0],L[1],L[2],N[0],N[1],N[2],0,t,R[0],R[1],R[2],N[0],N[1],N[2],1,t);}
 for(let i=0;i<n-1;i++){const a=2*i,b=a+2;ib.push(a,a+1,b,a+1,b+1,b);}
 return {vb:new Float32Array(vb),ib:new Uint32Array(ib)};}
/* a flat coin (both faces) at c with normal nrm */
function coin(c,nrm,r,seg){const vb=[],ib=[];const t=Math.abs(nrm[1])<.9?[0,1,0]:[1,0,0];const e1=v3.norm(v3.cross(nrm,t)),e2=v3.cross(nrm,e1);
 for(const side of [1,-1]){const base=vb.length/8;vb.push(c[0],c[1],c[2],nrm[0]*side,nrm[1]*side,nrm[2]*side,.5,.5);
  for(let k=0;k<=seg;k++){const a=k/seg*TAU,p=v3.add(c,v3.add(v3.mul(e1,Math.cos(a)*r),v3.mul(e2,Math.sin(a)*r)));vb.push(p[0],p[1],p[2],nrm[0]*side,nrm[1]*side,nrm[2]*side,.5+.5*Math.cos(a),.5+.5*Math.sin(a));}
  for(let k=0;k<seg;k++){if(side>0)ib.push(base,base+1+k,base+2+k);else ib.push(base,base+2+k,base+1+k);}}
 return {vb,ib};}

/* ---------- world: sandy bed, water medium, no sky clouds ---------- */
const grid=buildGrid((x,z)=>BASE+.22*(fbm2(x*.09+4,z*.09+1,3)-.5)+.05*(vn2(x*.7,z*.7)-.5));
eng.setTerrain(grid,{mode:'island',skirt:false,water:false});
eng.setFog({density:0,falloff:.04,horizon:[1e6,2e6],rayleigh:0,mie:0,g:.76});
eng.setClouds({coverage:0});
eng.setWaterMedium({absorb:[.22,.05,.025],scatter:[.05,.3,.36],depth:2});

/* ---------- camera: a low three-quarter view at the chest, slightly above it ---------- */
const CAM={pos:[-.55,BASE+1.25,3.4],tgt:[.1,BASE+.45,0],fov:44*DEG};
cam.fov=CAM.fov;cam.pos=CAM.pos.slice();cam.target=CAM.tgt.slice();
/* sun direction from its screen position (sx,sy in [0,1], may lie outside the frame): the shafts start there */
function sunFromScreen(sx,sy,aspect){const f=v3.norm(v3.sub(CAM.tgt,CAM.pos)),r=v3.norm(v3.cross(f,[0,1,0])),u=v3.cross(r,f);
 const th=Math.tan(CAM.fov/2),tx=th*aspect,k1=(sx-.5)*2*tx,k2=(sy-.5)*2*th;
 const d=v3.norm([f[0]+r[0]*k1+u[0]*k2,f[1]+r[1]*k1+u[1]*k2,f[2]+r[2]*k1+u[2]*k2]);
 return {el:Math.max(18,Math.asin(d[1])/DEG),az:Math.atan2(d[2],d[0])/DEG};}
const SS=(Q.get('sun')||'.84,1.04').split(',').map(Number);
const SUN=sunFromScreen(SS[0],SS[1],16/9);
eng.setTimeOfDay(SUN.el,SUN.az,0);

/* ---------- the chest (wood body, open lid, iron bands and lock), in chest coordinates ---------- */
const CH={yaw:.16,W:1.2,H:.62,D:.78,LH:.22,open:-1.9};       /* lid opened ~110 degrees about its back edge */
const woodMaps=eng.createMaps(genMaterialMaps('planks',256,11));
const T_=.04;                                                  /* plank thickness */
const bodyParts=[[CH.W,T_,CH.D,0,T_/2,0],[CH.W,CH.H,T_,0,CH.H/2,CH.D/2-T_/2],[CH.W,CH.H,T_,0,CH.H/2,-CH.D/2+T_/2],[T_,CH.H,CH.D,CH.W/2-T_/2,CH.H/2,0],[T_,CH.H,CH.D,-CH.W/2+T_/2,CH.H/2,0]]
  .map(([w,h,d,x,y,z])=>place(genBox(w,h,d),{mid:[x,y,z],yaw:CH.yaw,at:[0,BASE,0]}));
const body=mergeG(bodyParts);
const lid=place(genRoundedBox(CH.W,CH.LH,CH.D,.1,6),{pre:[0,CH.LH/2,CH.D/2],rx:CH.open,mid:[0,CH.H,-CH.D/2],yaw:CH.yaw,at:[0,BASE,0]});
const iron=[];
for(const x of [-.42,.42]){for(const z of [CH.D/2+.012,-CH.D/2-.012])iron.push(place(genBox(.07,CH.H+.04,.03),{mid:[x,CH.H/2,z],yaw:CH.yaw,at:[0,BASE,0]}));}
iron.push(place(genBox(.16,.18,.02),{mid:[0,CH.H*.62,CH.D/2+.02],yaw:CH.yaw,at:[0,BASE,0]}));   /* lock plate */
const chestWood=eng.addObject({m:eng.addMesh(mergeG([body,lid])),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.85,.72,.6],m:0,r:.72,maps:woodMaps,uvScale:1.2,wet:.5}});
eng.addObject({m:eng.addMesh(mergeG(iron)),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.16,.16,.17],m:1,r:.5,wet:.6}});

/* ---------- gold: a heap of coins inside the chest, a few spilled on the sand ---------- */
const coinParts=[];
for(let k=0;k<520;k++){
 const x=(rnd()*2-1)*.52,z=(rnd()*2-1)*.33,e=(x/.54)**2+(z/.36)**2;if(e>1)continue;
 const y=.07+(.62*Math.sqrt(1-e)+.1)*Math.pow(rnd(),.7);     /* heap on the floor, rising toward the rim and past it */
 const a=rnd()*TAU,tl=(rnd()*.4+.05)*(rnd()<.5?1:.3);
 const n=v3.norm([Math.sin(a)*tl,1,Math.cos(a)*tl]);
 const c=rotY([x,y,z],CH.yaw);coinParts.push(coin(v3.add(c,[0,BASE,0]),n,.072+.012*rnd(),12));}
for(let k=0;k<34;k++){const x=-.9+rnd()*1.5,z=1.0+rnd()*.7;const d=Math.hypot(x-.1,z);if(d<.7)continue;
 coinParts.push(coin([x,BASE+.012,z],v3.norm([(rnd()-.5)*.3,1,(rnd()-.5)*.3]),.072,12));}
const gold=eng.addObject({m:eng.addMesh(mergeG(coinParts)),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[1,.6,.16],m:1,r:.3,clearcoat:.4,clearcoatRough:.08}});

/* ---------- rock at the left (algae-dark crevices), wreck far back, coral at the right ---------- */
const rockG=genRock(5);
eng.addObject({m:eng.addMesh(place(rockG,{s:1.05,mid:[0,0,0],yaw:.7,at:[-1.9,BASE+.2,.7]})),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.44,.32,.2],m:0,r:.85,mode:2}});

const wreckHull=place(genRoundedBox(15,3,4.6,.25,3),{mid:[0,1.2,0],rx:0,yaw:.42,at:[4,BASE,-17]});
const wreckRibs=[];for(let k=0;k<6;k++){const t=k/5;wreckRibs.push(place(genBox(.28,2.8,4.6),{mid:[-6.5+13*t,1.2,0],yaw:.42,at:[4,BASE,-17]}));}
const mast=place(genBox(.28,7.5,.28),{mid:[-1.2,3.6,0],yaw:.42,at:[4,BASE,-17]});
eng.addObject({m:eng.addMesh(mergeG([wreckHull,mast])),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.62,.52,.44],m:0,r:.9,maps:woodMaps,uvScale:2,wet:.8}});
eng.addObject({m:eng.addMesh(mergeG(wreckRibs)),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.48,.38,.3],m:0,r:.9,wet:.8}});

const coralA=[],coralB=[];
for(let k=0;k<5;k++){const a=rnd()*TAU,rr=rnd()*.18,x=1.55+Math.cos(a)*rr,z=.7+Math.sin(a)*rr,h=.42+rnd()*.45,r=.045+rnd()*.03;
 const prof=[[r*.7,0],[r,h*.25],[r*.9,h*.5],[r*1.2,h*.75],[r*.4,h]];coralA.push(place(lathe(prof,10),{at:[x,BASE,z],yaw:rnd()*TAU}));}
for(let k=0;k<4;k++){const a=rnd()*TAU,rr=rnd()*.24,x=1.85+Math.cos(a)*rr,z=1.05+Math.sin(a)*rr,h=.28+rnd()*.3,r=.035+rnd()*.025;
 const prof=[[r*.8,0],[r,h*.35],[r*1.4,h*.7],[r*.5,h]];coralB.push(place(lathe(prof,10),{at:[x,BASE,z],yaw:rnd()*TAU}));}
eng.addObject({m:eng.addMesh(mergeG(coralA)),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.5,.2,.7],m:0,r:.35,clearcoat:.6,clearcoatRough:.1,transmission:.25,thickness:.3,attenuation:[.6,.9,.6]}});
eng.addObject({m:eng.addMesh(mergeG(coralB)),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.92,.4,.62],m:0,r:.4,clearcoat:.5,clearcoatRough:.12,transmission:.2,thickness:.2,attenuation:[.9,.7,.8]}});

/* ---------- kelp: a dense field of ribbons behind the chest, reaching toward the surface ---------- */
const kelp=[];
for(let k=0;k<52;k++){
 const x=(rnd()*2-1)*17-1,z=-6.5-rnd()*12,H=4.8+rnd()*1.8,ph=rnd()*TAU,A=.45+rnd()*.8,W=.17+rnd()*.12,N=26;
 const pts=[];for(let i=0;i<=N;i++){const t=i/N;pts.push([x+A*Math.sin(t*2.4+ph)*t,BASE+H*t,z+.35*A*Math.cos(t*1.6+ph)*t]);}
 kelp.push(ribbon(pts,t=>W*(1-.75*t)*Math.sin(Math.PI*Math.min(.06+t,1)*.5+.5)));}
eng.addObject({m:eng.addMesh(mergeG(kelp)),p:[0,0,0],s:1,rot:[0,0,0],mat:{a:[.07,.11,.05],m:0,r:.6,doubleSided:true,transmission:.2,thickness:.3,attenuation:[.4,1,.55]}});

/* ---------- seaweed tufts around the chest base ---------- */
const weed=[];
for(let k=0;k<22;k++){const a=rnd()*TAU,rr=.9+rnd()*1.9,x=Math.cos(a)*rr-.2,z=Math.sin(a)*rr*.8+.2;
 if(Math.hypot(x,z)<.9)continue;
 weed.push(x,gridH(grid,x,z)-.02,z,.9+rnd()*.6,rnd()*TAU,.05+rnd()*.2,rnd()*TAU,rnd());}
eng.addFoliage({geom:genGrassClump(12,7,4),instances:new Float32Array(weed),farFrac:.3,mat:{stem:[.1,.1,.04],leaf:[.1,.13,.04],leaf2:[.17,.18,.06],leafRough:.5,trans:.9,normal:.6}});

/* ---------- caustics: a procedural caustic net projected from above (the sun's light through the surface) ---------- */
function causticImage(N,cells,seedC){const d=new Uint8Array(N*N*4);
 const hash=(i,j)=>{let h=(i*374761393+j*668265263+seedC*2246822519)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
 const oct=(cs,wgt,u0,v0)=>{let o=0;const u=u0*cs,v=v0*cs,ci=Math.floor(u),cj=Math.floor(v);let f1=9,f2=9;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const ii=ci+i,jj=cj+j,px=ii+hash(ii,jj),py=jj+hash(ii+77,jj+31),dd=Math.hypot(u-px,v-py);if(dd<f1){f2=f1;f1=dd;}else if(dd<f2)f2=dd;}
  return wgt*Math.pow(Math.max(0,1-(f2-f1)/.16),3);};
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const u=x/N,v=y/N;
  const c=Math.min(1,oct(cells,1,u,v)+oct(cells*2.3,.55,u+.31,v+.17)+oct(cells*5.1,.2,u+.57,v+.63));
  const o=(y*N+x)*4;d[o]=Math.round(255*c*.62);d[o+1]=Math.round(255*c*.96);d[o+2]=Math.round(255*c);d[o+3]=255;}
 return {data:d,w:N,h:N};}
if(Q.get('cau')!=='0'){
 eng.addProjector({image:causticImage(512,30,3),pos:[0,BASE+15,0],target:[0,BASE,0],fov:58*DEG,mode:'light',
  intensity:Q.has('cint')?+Q.get('cint'):280,occlusion:true,bias:.05,static:true,near:.5,far:60});}

/* ---------- suspended particles in the light ---------- */
eng.addEmitter({kind:'pollen',pos:[0,BASE+2.4,0],count:240,vel:[.02,.02,0],life:9,spread:[4.5,2.2,3.5],size:.045,gravity:-.01,turbulence:.6,color:[.75,.92,.95],alpha:.45,soft:.6});

/* ---------- global illumination around the chest (gold and coral bounce, shafts of the water-tinted sky) ---------- */
if(Q.get('gi')!=='0')eng.setGI({extent:14,levels:3,center:[0,BASE+.8,0],intensity:1.2,bounce:1,sky:.25,specular:true});

/* ---------- post: underwater grade, shallow depth of field on the chest ---------- */
eng.setPost({tone:'agx',exposure:1.25,look:[1.1,1.16],saturation:1.12,curve:.22,bloom:.1,threshold:.85,knee:.6,grain:.02,chromatic:.004,vignette:.5,dofMaxCoC:12});
cam.fstop=2.2;cam.bokehScale=Q.get('dof')==='0'?0:2;cam.shutterAngle=180;
cam.focusTarget=[0,BASE+.4,0];

/* ---------- life: a slow breathing drift of the camera ---------- */
let T=0;
eng.start(dt=>{T+=dt;const k=Math.sin(T*.13),k2=Math.sin(T*.09+1);
 cam.pos=[CAM.pos[0]+.05*k,CAM.pos[1]+.02*k2,CAM.pos[2]];cam.target=CAM.tgt.slice();});
if(Q.has('q')){eng.setQuality(+Q.get('q'));}
eng.frozen=Q.has('freeze');window.__eng=eng;
})();
