/* Wall of Water - a tsunami seen through a rain-speckled apartment window. 26 s loop.
   0-10 s a black wall of water towers behind the blocks; ~5 s a muddy bore breaks out ahead of it and races up the street;
   ~12 s it reaches the car park, floats cars, the truck and debris toward the camera; then a roaring river of foam.
   Built on the Apex engine (v8). Query: ?t=seconds &q=0|1|2 &freeze=1 &dof=0 &pane=0 */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),onError:fail,onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},900);}});
if(!eng)return;
const cam=eng.camera;
let seed=11;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};

/* ---------- storm light: full overcast, the sun only lights the cloud deck ---------- */
eng.setTerrain(buildGrid(()=>-40),{mode:'meadow',skirt:false,water:false});
eng.setTimeOfDay(30,90,0);   /* sun behind the camera, buried in cloud */
eng.setClouds({coverage:1,shadows:1,speed:2.5});
eng.setFog({density:.0007,falloff:.01,rayleigh:.2,mie:.35,g:.6});
eng.setWind({dir:[-.3,1],strength:.9,gust:1.6,turbulence:.6});
eng.setWeather({rain:.55,wetness:.9,slant:.25});
eng.setGround({albedo:[.08,.08,.08]});

/* ---------- helpers ---------- */
const add=(g,p,mat,o)=>eng.addObject(Object.assign({m:eng.addMesh(g),p,s:1,rot:[0,0,0],mat,castShadow:false},o||{}));
/* box with metre UVs on every face (u along the face, v up) for the facade shader */
function boxM(w,h,d){const vb=[],ib=[],X=w/2,Z=d/2;
 const face=(o,ux,uz,len,nx,nz)=>{const b=vb.length/8;for(const [s,t] of [[0,0],[1,0],[1,1],[0,1]])vb.push(o[0]+ux*len*s,t*h,o[2]+uz*len*s,nx,0,nz,len*s,t*h);ib.push(b,b+2,b+1,b,b+3,b+2);};
 face([-X,0,Z],1,0,w,0,1);face([X,0,-Z],-1,0,w,0,-1);face([X,0,Z],0,-1,d,1,0);face([-X,0,-Z],0,1,d,-1,0);
 const b=vb.length/8;for(const [x,z] of [[-X,Z],[X,Z],[X,-Z],[-X,-Z]])vb.push(x,h,z,0,1,0,x,z);ib.push(b,b+1,b+2,b,b+2,b+3);
 return {vb:new Float32Array(vb),ib:new Uint16Array(ib)};}
function merge(parts){let nv=0,ni=0;for(const g of parts){nv+=g.vb.length/8;ni+=g.ib.length;}
 const vb=new Float32Array(nv*8),ib=new Uint32Array(ni);let ov=0,oi=0;
 for(const g of parts){vb.set(g.vb,ov*8);for(let i=0;i<g.ib.length;i++)ib[oi+i]=g.ib[i]+ov;ov+=g.vb.length/8;oi+=g.ib.length;}return {vb,ib};}
function moved(g,dx,dy,dz){const vb=g.vb.slice();for(let i=0;i<vb.length;i+=8){vb[i]+=dx;vb[i+1]+=dy;vb[i+2]+=dz;}return {vb,ib:g.ib};}

/* ---------- ground: asphalt car park + street, grass verges ---------- */
const asph=eng.createMaps(genMaterialMaps('asphalt',256,4));
add(genPlaneGrid(260,8),[0,0,-110],{a:[.42,.42,.43],m:1,r:1,maps:asph,uvScale:40,stochastic:true,wet:.8},{castShadow:false});
for(const [x,z,w,d] of [[-20,-8,16,30],[24,-40,14,40],[-16,-75,10,30]])add(boxM(w,.12,d),[x,0,z],{a:[.16,.2,.08],m:0,r:.9,wet:.6},{castShadow:false});

/* ---------- apartment blocks (Polish/east-European panel blocks: yellow, orange, white, balcony stacks) ---------- */
const blocks=[];
function block(x,z,w,d,floors,paint,yaw,opt){opt=opt||{};const fh=2.85,h=floors*fh+1.2;
 const o=add(boxM(w,h,d),[x,0,z],{a:paint,m:0,r:.85,mode:'facade',modelA:fh,modelB:opt.bay||3.0,glossiness:opt.accent?1:0,wet:.35},{rot:[0,yaw||0,0]});
 /* facade uniforms: uMatG = (modelA floor height, modelB bay width, -, glossiness = accent stripe) */
 /* balcony stacks on the street face: slabs + parapet panels in a contrasting colour */
 if(opt.balc){const parts=[];const n=Math.floor(w/(opt.bay||3)/2);
  for(let k=0;k<n;k++){if(((k*7+3)%5)>2)continue;const bx=-w/2+(k*2+1)*(opt.bay||3);
   for(let f=1;f<floors;f++){parts.push(moved(boxM(2.6,.16,1.3),bx,f*fh,d/2+.65));parts.push(moved(boxM(2.6,1.05,.08),bx,f*fh+.16,d/2+1.28));}}
  if(parts.length)add(merge(parts),[x,0,z],{a:opt.balc,m:0,r:.8,wet:.4},{rot:[0,yaw||0,0]});}
 add(boxM(w+.3,.5,d+.3),[x,h,z],{a:[.32,.3,.28],m:0,r:.8},{rot:[0,yaw||0,0]});      /* roof parapet */
 blocks.push({x,z,w,d,h});return o;}
block(-30,-62,16,56,9,[.86,.78,.42],0,{bay:3});                        /* tall yellow block, left */
block(-38,-18,14,24,8,[.78,.76,.72],0,{bay:3});                       /* grey-white block behind the left tree */
block(-4,-128,42,14,5,[.93,.62,.38],0,{balc:[.95,.92,.86],bay:3.2});  /* orange + white, centre distance */
block(34,-92,40,13,6,[.94,.93,.9],0,{balc:[.96,.6,.32],bay:3.2,accent:1});  /* white block with orange balconies, right */
block(60,-112,14,30,10,[.95,.95,.94],0,{bay:3});                      /* tall white tower, far right */
block(-62,-140,30,14,7,[.9,.7,.4],0,{bay:3});
block(30,-170,50,14,6,[.88,.84,.7],0,{bay:3.2});
block(-30,-200,44,14,8,[.8,.78,.74],0,{bay:3});
block(70,-230,40,14,9,[.92,.66,.42],0,{bay:3});
block(-80,-260,40,14,10,[.86,.84,.8],0,{bay:3});
/* a red-roofed shed and a skip in the car park */
add(boxM(7,2.6,5),[-7,0,-14],{a:[.45,.25,.16],m:0,r:.85});
add(genBox(7.6,.25,5.8),[-7,2.75,-14],{a:[.62,.16,.1],m:0,r:.6,wet:.8},{rot:[.12,0,0]});
add(genBox(4,1.5,2),[0,.75,-15],{a:[.25,.32,.26],m:.4,r:.6,wet:.6});

/* ---------- vehicles ---------- */
function carGeom(L,W,H){const body=genRoundedBox(L,H*.52,W,.18,3),cab=genRoundedBox(L*.55,H*.42,W*.9,.14,3);
 const b=moved(body,0,H*.26+.22,0),c=moved(cab,-L*.06,H*.52+.22+H*.21,0),wh=[];
 for(const [x,z] of [[L*.32,W*.45],[L*.32,-W*.45],[-L*.32,W*.45],[-L*.32,-W*.45]])wh.push(moved(genSphere(.32,10,8),x,.32,z));
 return {body:merge([b,...wh]),cab:c};}
const carG=carGeom(4.3,1.8,1.45),vanG=carGeom(5.6,2.05,2.5);
const vehicles=[];
function vehicle(g,x,z,yaw,paint,draft){const body=eng.addObject({m:eng.addMesh(g.body),p:[x,0,z],s:1,rot:[0,yaw,0],castShadow:false,mat:{a:paint,m:.35,r:.28,clearcoat:.8,clearcoatRough:.1,wet:.9}});
 const cab=eng.addObject({m:eng.addMesh(g.cab),p:[x,0,z],s:1,rot:[0,yaw,0],castShadow:false,mat:{a:[.04,.045,.05],m:.2,r:.08,clearcoat:1,wet:1}});
 const v={parts:[body,cab],x0:x,z0:z,yaw0:yaw,draft:draft||.55,state:0,vx:0,vz:0,y:0,spin:0,ph:rnd()*TAU};vehicles.push(v);return v;}
const paints=[[.92,.92,.9],[.18,.18,.2],[.62,.63,.66],[.55,.06,.05],[.85,.85,.83],[.1,.12,.22],[.75,.75,.74],[.3,.3,.32]];
for(let k=0;k<9;k++)vehicle(carG,-6+k*2.8,-1.5,Math.PI/2+(rnd()-.5)*.08,paints[k%paints.length]);
for(let k=0;k<5;k++)vehicle(carG,-22+k*2.8,-3,Math.PI/2+(rnd()-.5)*.08,paints[(k+3)%paints.length]);
for(let k=0;k<4;k++)vehicle(carG,4+k*2.8,-24,-Math.PI/2+(rnd()-.5)*.1,paints[(k+5)%paints.length]);
vehicle(carG,-3,-36,.1,[.75,.1,.08]);vehicle(carG,-2.4,-44,.05,[.6,.62,.66]);vehicle(carG,-3.2,-52,0,[.12,.12,.14]);
vehicle(vanG,-4,-70,.15,[.95,.95,.95],.9);
/* the blue T.D.S. box truck, side-on: canvas-lettered box + white cab */
const truckBox=genRoundedBox(7.4,3.2,2.5,.06,2),truckCab=carGeom(2.4,2.4,2.6).body;
const tdsTex=(()=>{const w=512,h=256,cv=document.createElement?document.createElement('canvas'):null;if(!cv||!cv.getContext)return null;cv.width=w;cv.height=h;const x=cv.getContext('2d');if(!x)return null;
 x.fillStyle='#1e3fb0';x.fillRect(0,0,w,h);x.fillStyle='rgba(255,255,255,.08)';for(let i=0;i<w;i+=32)x.fillRect(i,0,2,h);
 x.fillStyle='#f4f6ff';x.font='bold 96px Arial,Helvetica,sans-serif';x.textAlign='center';x.fillText('T.D.S.',w/2,h*.55);
 x.font='italic 22px Arial,Helvetica,sans-serif';x.fillText('Transport  Drogowy  Spedycja',w/2,h*.75);
 const img=x.getImageData(0,0,w,h).data,orm=new Uint8Array(w*h*4),nrm=new Uint8Array(w*h*4);
 for(let i=0;i<w*h;i++){orm[i*4]=255;orm[i*4+1]=150;orm[i*4+2]=0;orm[i*4+3]=0;nrm[i*4]=128;nrm[i*4+1]=128;nrm[i*4+2]=255;nrm[i*4+3]=255;}
 return eng.createMaps({w,h,albedo:new Uint8Array(img.buffer),orm,normal:nrm});})();
const sideQuad=(L,H,z)=>({vb:new Float32Array([-L/2,0,z,0,0,1,0,1, L/2,0,z,0,0,1,1,1, L/2,H,z,0,0,1,1,0, -L/2,H,z,0,0,1,0,0]),ib:new Uint16Array([0,1,2,0,2,3])});
const truck=(()=>{const x=12,z=-30;const parts=[];
 parts.push(eng.addObject({castShadow:false,m:eng.addMesh(moved(truckBox,-1.2,2.55,0)),p:[x,0,z],s:1,rot:[0,0,0],mat:{a:[.08,.18,.62],m:.1,r:.35,wet:.9}}));
 if(tdsTex)parts.push(eng.addObject({castShadow:false,m:eng.addMesh(moved(sideQuad(7.2,3,1.27),-1.2,1.05,0)),p:[x,0,z],s:1,rot:[0,0,0],mat:{a:[1,1,1],m:0,r:.4,maps:tdsTex,uvScale:1,wet:.9}}));
 parts.push(eng.addObject({castShadow:false,m:eng.addMesh(moved(truckCab,3.6,0,0)),p:[x,0,z],s:1,rot:[0,0,0],mat:{a:[.95,.95,.95],m:.2,r:.3,clearcoat:.6,wet:.9}}));
 parts.push(eng.addObject({castShadow:false,m:eng.addMesh(moved(genBox(1.2,1.1,2.3),4.2,2.,0)),p:[x,0,z],s:1,rot:[0,0,0],mat:{a:[.05,.06,.07],m:.2,r:.08,wet:1}}));
 const v={parts,x0:x,z0:z,yaw0:0,draft:1.2,state:0,vx:0,vz:0,y:0,spin:0,ph:1};vehicles.push(v);return v;})();

/* ---------- autumn trees (foliage system: translucent leaves, wind) ---------- */
function genTree(sd){let s=sd*7919>>>0;const r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 const B=folBuilder();const H=1;
 folStem(B,[[0,0,0],[.01,.3,0],[.02,.55,.01]],.045,7);
 const tips=[];
 for(let b=0;b<9;b++){const a=b*2.4+r(),el=.45+r()*.5,L=.3+r()*.25,base=[.02,.32+r()*.25,.01],d=[Math.cos(a)*Math.cos(el),Math.sin(el),Math.sin(a)*Math.cos(el)];
  const pts=[];for(let k=0;k<4;k++){const t=k/3;pts.push([base[0]+d[0]*L*t,base[1]+d[1]*L*t+.05*t*t,base[2]+d[2]*L*t]);}folStem(B,pts,.02,5);tips.push(pts[3]);}
 for(let i=0;i<2600;i++){const tp=tips[i%tips.length],u=v3.norm([r()-.5,r()-.3,r()-.5]),rr=Math.pow(r(),.5)*.24;
  const c=v3.add(tp,[u[0]*rr*1.3,u[1]*rr,u[2]*rr*1.3]);const dir=v3.norm([r()-.5,r()*.6-.2,r()-.5]),side=v3.norm(v3.cross(dir,[0,1,0]));
  folRibbon(B,[c,v3.add(c,v3.mul(dir,.045)),v3.add(c,v3.mul(dir,.085))],[side],t=>.03*Math.sin(Math.PI*Math.min(t*1.1+.05,1))+.004,1,.2);}
 return B.done();}
const treeG=genTree(3),treeLod=genTree(5);
const yellowT=[[-15,-19,15],[-22,-38,13],[26,-58,12],[-12,-98,10],[18,-112,9],[46,-72,10]],greenT=[[7,-41,12.5],[-3,-62,9],[34,-48,10]];
function trees(list,mat){const a=new Float32Array(list.length*8);list.forEach(([x,z,s],i)=>a.set([x,0,z,s,rnd()*TAU,(rnd()-.5)*.1,rnd()*TAU,rnd()],i*8));
 eng.addFoliage({geom:treeG,lod:treeLod,instances:a,cell:24,farFrac:1,shadow:true,mat});}
trees(yellowT,{stem:[.07,.06,.05],leaf:[.66,.52,.07],leaf2:[.82,.56,.1],leafRough:.5,trans:1.3});
trees(greenT,{stem:[.07,.06,.05],leaf:[.3,.4,.08],leaf2:[.5,.5,.1],leafRough:.5,trans:1.2});

/* ---------- the window: dark wall posts either side, a little sill ---------- */
const CAM=[.35,13.2,13.4];
const post={a:[.06,.058,.055],m:0,r:.95,mode:'rock'};
add(genBox(.5,3.2,.35),[CAM[0]-.86,CAM[1]-.2,CAM[2]-.62],post);
add(genBox(.5,3.2,.35),[CAM[0]+.9,CAM[1]-.2,CAM[2]-.62],post);

/* ---------- the tsunami wall: a curved sheet, leaning over at the crest ---------- */
const WX=160,WY=36;
const wallG=(()=>{const vb=new Float32Array((WX+1)*(WY+1)*8),ib=[];for(let i=0;i<WX;i++)for(let j=0;j<WY;j++){const a=i*(WY+1)+j,b=a+WY+1;ib.push(a,b,a+1,a+1,b,b+1);}return {vb,ib:new Uint32Array(ib)};})();
const wallM=eng.addMesh(wallG);
const wall=eng.addObject({m:wallM,p:[0,0,0],s:1,rot:[0,0,0],castShadow:false,mat:{a:[0,0,0],m:0,r:.4,mode:'tsuwall',modelA:120,modelB:0}});
const zW=t=>-330+9*t;                       /* wall position */
const hW=t=>95+60*ease(t/16);                /* wall height */
function wallUpdate(t){const vb=wallG.vb,H=hW(t),z0=zW(t);
 for(let i=0;i<=WX;i++){const x=(i/WX-.5)*1900,curve=.00018*x*x+22*Math.sin(x*.004+1)+9*Math.sin(x*.013);
  for(let j=0;j<=WY;j++){const f=j/WY,o=(i*(WY+1)+j)*8;
   const lean=H*(.06*f+.16*Math.pow(ease((f-.55)/.45),2))+6*Math.sin(x*.02+t*.6)*f*f;   /* face tilts toward us, crest overhangs */
   const y=-6+f*(H+6)+(f>.92?Math.sin(x*.05+t*2.)*2.5:0);
   vb[o]=x;vb[o+1]=y;vb[o+2]=z0+curve+lean;
   const dz=H*(.06+.32*ease((f-.55)/.45)*Math.max(f-.55,0)/.45);const nl=Math.hypot(dz,H)||1;vb[o+3]=0;vb[o+4]=-dz/nl;vb[o+5]=H/nl;
   vb[o+6]=x+900;vb[o+7]=f*H;}}
 eng.updateMesh(wallM,vb);wall.mat.modelA=H;}

/* ---------- the flood: a camera-facing grid, fine near the window, coarse toward the wall ---------- */
const FX=110,fxs=[];for(let i=0;i<=FX;i++)fxs.push((i/FX-.5)*150);
const fzs=[];for(let z=14;z>-700;)  {fzs.push(z);z-=.9+Math.max(0,-z-25)*.018;}
const FZ=fzs.length-1;
const floodG=(()=>{const vb=new Float32Array((FX+1)*(FZ+1)*8),ib=[];for(let j=0;j<FZ;j++)for(let i=0;i<FX;i++){const a=j*(FX+1)+i,b=a+FX+1;ib.push(a,a+1,b,a+1,b+1,b);}   /* counter-clockwise seen from above */return {vb,ib:new Uint32Array(ib)};})();
const floodM=eng.addMesh(floodG);
const flood=eng.addObject({m:floodM,p:[0,0,0],s:1,rot:[0,0,0],castShadow:false,mat:{a:[0,0,0],m:0,r:.2,mode:'flood',modelA:7}});
const zF=t=>t<5?zW(t)+20:Math.min(zW(5)+20+(t-5)*(30+3.2*(t-5)),40);   /* bore front: breaks out at 5 s, reaches the car park ~12 s */
const dMax=t=>3.2+3.2*ease((t-9)/10);
function floodLevel(x,z,t){
 const zf=zF(t),behind=zf-z;if(behind<-2)return -1;
 const D=dMax(t)*(1+.25*Math.exp(-Math.abs(x)*.02));
 let y=D*ease(behind/22)+1.8*Math.exp(-Math.pow((behind-7)/5,2))*ease((t-5)/2);   /* deep behind, a rolling bore at the front */
 const k=z-t*7.5;
 y+=(.55*Math.sin(k*.21+x*.06)+.35*Math.sin(k*.47-x*.11+1.3)+.22*Math.sin(k*.93+x*.27+2.)+.12*Math.sin(x*.7+t*3.1))*Math.min(1,D/3)*ease(behind/14);
 return y;}
const fH=new Float32Array((FX+1)*(FZ+1));
function floodUpdate(t){const vb=floodG.vb,zf=zF(t);
 for(let j=0;j<=FZ;j++){const z=fzs[j];for(let i=0;i<=FX;i++){const x=fxs[i],k=j*(FX+1)+i;let y=floodLevel(x,z,t);fH[k]=y<.05?-.6:y;}}
 for(let j=0;j<=FZ;j++){const z=fzs[j];for(let i=0;i<=FX;i++){const k=j*(FX+1)+i,o=k*8,x=fxs[i];
  const hl=fH[j*(FX+1)+Math.max(i-1,0)],hr=fH[j*(FX+1)+Math.min(i+1,FX)],hu=fH[Math.max(j-1,0)*(FX+1)+i],hd=fH[Math.min(j+1,FZ)*(FX+1)+i];
  const dx=fxs[Math.min(i+1,FX)]-fxs[Math.max(i-1,0)],dz=fzs[Math.max(j-1,0)]-fzs[Math.min(j+1,FZ)];
  let nx=-(hr-hl)/dx,nz=(hu-hd)/dz,ny=1;const l=Math.hypot(nx,ny,nz);
  const behind=zf-z,front=Math.exp(-Math.pow((behind-5)/12,2)),steep=Math.min(1,Math.hypot(nx,nz)*1.6);
  vb[o]=x;vb[o+1]=fH[k];vb[o+2]=z;vb[o+3]=nx/l;vb[o+4]=ny/l;vb[o+5]=nz/l;
  vb[o+6]=clamp(.32+front*.9+steep*.9,0,1);vb[o+7]=clamp(.5+steep,0,1);}}
 eng.updateMesh(floodM,vb);}

/* ---------- spray and mist: torn off the crest, boiling at the bore ---------- */
const crestSpray=[];for(let k=0;k<7;k++)crestSpray.push(eng.addEmitter({kind:'smoke',pos:[0,0,0],count:160,vel:[0,6,14],life:7,spread:[130,10,14],size:22,gravity:-1.5,turbulence:.5,growth:2.2,color:[.78,.8,.82],alpha:.32,soft:.9,windFollow:.5}));
const boreMist=[eng.addEmitter({kind:'smoke',pos:[0,0,0],count:220,vel:[0,2.5,6],life:4,spread:[45,1.5,8],size:5,gravity:-.4,turbulence:.6,growth:1.8,color:[.75,.72,.66],alpha:.28,soft:.9}),
 eng.addEmitter({kind:'sparks',pos:[0,0,0],count:500,vel:[0,4,7],life:1.6,spread:[40,1,6],size:.05,gravity:9,turbulence:.3,color:[.85,.84,.8],alpha:1,stretch:.06})];

/* ---------- debris swept by the flood ---------- */
const debris=[];
for(let k=0;k<26;k++){const big=k<8,g=big?genBox(2.2+rnd()*2,.25,.5+rnd()*.6):genBox(.5+rnd()*1.2,.12+rnd()*.3,.3+rnd()*.5);
 const o=eng.addObject({m:eng.addMesh(g),p:[0,-50,0],s:1,rot:[0,0,0],castShadow:false,mat:{a:[.18+rnd()*.12,.13+rnd()*.08,.09],m:0,r:.8,wet:1}});
 debris.push({o,x:(rnd()-.5)*40,z0:-40-rnd()*260,ph:rnd()*TAU,sp:.75+rnd()*.4});}

/* ---------- simulation ---------- */
function vehiclesUpdate(t,dt){
 for(const v of vehicles){
  if(t<.05){v.state=0;v.x=v.x0;v.z=v.z0;v.y=0;v.yaw=v.yaw0;v.vx=0;v.vz=0;v.spin=0;}
  if(v.x===undefined){v.x=v.x0;v.z=v.z0;v.yaw=v.yaw0;}
  const lv=floodLevel(v.x,v.z,t),depth=lv;
  if(v.state===0&&depth>v.draft){v.state=1;v.spin=(rnd()-.5)*.8;v.vx=(rnd()-.5)*1.5;}
  let roll=0,pitch=0;
  if(v.state===1){const flow=6+3*Math.min(1,(t-12)/6);v.vz+=(flow-v.vz)*Math.min(1,dt*.8);v.vx*=1-dt*.3;
   v.x+=v.vx*dt;v.z=Math.min(v.z+v.vz*dt,40);v.yaw+=v.spin*dt;v.y+=(Math.max(lv-v.draft,0)-v.y)*Math.min(1,dt*3);
   roll=.18*Math.sin(t*1.7+v.ph);pitch=.12*Math.sin(t*1.3+v.ph*2);}
  for(const p of v.parts){p.p=[v.x,v.y,v.z];p.rot=[pitch,v.yaw,roll];}}}
function debrisUpdate(t){for(const d of debris){const z=d.z0+(t-5)*9*d.sp,lv=floodLevel(d.x,z,t);
 if(lv<.2||z>40){d.o.p=[0,-50,0];continue;}d.o.p=[d.x+2*Math.sin(t*.7+d.ph),lv+.05,z];d.o.rot=[.3*Math.sin(t*1.9+d.ph),t*.6+d.ph,.3*Math.sin(t*1.4+d.ph)];}}
function fxUpdate(t){const H=hW(t),z0=zW(t);
 crestSpray.forEach((e,k)=>{const x=(k-3)*170;e.pos=[x,H*.97,z0+.00018*x*x+H*.2];e.vel=[0,6,10+8*ease((t-8)/8)];});
 const zf=zF(t),on=t>5&&zf<38;boreMist.forEach(e=>{e.on=on;e.pos=[0,Math.max(floodLevel(0,zf-6,t),0)+1,zf-6];});}

/* ---------- camera: nervous handheld behind the glass ---------- */
eng.setPost({tone:'agx',look:[1.05,.92],saturation:.88,curve:.18,bloom:.04,threshold:1.2,grain:.05,chromatic:.006,vignette:.45,flare:0,dirt:0,
 dofMaxCoC:Q.get('dof')==='0'?0:5,lut:'cool',lutStrength:.3,motionBlur:.4,contactShadows:.8});
eng.setPane({on:Q.get('pane')==='0'?0:1,drops:.45,dirt:.45,haze:.06});
cam.fov=46*DEG;cam.fstop=4;cam.shutterAngle=180;
const hand=new Handheld({intensity:1,sway:.016,breath:.008,tremor:.0016,roll:.006,bob:.02});
const LOOP=26;let T=+(Q.get('t')||0);
function shot(t){
 const aimWall=[-8,30,-300],aimStreet=[-2,3,-70],aimRiver=[0,.5,-24];
 let a=aimWall;
 if(t>10.5)a=v3.add(v3.mul(aimWall,1-ease((t-10.5)/4.5)),v3.mul(aimStreet,ease((t-10.5)/4.5)));
 if(t>15.5)a=v3.add(v3.mul(aimStreet,1-ease((t-15.5)/4)),v3.mul(aimRiver,ease((t-15.5)/4)));
 hand.intensity=1+1.6*ease((t-9)/5)+.8*Math.max(0,Math.sin(t*9))*ease((t-11)/3)*.3;
 hand.update(1/60,cam,CAM,a);
 cam.focusTarget=t<11?[-2,14,-90]:[0,2,-40];}
function step(dt){T+=dt;if(T>=LOOP)T-=LOOP;const t=T;
 wallUpdate(t);floodUpdate(t);vehiclesUpdate(t,dt);debrisUpdate(t);fxUpdate(t);shot(t);
 if(Q.has('cam')){const c=Q.get('cam').split(',').map(Number);cam.pos=c.slice(0,3);cam.target=c.slice(3,6);cam.roll=0;}   /* debug: fixed camera */
 const fade=ease(t/1.2)*(1-ease((t-24.6)/1.4));eng.setPost({exposure:Math.max(fade*.62,.001)});}
if(Q.has('t')){const t0=+Q.get('t');T=0;for(let k=0;k<t0*30;k++){T+=1/30;vehiclesUpdate(T,1/30);}T=t0;}
eng.start(dt=>step(dt));

/* ---------- HUD ---------- */
$('top').textContent='';$('bMode').textContent='Restart';$('bMode').onclick=()=>{T=0;};
$('bTime').textContent='Pause';let paused=false;$('bTime').onclick=()=>{paused=!paused;eng.pause(paused);$('bTime').textContent=paused?'Play':'Pause';};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').onclick=()=>{$('bSnd').textContent=eng.audio.toggle()?'Sound on':'Sound off';};
if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
eng.frozen=Q.has('freeze');window.__eng=eng;
})();
