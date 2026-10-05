/* Wall of Water - a tsunami seen through a rain-speckled apartment window. 30 s loop, with a procedural sound score.
   0-8.5 s a black wall of water towers over the blocks while a siren wails; 8.5 s its lip throws forward and at ~11.7 s
   plunges onto the town 90 m away (white water thrown 100 m up, the window rattles); the whitewater bore races up the street,
   slams each block, lifts cars and the truck, hits the building under the window at ~14.9 s; then a roaring river of foam.
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

const LOOP=30;
/* ---------- the tsunami: one sheet whose profile runs base -> face -> lip. It towers, pitches its lip forward,
   plunges onto the blocks ~90 m from the window, then collapses into the whitewater bore ---------- */
const WX=160,WY=48,FC=.5;                       /* rows below FC*WY are the face, above it the lip */
const TB=8.5,TP=3.2,XP=-20,PEEL=.0016;          /* break start, plunge duration, where the break starts, lateral peel (s/m) */
const zW=t=>-380+15*t;                          /* wall base position */
const hW=t=>100+55*ease(t/TB);                  /* wall height while it builds */
const wcurve=x=>.00018*x*x+22*Math.sin(x*.004+1)+9*Math.sin(x*.013);
const brkT=x=>TB+Math.abs(x-XP)*PEEL;           /* when the lip starts to throw at column x */
const PY=new Float32Array(WY+1),PZ=new Float32Array(WY+1);
function profile(x,t){
 const t0=brkT(x),b=clamp((t-t0)/TP,0,1),bb=b*b*(3-2*b),c=ease((t-t0-TP)/3.5);
 const H=hW(Math.min(t,TB)),Hc=H*(1-.84*c),sink=34*ease((t-t0-TP-2.5)/3),z0=zW(t)+wcurve(x);
 const nf=Math.round(WY*FC),wob=4*Math.sin(x*.02+t*.6);
 for(let j=0;j<=nf;j++){const f=j/nf;PY[j]=-6+f*(Hc*.86+6)-sink;PZ[j]=z0+Hc*(.1*f*f+.12*bb*f*f*f)+wob*f*f;}
 /* the lip: integrate a curve whose heading turns from up to forward-down as the wave pitches, then let it fall */
 const L=Hc*(.2+.85*bb),n=WY-nf,ds=L/n,th0=.3+.6*bb,kap=.5+2.4*bb;let y=PY[nf],z=PZ[nf];
 for(let j=1;j<=n;j++){const s=(j-.5)/n,ph=th0+kap*s+.08*Math.sin(x*.05+t*2.)*s;z+=Math.sin(ph)*ds;y+=Math.cos(ph)*ds;
  const s1=j/n,drop=Hc*.5*bb*bb*s1*s1;PY[nf+j]=Math.max(y-drop,1.5-sink);PZ[nf+j]=z+drop*.25;}
 return {H:Hc,b,c};}
/* two coincident sheets with opposite winding and normals: the face/inner side and the back of the lip are both true front faces
   (the back copy carries uv.x + 10000 so the shader knows which side it is shading) */
const WN=(WX+1)*(WY+1);
const wallG=(()=>{const vb=new Float32Array(WN*2*8),ib=[];for(let i=0;i<WX;i++)for(let j=0;j<WY;j++){const a=i*(WY+1)+j,b=a+WY+1;ib.push(a,b,a+1,a+1,b,b+1);ib.push(WN+a,WN+a+1,WN+b,WN+a+1,WN+b+1,WN+b);}return {vb,ib:new Uint32Array(ib)};})();
const wallM=eng.addMesh(wallG);
const wall=eng.addObject({m:wallM,p:[0,0,0],s:1,rot:[0,0,0],castShadow:false,mat:{a:[0,0,0],m:0,r:.4,mode:'tsuwall',modelA:120,modelB:0}});
function wallUpdate(t){const vb=wallG.vb;let Hs=1;
 for(let i=0;i<=WX;i++){const x=(i/WX-.5)*1900,pr=profile(x,t);Hs=Math.max(Hs,pr.H);
  for(let j=0;j<=WY;j++){const o=(i*(WY+1)+j)*8,j0=Math.max(j-1,0),j1=Math.min(j+1,WY);
   const ty=PY[j1]-PY[j0],tz=PZ[j1]-PZ[j0],tl=Math.hypot(ty,tz)||1;
   vb[o]=x;vb[o+1]=PY[j];vb[o+2]=PZ[j];vb[o+3]=0;vb[o+4]=-tz/tl;vb[o+5]=ty/tl;
   vb[o+6]=x+900;vb[o+7]=j/WY*pr.H;
   /* back sheet sits one water-thickness behind the front: a thick lip that thins to a torn edge at the tip */
   const sl=Math.max(j/WY-FC,0)/(1-FC),thk=j/WY<FC?8:pr.H*.07*Math.pow(1-sl,.8)+.3;
   const q=o+WN*8;vb[q]=vb[o];vb[q+1]=vb[o+1]-vb[o+4]*thk;vb[q+2]=vb[o+2]-vb[o+5]*thk;vb[q+3]=0;vb[q+4]=-vb[o+4];vb[q+5]=-vb[o+5];vb[q+6]=vb[o+6]+10000;vb[q+7]=vb[o+7];}}
 eng.updateMesh(wallM,vb);const pc=profile(XP,t);wall.mat.modelA=pc.H;wall.mat.modelB=clamp(pc.b*.35+pc.c*.9,0,1);
 wall.p=[0,t>TB+TP+9?-200:0,0];}
/* where the lip lands (centre column), when */
const TI=TB+TP;profile(0,TI);const ZP=PZ[WY];
const lipAt=(x,t)=>{profile(x,t);return [x,PY[WY],PZ[WY]];};
const crestAt=(x,t)=>{profile(x,t);let k=0;for(let j=1;j<=WY;j++)if(PY[j]>PY[k])k=j;return [x,PY[k],PZ[k]];};

/* ---------- the flood: a camera-facing grid, fine near the window, coarse toward the wall ---------- */
const FX=110,fxs=[];for(let i=0;i<=FX;i++)fxs.push((i/FX-.5)*150);
const fzs=[];for(let z=14;z>-700;)  {fzs.push(z);z-=.9+Math.max(0,-z-25)*.018;}
const FZ=fzs.length-1;
const floodG=(()=>{const vb=new Float32Array((FX+1)*(FZ+1)*8),ib=[];for(let j=0;j<FZ;j++)for(let i=0;i<FX;i++){const a=j*(FX+1)+i,b=a+FX+1;ib.push(a,a+1,b,a+1,b+1,b);}   /* counter-clockwise seen from above */return {vb,ib:new Uint32Array(ib)};})();
const floodM=eng.addMesh(floodG);
const flood=eng.addObject({m:floodM,p:[0,0,0],s:1,rot:[0,0,0],castShadow:false,mat:{a:[0,0,0],m:0,r:.2,mode:'flood',modelA:7}});
/* bore front: a skirt of water at the wall's foot, then from the plunge point it races up the street (reaches the window ~15.6 s) */
const zF=t=>t<TI?zW(t)+wcurve(0)+12:Math.min(ZP+(t-TI)*(10+2*(t-TI)),40);
const TA=(()=>{let t=TI;while(zF(t)<6&&t<LOOP)t+=.01;return t;})();     /* bore hits the building under the window */
const dMax=t=>t<TI?2.5:2.5+5.5*ease((t-TI)/6);
function floodLevel(x,z,t){
 const zf=zF(t),behind=zf-z;if(behind<-2)return -1;
 const D=dMax(t)*(1+.25*Math.exp(-Math.abs(x)*.02));
 let y=D*ease(behind/22)+3.2*Math.exp(-Math.pow((behind-7)/6,2))*ease((t-TI)/1.2);   /* deep behind, a rolling bore at the front */
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


/* ---------- spray and splashes ---------- */
const crestSpray=[];for(let k=0;k<7;k++)crestSpray.push(eng.addEmitter({kind:'smoke',pos:[0,0,0],count:160,vel:[0,6,14],life:7,spread:[130,10,14],size:22,gravity:-1.5,turbulence:.5,growth:2.2,color:[.78,.8,.82],alpha:.32,soft:.9,windFollow:.5}));
/* spray streaming off the lip as it throws and falls */
const lipSpray=[];for(let k=0;k<5;k++)lipSpray.push(eng.addEmitter({kind:'smoke',pos:[0,0,0],count:220,vel:[0,3,16],life:3.2,spread:[95,4,4],size:6,gravity:6,turbulence:.5,growth:1.6,color:[.88,.9,.9],alpha:.2,soft:2,on:false}));
const boreMist=[eng.addEmitter({kind:'smoke',pos:[0,0,0],count:220,vel:[0,3.5,6],life:4,spread:[45,1.5,8],size:6,gravity:-.4,turbulence:.6,growth:1.8,color:[.78,.76,.7],alpha:.22,soft:.9}),
 eng.addEmitter({kind:'sparks',pos:[0,0,0],count:500,vel:[0,5,7],life:1.6,spread:[40,1,6],size:.05,gravity:9,turbulence:.3,color:[.85,.84,.8],alpha:1,stretch:.06})];
/* one-shot bursts (engine 'burst' emitters: every particle born once inside the spawn window) */
const bursts=[];
function burst(tFire,pos,o){const e=eng.addEmitter(Object.assign({on:false,burst:[0,1]},o,{pos}));bursts.push({e,t:tFire,win:o.win||1,span:(o.life||6)+(o.win||1)});return e;}
/* the plunge: a wall of white water thrown 100 m up along the impact line, at three points along the peeling break */
for(const dx of [-320,0,320]){const x=XP+dx,ti=brkT(x)+TP,p=lipAt(x,ti);p[1]=6;
 burst(ti-.15,p,{kind:'smoke',count:320,vel:[0,44,12],life:6.5,spread:[170,8,14],size:15,gravity:10,turbulence:.7,growth:2.2,color:[.9,.92,.92],alpha:.3,soft:3,win:1.4});
 burst(ti-.1,p,{kind:'smoke',count:260,vel:[0,16,22],life:9,spread:[190,14,10],size:34,gravity:.6,turbulence:.6,growth:2.4,color:[.8,.82,.83],alpha:.09,soft:3,win:2.5});
 burst(ti-.1,[p[0],p[1],p[2]],{kind:'sparks',count:1800,vel:[0,40,18],life:5,spread:[170,4,10],size:.3,gravity:9.8,turbulence:.2,color:[.8,.82,.84],alpha:.4,stretch:.05,win:1.2});}
/* lingering mist over the impact zone */
const impactMist=eng.addEmitter({kind:'smoke',pos:[XP,15,ZP-20],count:240,vel:[0,2.5,7],life:11,spread:[320,14,40],size:30,gravity:-.1,turbulence:.6,growth:1.6,color:[.78,.79,.8],alpha:.08,soft:3,on:false});
/* the bore slamming into each block between the impact and the window: spray climbs the facade */
const hits=[];for(const b of blocks){const zf=b.z+b.d/2;if(zf<ZP+4||zf>0)continue;let t=TI;while(zF(t)<zf&&t<LOOP)t+=.02;
 hits.push({t,pos:[b.x,1,zf+1],b});burst(t,[b.x,1,zf+1.5],{kind:'smoke',count:260,vel:[0,24,3],life:5,spread:[b.w*.5,1,1.5],size:7,gravity:7,turbulence:.6,growth:2.2,color:[.82,.8,.76],alpha:.55,soft:1.5,win:.8});}
/* ... and into the building under the window: a curtain of spray rises past the glass */
burst(TA-.05,[0,1,9],{kind:'smoke',count:420,vel:[0,27,2.5],life:5,spread:[42,1,1.2],size:6,gravity:8,turbulence:.7,growth:2.4,color:[.84,.82,.78],alpha:.26,soft:1,win:.9});
burst(TA,[0,1,9],{kind:'sparks',count:1400,vel:[0,26,5],life:3,spread:[40,1,1],size:.08,gravity:9.8,turbulence:.3,color:[.86,.85,.82],alpha:.5,stretch:.05,win:.9});

/* ---------- debris swept by the flood ---------- */
const debris=[];
for(let k=0;k<26;k++){const big=k<8,g=big?genBox(2.2+rnd()*2,.25,.5+rnd()*.6):genBox(.5+rnd()*1.2,.12+rnd()*.3,.3+rnd()*.5);
 const o=eng.addObject({m:eng.addMesh(g),p:[0,-50,0],s:1,rot:[0,0,0],castShadow:false,mat:{a:[.18+rnd()*.12,.13+rnd()*.08,.09],m:0,r:.8,wet:1}});
 debris.push({o,x:(rnd()-.5)*40,z0:ZP-10-rnd()*60,ph:rnd()*TAU,sp:.75+rnd()*.4});}

/* ---------- simulation ---------- */
const lifted=[];   /* vehicles lifted this frame (the score turns them into crunches) */
function vehiclesUpdate(t,dt){
 for(const v of vehicles){
  if(t<.05){v.state=0;v.x=v.x0;v.z=v.z0;v.y=0;v.yaw=v.yaw0;v.vx=0;v.vz=0;v.spin=0;}
  if(v.x===undefined){v.x=v.x0;v.z=v.z0;v.yaw=v.yaw0;}
  const lv=floodLevel(v.x,v.z,t),depth=lv;
  if(v.state===0&&depth>v.draft){v.state=1;v.spin=(rnd()-.5)*.8;v.vx=(rnd()-.5)*1.5;v.vz=4;lifted.push(v);}
  let roll=0,pitch=0;
  if(v.state===1){const flow=6+4*Math.min(1,(t-TI)/5);v.vz+=(flow-v.vz)*Math.min(1,dt*.8);v.vx*=1-dt*.3;
   v.x+=v.vx*dt;v.z=Math.min(v.z+v.vz*dt,40);v.yaw+=v.spin*dt;v.y+=(Math.max(lv-v.draft,0)-v.y)*Math.min(1,dt*3);
   roll=.18*Math.sin(t*1.7+v.ph);pitch=.12*Math.sin(t*1.3+v.ph*2);}
  for(const p of v.parts){p.p=[v.x,v.y,v.z];p.rot=[pitch,v.yaw,roll];}}}
function debrisUpdate(t){for(const d of debris){const z=d.z0+(t-TI)*11*d.sp,lv=floodLevel(d.x,z,t);
 if(t<TI||lv<.2||z>40){d.o.p=[0,-50,0];continue;}d.o.p=[d.x+2*Math.sin(t*.7+d.ph),lv+.05,z];d.o.rot=[.3*Math.sin(t*1.9+d.ph),t*.6+d.ph,.3*Math.sin(t*1.4+d.ph)];}}
function fxUpdate(t){
 lipSpray.forEach((e,k)=>{const x=XP+(k-2)*190,b=clamp((t-brkT(x))/TP,0,1);e.on=b>.25&&b<.98;if(e.on){e.pos=lipAt(x,t);e.vel=[0,2-8*b,10+10*b];}});
 crestSpray.forEach((e,k)=>{const x=(k-3)*170,c=crestAt(x,t),b=clamp((t-brkT(x))/TP,0,1);e.on=b<.95;e.pos=c;e.vel=[0,6+10*b,10+8*ease((t-6)/6)+16*b];});
 const zf=zF(t),on=t>TI&&zf<38;boreMist.forEach(e=>{e.on=on;e.pos=[0,Math.max(floodLevel(0,zf-6,t),0)+1,zf-6];});
 impactMist.on=t>TI-.2;
 for(const b of bursts){const age=t-b.t;b.e.on=age>-.05&&age<b.span;b.e.burst=[eng.time-age,b.win];}
 if(Q.get('fx')==='0'){crestSpray.concat(lipSpray,boreMist,bursts.map(b=>b.e),[impactMist]).forEach(e=>{e.on=false;});}   /* debug: no particles */
 eng.setPane({drops:.45+.5*ease((t-TA-.3)/1.2)*(1-ease((t-27)/2.5)),dirt:.45,haze:.06+.05*ease((t-TA)/1)*(1-ease((t-24)/4))});}

/*SCORE-BEGIN*/
/* ---------- sound: every layer is placed in the world and driven by the same timeline as the picture.
   Continuous beds are noise voices whose loudness is set by moving them along their bearing (inverse-distance law);
   one-shots fire on the frame their event happens, delayed by the sound's travel time to the window ---------- */
function makeScore(A,eng,S){
 const SR=()=>(A.ctx&&A.ctx.sampleRate)||48000,cp=()=>eng.camera.pos;
 const travel=p=>Math.round(v3.len(v3.sub(p,cp()))/343*SR());
 const at=(p,o)=>Object.assign({pos:p,delay:travel(p)},o);
 const beds={};let lastT=-1,live=false;
 /* bed voice placed REF/g metres from the listener along `dir`: g = loudness 0..1 */
 const REF=10;
 function bedPos(dir,g){const c=cp(),d=v3.norm(dir),r=REF/Math.max(g,.004);return [c[0]+d[0]*r,c[1]+d[1]*r,c[2]+d[2]*r];}
 function startBeds(t){const left=Math.max(LOOP-t,.2);
  beds.rumble=A.play(5,{pos:bedPos([0,0,-1],.01),gain:1.5,ref:REF,dur:left,send:.15,p:[0,0,1,1,130,16,0,0,0]});
  beds.roar=A.play(5,{pos:bedPos([0,0,-1],.01),gain:1.1,ref:REF,dur:left,send:.3,p:[0,0,1,1,1500,220,0,0,0]});
  beds.hiss=A.play(5,{pos:bedPos([0,0,-1],.01),gain:.45,ref:REF,dur:left,send:.35,p:[0,0,1,.8,9000,2600,0,0,0]});
  beds.wash=A.play(6,{pos:bedPos([0,-1,-1],.01),gain:1.3,ref:REF,dur:left,send:.2,p:[520,55,.4,2,5200]});
  beds.gurgle=A.play(6,{pos:bedPos([.4,-1,-1],.01),gain:1.4,ref:REF,dur:left,send:.25,p:[300,90,.25,2,900]});}
 const ev=[];const on=(t,f)=>ev.push({t,f});
 /* civil-defence siren, two-tone, from across the town: rises and falls until the power goes at the break */
 for(let k=0;k<4;k++){const t0=.4+k*2.2,up=k%2===0;
  for(const r of [1,1.26])on(t0,()=>A.play(5,{pos:[-480,60,-260],gain:.45,ref:200,dur:2.25,send:.85,p:up?[430*r,780*r,1.9,0,1,1,0,0,0]:[780*r,430*r,1.9,0,1,1,0,0,0]}));}
 on(.4+4*2.2,()=>A.play(5,{pos:[-480,60,-260],gain:.45,ref:200,dur:1.6,send:.9,p:[430,180,1.5,0,1,1,0,1.4,0]}));   /* winds down */
 /* the wall groans: deep thunderous swells from the face */
 for(const t of [3.2,6.1])on(t,()=>{const p=crestAt(-10,t);A.sfx.thunder(p,600);});
 /* the lip throws: a huge rising band-swept whoosh */
 on(TB,()=>{const p=crestAt(XP,TB);A.play(5,{pos:p,gain:1.2,ref:120,dur:TP+.3,send:.5,p:[0,0,TP,1,180,1600,0,0,1]});});
 /* the plunge along the peeling impact line: boom, thunder, splash, buildings struck, glass everywhere */
 for(const dx of [0,-320,320]){const x=XP+dx,ti=brkT(x)+TP,main=dx===0;
  on(ti,()=>{const p=lipAt(x,ti);p[1]=8;
   A.play(5,at(p,{gain:main?1.4:.9,ref:60,dur:4.5,send:.55,p:[70,22,1.4,1.3,700,18,.55,1.6,0]}));
   A.play(5,at(p,{gain:main?1:.6,ref:60,dur:6,send:.75,p:[0,0,1,1.2,2600,180,.42,0,0]}));
   A.sfx.thunder(p,250);
   if(main)for(let k=0;k<5;k++)A.play(3,at([p[0]+(k-2)*25,10,p[2]],{gain:1,ref:40,freq:70+k*14,send:.4,p:[2,1.1,1.3]}));});}
 /* the shock wave reaches the window: it rattles in its frame */
 const rattle=(t0,n,s)=>{for(let k=0;k<n;k++)on(t0+k*.045+Math.sin(k*7.1)*.012,()=>{const c=cp();A.sfx.impact('glass',[c[0]+.4*Math.sin(k*3.3),c[1]-.3,c[2]-.6],s*(1-k/n*.6),.7);});};
 const shockT=TI+Math.abs(ZP-13)/343;rattle(shockT,9,.4);
 /* windows shattering in the struck blocks, scattered over a second and a half */
 for(let k=0;k<14;k++){const tk=TI+.25+k*.1+Math.sin(k*12.9)*.05;on(tk,()=>{const x=XP+(Math.sin(k*4.7))*80,p=[x,4+Math.abs(Math.sin(k*2.1))*24,ZP+8+Math.sin(k*1.3)*10];A.sfx.impact('glass',at(p,{}).pos,.7+.5*Math.abs(Math.sin(k)),.25+.4*Math.abs(Math.sin(k*3.)));});}
 /* car alarms set off by the shock, until the water drowns them */
 for(const [x,z,f0,f1,per] of [[-3,-36,1180,760,.24],[8,-24,930,1400,.16],[-14,-3,2200,1600,.11]]){
  const t0=TI+.6+Math.abs(z)*.004;let t1=TI;while(zF(t1)<z&&t1<LOOP)t1+=.02;
  for(let t=t0,k=0;t<t1;t+=per,k++){const f=k%2?f1:f0;on(t,()=>A.play(1,{pos:[x,1,z],gain:.16,ref:6,dur:per*.92,freq:f,send:.4,p:[1,f*2.5,.2,0,.1,.003,.02,0]}));}}
 /* the bore hits each block on its way up the street */
 for(const h of S.hits)on(h.t,()=>{A.play(5,at(h.pos,{gain:1,ref:25,dur:2.2,send:.45,p:[90,30,.7,1.2,1400,40,1.4,2.2,0]}));A.sfx.splash(h.pos,3);A.sfx.impact('stone',h.pos,1,18);});
 /* ... and the building under the window: a slam, the pane cracks under the spray */
 on(TA,()=>{const p=[0,2,9];A.play(5,{pos:p,gain:1.5,ref:12,dur:3,send:.4,p:[60,24,.9,1.4,1100,20,1.1,2,0]});A.sfx.splash(p,4);A.sfx.splash([-12,3,8],3);A.sfx.splash([14,3,8],3);});
 rattle(TA+.03,12,.75);
 on(TA+.35,()=>{const c=cp();A.sfx.impact('glass',[c[0]+.3,c[1]+.2,c[2]-.62],1.2,1.4);});
 ev.sort((a,b)=>a.t-b.t);
 /* bed levels from the picture: wall distance and height, break, bore distance, depth at the window */
 function levels(t){const c=cp(),cr=crestAt(-10,t),dW=v3.len(v3.sub(cr,c)),pre=ease(t/1.5);
  const build=clamp(160/dW,0,1)*ease(t/TB),hit=Math.exp(-Math.max(t-TI,0)*.35)*(t>TI?1:0);
  const zf=zF(t),bp=[0,3,Math.min(zf,6)],dB=v3.len(v3.sub(bp,c)),bore=t>TI?clamp(30/dB,0,1):0;
  const river=ease((t-TA+.3)/1.2),out=1-ease((t-(LOOP-1.6))/1.5);
  return {rumble:[cr,pre*out*Math.min(1,.05+.75*build*build+.6*hit+.35*bore)],
   roar:[t<TI?cr:bp,pre*out*Math.min(1,.05+.45*build*build+.9*hit+.6*bore+.5*river)],
   hiss:[t<TI?cr:bp,pre*out*Math.min(1,.04+.3*clamp((t-TB)/TP,0,1)+.7*hit+.4*bore+.3*river)],
   wash:[[0,-1,-1],out*.9*river],gurgle:[[.5,-1,-1.2],out*river]};}
 function update(t){
  if(!A.ready||!A.on){live=false;lastT=t;return;}
  if(!live||t<lastT-.5){A.allOff();for(const k in beds)delete beds[k];startBeds(t);live=true;lastT=t;}
  for(const e of ev)if(e.t>lastT&&e.t<=t)e.f();
  for(const v of S.lifted.splice(0)){const p=[v.x,1,v.z],s=v.draft>1?1.2:.7;A.sfx.impact('metal',p,s,v.draft>1?9:3.5);A.sfx.splash(p,v.draft>1?2.5:1.4);}
  if(t>TA&&Math.floor(t*1.6)!==Math.floor(lastT*1.6)){const fl=S.vehicles.filter(v=>v.state===1&&v.z>-40);if(fl.length){const v=fl[Math.floor((t*7.3)%fl.length)];A.sfx.impact(Math.sin(t*5)>0?'metal':'wood',[v.x,v.y+1,v.z],.35+.3*Math.abs(Math.sin(t)),2+Math.abs(Math.sin(t*3))*3);}}
  const L=levels(t),c=cp();
  for(const k in beds){const [ref,g]=L[k];const dir=ref.length===3&&Math.abs(ref[0])+Math.abs(ref[2])>5?v3.sub(ref,c):ref;A.move(beds[k],bedPos(dir,g));}
  A.ambience({wind:Math.min(1,.3+.5*ease(t/TB)+.2*ease((t-TI)/2)),gust:.8,rain:.55,room:.35});
  lastT=t;}
 return {update,levels};}
/*SCORE-END*/
const audio=createAudio(eng,{music:false,volume:.95,reverb:{size:1,t60:2.6,damp:.45,wet:.24}});
const score=makeScore(audio,eng,{hits,lifted,vehicles});

/* ---------- camera: nervous handheld behind the glass, eyes pulled up the wall, down to the impact, then the street ---------- */
eng.setPost({tone:'agx',look:[1.05,.92],saturation:.88,curve:.18,bloom:.04,threshold:1.2,grain:.05,chromatic:.006,vignette:.45,flare:0,dirt:0,
 dofMaxCoC:Q.get('dof')==='0'?0:5,lut:'cool',lutStrength:.3,motionBlur:.4,contactShadows:.8});
eng.setPane({on:Q.get('pane')==='0'?0:1,drops:.45,dirt:.45,haze:.06});
cam.fov=54*DEG;cam.fstop=4;cam.shutterAngle=180;
const hand=new Handheld({intensity:1,sway:.016,breath:.008,tremor:.0016,roll:.006,bob:.02});
let T=+(Q.get('t')||0),aimS=null;
function aimAt(t){const c=CAM;
 /* look up the wall: keep the crest in the top fifth of the frame */
 const cr=crestAt(-10,t),d=Math.hypot(cr[2]-c[2],cr[0]-c[0]),el=Math.max(Math.atan2(cr[1]-c[1],d)-12*DEG,1.5*DEG);
 const wallAim=[-8,c[1]+Math.tan(el)*100,c[2]-100];
 /* the lip coming over: follow it down to where it lands */
 const lp=crestAt(XP,Math.min(t,TI)),ld=Math.hypot(lp[2]-c[2],lp[0]-c[0]),lel=Math.max(Math.atan2(lp[1]-c[1],ld)-13*DEG,4*DEG);
 const lipAim=[XP*.4,c[1]+Math.tan(lel)*100,c[2]-100];
 const zf=Math.min(zF(t),-8),streetAim=[-1,1,zf-6],riverAim=[0,.5,-22];
 let a=v3.add(v3.mul(wallAim,1-ease((t-TB-.6)/2)),v3.mul(lipAim,ease((t-TB-.6)/2)));
 a=v3.add(v3.mul(a,1-ease((t-TI-.6)/1.6)),v3.mul(v3.add(v3.mul(lipAim,.4),v3.mul(streetAim,.6)),ease((t-TI-.6)/1.6)));
 a=v3.add(v3.mul(a,1-ease((t-TA+.6)/2.5)),v3.mul(riverAim,ease((t-TA+.6)/2.5)));
 return a;}
const jolts=[[TI+Math.abs(ZP-13)/343,.010,4],[TA,.022,3]];
function shot(t,dt){
 const a=aimAt(t);if(!aimS||dt<=0)aimS=a.slice();else{const k=1-Math.exp(-dt*3);aimS=v3.add(aimS,v3.mul(v3.sub(a,aimS),k));}
 hand.intensity=1+1.4*ease((t-6)/5)+1.2*ease((t-TA)/1)*(1-ease((t-TA-6)/6)*.5);
 hand.update(Math.max(dt,1/60),cam,CAM,aimS);
 let jy=0,jx=0;for(const [tj,A,k] of jolts){const s=t-tj;if(s>0&&s<2.5){const e=A*Math.exp(-s*k);jy+=e*Math.sin(s*31);jx+=e*.6*Math.sin(s*23+1);}}
 const dl=v3.len(v3.sub(cam.target,cam.pos));cam.target=[cam.target[0]+jx*dl,cam.target[1]+jy*dl,cam.target[2]];cam.pos=[cam.pos[0],cam.pos[1]+jy*.3,cam.pos[2]];
 cam.focusTarget=t<TI+1?[-2,14,-90]:[0,2,-40];}
function step(dt){const prev=T;T+=dt;if(T>=LOOP)T-=LOOP;const t=T;if(t<prev)aimS=null;
 wallUpdate(t);floodUpdate(t);vehiclesUpdate(t,dt);debrisUpdate(t);fxUpdate(t);shot(t,t<prev?0:dt);score.update(t);
 if(Q.has('cam')){const c=Q.get('cam').split(',').map(Number);cam.pos=c.slice(0,3);cam.target=c.slice(3,6);cam.roll=0;}   /* debug: fixed camera */
 const fade=ease(t/1.2)*(1-ease((t-(LOOP-1.4))/1.4));eng.setPost({exposure:Math.max(fade*.62,.001)});}
if(Q.has('t')){const t0=+Q.get('t');T=0;for(let k=0;k<t0*30;k++){T+=1/30;vehiclesUpdate(T,1/30);}lifted.length=0;T=t0;}
if(Q.get('clouds')==='0')eng.setClouds({coverage:0,shadows:0});if(Q.get('fog')==='0')eng.setFog({density:0});if(Q.get('rain')==='0')eng.setWeather({rain:0,wetness:0});   /* debug */
eng.start(dt=>step(dt));

/* ---------- HUD ---------- */
$('top').textContent='';$('bMode').textContent='Restart';$('bMode').onclick=()=>{T=0;aimS=null;};
$('bTime').textContent='Pause';let paused=false;$('bTime').onclick=()=>{paused=!paused;eng.pause(paused);$('bTime').textContent=paused?'Play':'Pause';};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').textContent='Sound off';$('bSnd').onclick=()=>{const was=audio.started;audio.toggle();setTimeout(()=>{$('bSnd').textContent=audio.on?'Sound on':(was?'Sound off':'Starting...');},was?0:60);if(!was){const iv=setInterval(()=>{if(audio.on){$('bSnd').textContent='Sound on';clearInterval(iv);}},200);}};
if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
eng.frozen=Q.has('freeze');window.__eng=eng;
})();
