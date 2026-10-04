/* Thresholds - a dream in three places joined by seamless transitions (74 s loop).
   I   SEA      0-22  storm sea, a row of bronze monoliths; we fly into the dark mirror face of the nearest   -> black
   II  PORTAL  22-48  out of the black: a carved ring in the void, a dawn forest inside, a waterfall of light
                      pouring into a black sea; we fall with it, rise, and fly through the ring              -> white
   III FIELD   48-74  the white is cloud inside a doorway on a night wheat field; a woman in black watches;
                      we pass her shoulder into the doorway's clouds ... which are the sky of I              -> loop
   Built on the Apex engine (v5). Query: ?t=seconds (0-74) &q=0|1|2 &freeze=1 */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),onError:fail,onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},900);}});
if(!eng)return;
const cam=eng.camera;
let seed=31;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const yawFor=(dx,dz)=>{let best=0,bd=-9;for(let a=0;a<TAU;a+=.002){const M=m4.model(0,0,0,0,a,0,1),d=M[8]*dx+M[10]*dz;if(d>bd){bd=d;best=a;}}return best;};   /* yaw that turns local +z to (dx,dz) */

/* ---------- one world: open sea to the west, a wheat plain to the east ---------- */
const DOOR=[250,0,0];
const terr=(x,z)=>{const land=sstep(95,150,x);return -9+(9+3+.7*(fbm2(x*.01,z*.01,3)-.5))*land+3.2*Math.exp(-((x-DOOR[0])**2+(z-DOOR[2])**2)/(45*45))*land;};
const grid=buildGrid(terr);
eng.setTerrain(grid,{mode:'island',skirt:true,water:false});
DOOR[1]=gridH(grid,DOOR[0],DOOR[2]);

/* ---------- the sea: camera-centred polar grid, Gerstner waves on the CPU ---------- */
const NR=90,NA=128,R0=.6,R1=2600;
const seaG=(()=>{const n=(NR+1)*(NA+1),vb=new Float32Array(n*8),ib=new Uint16Array(NR*NA*6);let q=0;
 for(let i=0;i<NR;i++)for(let j=0;j<NA;j++){const a=i*(NA+1)+j,b=a+NA+1;ib[q++]=a;ib[q++]=a+1;ib[q++]=b;ib[q++]=a+1;ib[q++]=b+1;ib[q++]=b;   /* counter-clockwise seen from above */}return {vb,ib};})();
const RAD=[];for(let i=0;i<=NR;i++)RAD.push(i===0?0:R0*Math.exp(i*Math.log(R1/R0)/NR));
const CS=[],SN=[];for(let j=0;j<=NA;j++){CS.push(Math.cos(j/NA*TAU));SN.push(Math.sin(j/NA*TAU));}
/* waves: wavelength, amplitude, direction (rad), steepness */
const STORM=[[64,1.5,.25,.75],[37,1.0,-.35,.8],[21,.62,.75,.85],[12,.34,-.95,.85],[7,.17,.35,.8],[3.6,.07,-.6,.7],[2,.03,1.2,.6]];
const W=STORM.map(([L,A,a,Qs])=>{const k=TAU/L;return {k,A,dx:Math.cos(a),dz:Math.sin(a),w:Math.sqrt(9.81*k),Q:Qs/(k*A*STORM.length),L};});
let seaAmp=1,seaFoam=1;
function seaUpdate(t,cx,cz){
 const vb=seaG.vb;
 for(let i=0;i<=NR;i++){const r=RAD[i];
  for(let j=0;j<=NA;j++){const x0=cx+r*CS[j],z0=cz+r*SN[j];let x=x0,y=0,z=z0,nx=0,ny=1,nz=0,jc=0;
   for(const wv of W){const fade=1-sstep(wv.L*14,wv.L*40,r);if(fade<=0)continue;const A=wv.A*seaAmp*fade,th=wv.k*(wv.dx*x0+wv.dz*z0)-wv.w*t,c=Math.cos(th),s=Math.sin(th),QA=wv.Q*A;
    x+=QA*wv.dx*c;z+=QA*wv.dz*c;y+=A*s;nx-=wv.dx*wv.k*A*c;nz-=wv.dz*wv.k*A*c;ny-=wv.Q*wv.k*A*s;jc+=wv.Q*wv.k*A*s;}
   const l=Math.hypot(nx,ny,nz),o=(i*(NA+1)+j)*8;
   vb[o]=x;vb[o+1]=y;vb[o+2]=z;vb[o+3]=nx/l;vb[o+4]=ny/l;vb[o+5]=nz/l;vb[o+6]=sstep(.35,.85,jc)*seaFoam;vb[o+7]=clamp(y/(3*seaAmp+.01)*.5+.5,0,1);}}
 eng.updateMesh(seaM,vb);}
const seaM=eng.addMesh(seaG);
const sea=eng.addObject({m:seaM,p:[0,0,0],s:1,rot:[0,0,0],castShadow:false,mat:{a:[.008,.03,.034],m:1,r:.55,mode:'sea'}});

/* ---------- I. monoliths in the storm ---------- */
const P1=[-40,0,-40],RD=v3.norm([-.82,0,-.57]),PR=[-RD[2],0,RD[0]];      /* first pillar, row direction, its right-hand side */
const CA=v3.add(v3.add(P1,v3.mul(RD,-78)),v3.mul(PR,-22));CA[1]=4.5;    /* camera start: off the row's left flank */
const faceN=v3.norm([CA[0]-P1[0],0,CA[2]-P1[2]]);
const pillarYaw=yawFor(faceN[0],faceN[2]);
const bronze={a:[.6,.4,.24],m:1,r:.17,mode:'polished',edgeWear:.25,wearColor:[.85,.6,.4]};
[[0,64],[46,47],[96,38],[150,31],[208,26],[272,22],[342,19]].forEach(([d,h],i)=>{
 const p=v3.add(P1,v3.mul(RD,d));eng.addObject({m:eng.addMesh(genRoundedBox(5.2,h+14,5.2,.06,3)),p:[p[0],h/2-7,p[2]],s:1,rot:[0,pillarYaw+(i?(rnd()-.5)*.1:0),0],mat:bronze});});

/* ---------- II. the ring portal ---------- */
const RC=[-170,27,230],RR=7.2;
function genRing(R,w,th){const NU=240,NV=28,vb=[],ib=[];
 for(let i=0;i<=NU;i++){const u=i/NU*TAU,cu=Math.cos(u),su=Math.sin(u);
  for(let j=0;j<=NV;j++){const v=j/NV*TAU,cv=Math.cos(v),sv=Math.sin(v),sx=Math.sign(cv)*Math.pow(Math.abs(cv),.55),sy=Math.sign(sv)*Math.pow(Math.abs(sv),.55);
   /* carved relief on both faces: petal rosettes + concentric grooves */
   const face=Math.pow(Math.abs(sv),3),pet=Math.pow(Math.abs(Math.sin(u*24)),3)*Math.pow(Math.abs(Math.sin((cv*.5+.5)*Math.PI*2.5)),2),groove=.5+.5*Math.cos(cv*14);
   const rel=face*(.11*pet+.035*groove)+.02*Math.sin(u*96)*face;
   const rr=R+sx*w*.5,z=sy*th*.5*(1+rel*2.2);vb.push(cu*rr,su*rr,z,0,0,0,i/NU,j/NV);}}
 for(let i=0;i<NU;i++)for(let j=0;j<NV;j++){const a=i*(NV+1)+j,b=a+NV+1;ib.push(a,b,a+1,a+1,b,b+1);}
 return weldNormals({vb:new Float32Array(vb),ib:new Uint16Array(ib)});}
const ring=eng.addObject({m:eng.addMesh(genRing(RR,2.1,1.1)),p:RC.slice(),s:1,rot:[0,0,0],castShadow:false,
 mat:{a:[.58,.47,.42],m:.55,r:.36,edgeWear:.5,wearColor:[1,.8,.7],clearcoat:.25}});
function genDisc(r,n){const vb=[0,0,0,0,0,1,.5,.5],ib=[];for(let j=0;j<=n;j++){const a=j/n*TAU;vb.push(Math.cos(a)*r,Math.sin(a)*r,0,0,0,1,0,0);}for(let j=0;j<n;j++)ib.push(0,j+1,j+2);return {vb:new Float32Array(vb),ib:new Uint16Array(ib)};}
const vista=eng.addObject({m:eng.addMesh(genDisc(RR-.55,96)),p:RC.slice(),s:1,rot:[0,0,0],castShadow:false,
 mat:{a:[0,0,0],m:0,r:0,transparent:'vista',writeDepth:true,extents:[RR-.55,RR-.55,1],world:0,intensity:.55,order:0}});
const Lin=eng.addLight({type:'point',pos:[RC[0],RC[1],RC[2]+1.2],color:[1,.62,.72],intensity:0,range:30});
const Lrim2=eng.addLight({type:'point',pos:[RC[0]-6,RC[1]+9,RC[2]+5],color:[1,.55,.3],intensity:0,range:22});
const Lfall=eng.addLight({type:'point',pos:[RC[0],1.2,RC[2]+1.5],color:[.5,.6,1],intensity:0,range:18});
/* waterfall of light: falling sparks + shimmering strands from the bottom of the opening down to the sea */
const lip=[RC[0],RC[1]-RR+.75,RC[2]+.2];
const falls=[eng.addEmitter({kind:'sparks',pos:lip,count:1600,vel:[0,-1.2,.5],life:3.4,spread:[1.15,.05,.12],size:.035,gravity:2.6,turbulence:.15,color:[1,.78,.9],alpha:1,stretch:.12,on:false}),
 eng.addEmitter({kind:'sparks',pos:lip,count:700,vel:[0,-1.5,.4],life:3.2,spread:[.7,.05,.1],size:.05,gravity:2.4,turbulence:.1,color:[.75,.8,1],alpha:1,stretch:.18,on:false}),
 eng.addEmitter({kind:'sparks',pos:[RC[0],.3,RC[2]+1],count:500,vel:[0,1.2,0],life:1.4,spread:[1.6,.1,1.2],size:.03,gravity:1.2,turbulence:.6,color:[.7,.8,1],alpha:.9,on:false})];
const strands=[];for(let k=0;k<16;k++){const x=(k/15-.5)*2.1+(rnd()-.5)*.12;strands.push({x,ph:rnd()*TAU,r:eng.addRibbon({points:[],width:.012+.03*rnd(),color:k%3?[1,.72,.88]:[.78,.82,1],intensity:0,taper:false})});}
function strandUpdate(t,on){for(const s of strands){const pts=[];for(let i=0;i<=20;i++){const u=i/20,y=lip[1]+(.25-lip[1])*u;
  pts.push([lip[0]+s.x*(1+.18*u)+.05*Math.sin(t*1.3+s.ph+u*6),y,lip[2]+.9*u*u]);}
 s.r.update(pts);s.r.intensity=on*(3+2*Math.sin(t*9+s.ph))*(.6+.4*Math.sin(t*2.1+s.ph*2));}}

/* ---------- III. the field, the doorway, the woman ---------- */
const DN=[-1,0,0];                                   /* doorway faces west, toward where we come from */
const DH=4.8,DW=2.4,DC=[DOOR[0],DOOR[1]+DH/2,DOOR[2]];
const doorG={vb:new Float32Array([-DW/2,-DH/2,0,0,0,1,0,0, DW/2,-DH/2,0,0,0,1,1,0, DW/2,DH/2,0,0,0,1,1,1, -DW/2,DH/2,0,0,0,1,0,1]),ib:new Uint16Array([0,1,2,0,2,3])};
const door=eng.addObject({m:eng.addMesh(doorG),p:DC.slice(),s:1,rot:[0,yawFor(DN[0],DN[2]),0],castShadow:false,
 mat:{a:[0,0,0],m:0,r:0,transparent:'vista',writeDepth:true,extents:[DW/2,DH/2,1],world:1,intensity:.5,order:0}});
const Ldoor=eng.addLight({type:'point',pos:v3.add(DC,v3.mul(DN,1.5)),color:[.7,.85,1],intensity:0,range:16});
const Lkey=eng.addLight({type:'spot',pos:v3.add(DOOR,[-34,7,-16]),dir:v3.norm([34,-6.5,16]),angle:.55,inner:.3,color:[1,.6,.32],intensity:0,range:70});
/* the woman: lathe silhouette (dress, waist, shoulders), head and long hair; she faces the doorway */
function lathe(prof,n,sx){const vb=[],ib=[];for(let i=0;i<prof.length;i++){const [r,y]=prof[i];for(let j=0;j<=n;j++){const a=j/n*TAU;vb.push(Math.cos(a)*r*sx,y,Math.sin(a)*r,0,0,0,j/n,i/(prof.length-1));}}
 for(let i=0;i<prof.length-1;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;ib.push(a,a+1,b,a+1,b+1,b);}return weldNormals({vb:new Float32Array(vb),ib:new Uint16Array(ib)});}
const WP=v3.add(DOOR,[-6.5,0,-1.4]);WP[1]=gridH(grid,WP[0],WP[2]);
const herYaw=yawFor(DOOR[0]-WP[0],DOOR[2]-WP[2]);
const body=lathe([[0,0],[.40,0],[.37,.25],[.31,.6],[.22,.95],[.15,1.07],[.17,1.22],[.19,1.36],[.17,1.43],[.06,1.47],[.05,1.52],[0,1.53]],28,.78);
const fabric={a:[.018,.015,.02],m:0,r:.72,sheen:.7,sheenColor:[.35,.3,.4],sheenRough:.5};
eng.addObject({m:eng.addMesh(body),p:[WP[0],WP[1]-.02,WP[2]],s:1,rot:[0,herYaw,0],mat:fabric});
const headP=v3.add(WP,[0,1.62,0]);
eng.addObject({m:eng.addMesh(genSphere(.095,24,16)),p:headP,s:1,rot:[0,herYaw,0],mat:{a:[.42,.3,.25],m:0,r:.5,mode:'skin',modelA:10}});
const back=[-Math.sin(herYaw)*.0,0,0];
eng.addObject({m:eng.addMesh(lathe([[0,-.5],[.07,-.45],[.11,-.2],[.12,0],[.11,.1],[0,.13]],18,.8)),p:v3.add(headP,[0,0,0]),s:1,rot:[0,herYaw,-.04],
 mat:{a:[.025,.016,.012],m:0,r:.45,sheen:.4,sheenColor:[.5,.35,.25]}});
/* wheat: dense golden clumps over the plain around the doorway */
{const n=52000,a=new Float32Array(n*8);let m=0;
 for(let i=0;i<n*3&&m<n;i++){const r=Math.sqrt(rnd())*85,an=rnd()*TAU,x=DOOR[0]-20+Math.cos(an)*r,z=DOOR[2]+Math.sin(an)*r;
  if(Math.hypot(x-DOOR[0],z-DOOR[2])<1.6||Math.hypot(x-WP[0],z-WP[2])<.5)continue;
  a.set([x,gridH(grid,x,z)-.03,z,1.3+.9*rnd(),rnd()*TAU,(rnd()-.5)*.3,rnd()*TAU,rnd()],m*8);m++;}
 eng.addFoliage({geom:genGrassClump(12,4,4),lod:genGrassClump(5,4,3),instances:a.subarray(0,m*8),cell:12,farFrac:.3,
  mat:{stem:[.45,.28,.1],leaf:[.62,.4,.14],leaf2:[.78,.55,.22],leafRough:.6,trans:.6}});}

/* ---------- star dome (night places only) ---------- */
const dome=eng.addObject({m:eng.addMesh(genSphere(1,48,32)),p:[0,0,0],s:2400,rot:[0,0,0],castShadow:false,
 mat:{a:[0,0,0],m:0,r:0,transparent:'starfield',extents:[1,1,1],intensity:0,order:-1}});
/* ---------- look per place (switched only while the frame is black, white or cloud) ---------- */
const LOOK={
 sea:{tod:[17,yawToAz(RD,-35)],clouds:.78,fog:{density:.0032,falloff:.02,rayleigh:.5,mie:.6,g:.75},sky:{moon:false,stars:0,aurora:0},exp:1,amp:1,foam:1,rip:.55},
 portal:{tod:[-20,200],clouds:0,fog:{density:.0006,falloff:.05,rayleigh:.1,mie:.2,g:.7},sky:{moon:false,stars:1,aurora:0},exp:.085,amp:.07,foam:0,rip:.2},
 field:{tod:[-20,200],clouds:0,fog:{density:.0009,falloff:.04,rayleigh:.2,mie:.3,g:.7},sky:{moon:false,stars:1,aurora:0},exp:.085,amp:.07,foam:0,rip:.2}};
function yawToAz(d,off){return Math.atan2(d[2],d[0])/DEG+off;}
let place='';
function setPlace(p){if(p===place)return;place=p;const L=LOOK[p];
 eng.setTimeOfDay(L.tod[0],L.tod[1],0);eng.setClouds({coverage:L.clouds});eng.setFog(L.fog);eng.setSky(L.sky);
 seaAmp=L.amp;seaFoam=L.foam;sea.mat.r=L.rip;
 const P=p==='portal',F=p==='field';
 falls.forEach(e=>e.on=P);Lin.on=Lrim2.on=Lfall.on=P;Ldoor.on=Lkey.on=F;
 eng.cut();}
eng.setPost({tone:'agx',look:[1.08,1.15],saturation:1.06,bloom:.06,threshold:1.1,knee:.6,grain:.035,chromatic:.008,vignette:.5,flare:0,dirt:0,dofMaxCoC:3.5,lut:'film',lutStrength:.35});
cam.lens={k1:-.02,k2:0,ca:.005,blades:9,bladeRotation:.2,bubble:.3,streaks:0,astig:.25};
const FM=()=>window.innerWidth>window.innerHeight?1:.62;
function gate(){eng.setSensor(window.innerWidth>window.innerHeight?'super35':[18.66,24.89]);cam.letterbox=window.innerWidth>window.innerHeight?2.39:0;}
gate();cam.breathing=.4;cam.shutterAngle=180;

/* ---------- camera paths: [time, position, aim] with centripetal-ish Catmull-Rom between keys ---------- */
const cr=(a,b,c,d,t)=>{const t2=t*t,t3=t2*t;return a.map((_,i)=>.5*((2*b[i])+(-a[i]+c[i])*t+(2*a[i]-5*b[i]+4*c[i]-d[i])*t2+(-a[i]+3*b[i]-3*c[i]+d[i])*t3));};
function path(keys,t){let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const k0=keys[Math.max(i-1,0)],k1=keys[i],k2=keys[i+1],k3=keys[Math.min(i+2,keys.length-1)];
 const u=clamp((t-k1[0])/(k2[0]-k1[0]),0,1);return [cr(k0[1],k1[1],k2[1],k3[1],u),cr(k0[2],k1[2],k2[2],k3[2],u)];}
const at=(b,v)=>v3.add(b,v);
const P1top=[P1[0],10,P1[2]],face=v3.add(P1,v3.mul(faceN,2.6+.7));face[1]=8;
const ROW=at(P1,v3.mul(RD,95));ROW[1]=14;
const SEA_PATH=[[0,CA,at(CA,[RD[0]*30,55,RD[2]*30])],[4.5,at(CA,v3.mul(RD,6)),ROW],[11,at(v3.add(CA,v3.mul(RD,26)),v3.mul(PR,4)),at(ROW,[0,-2,0])],
 [17,v3.add(v3.add(P1,v3.mul(faceN,22)),[0,7,0]),[P1[0],9,P1[2]]],[22,face,[P1[0],8,P1[2]]]];
SEA_PATH.forEach(k=>{k[1]=k[1].slice();k[1][1]=Math.max(k[1][1],3.4);});
const PORTAL_PATH=[[22,at(RC,[4.6,-3.4,1.6]),at(RC,[4.2,-4,0])],[28.5,at(RC,[1,-2,34]),RC],[34,at(RC,[7,-19,25]),[RC[0],2,RC[2]+1]],
 [40,at(RC,[-2,-3,24]),RC],[48,at(RC,[0,0,.3]),at(RC,[0,0,-5])]];
const DCn=(d,y)=>{const p=v3.add(DC,v3.mul(DN,d));if(y!==undefined)p[1]=y;return p;};
const g=(x,z)=>gridH(grid,x,z);
const FIELD_PATH=[[48,DCn(.45),DCn(-4)],[56,(p=>{p[1]=g(p[0],p[2])+1.6;return p;})(DCn(23)),[DC[0],DC[1]+1.2,DC[2]]],
 [64,(p=>{p[1]=g(p[0],p[2])+1.55;return p;})(v3.add(DCn(13),[0,0,-7])),v3.mul(v3.add(DC,WP),.5)],
 [70,v3.add(WP,[-1.1,1.55,-.55]),v3.add(DC,[0,-.2,0])],[74,DCn(.45),DCn(-4)]];
const hand=new Handheld({intensity:.25,sway:.7,breath:.5,tremor:.2});

/* ---------- the clock ---------- */
const LOOP=74;let T=0;
function step(dt){
 T+=dt;if(T>=LOOP)T-=LOOP;
 const p=T<22?'sea':T<48?'portal':'field';setPlace(p);
 let pos,aim,lens=24,fs=4;
 if(p==='sea'){[pos,aim]=path(SEA_PATH,T);lens=T<17?28:28+20*ease((T-17)/5);fs=5.6;}
 else if(p==='portal'){[pos,aim]=path(PORTAL_PATH,T);lens=T<41?32:32-10*ease((T-41)/7);fs=4;}
 else{[pos,aim]=path(FIELD_PATH,T);lens=T<56?20+15*ease((T-48)/8):35;fs=2.8;}
 if(p==='sea'){const bob=Math.sin(T*.9)*.35+Math.sin(T*1.7)*.15;pos=pos.slice();pos[1]+=bob;hand.update(dt,cam,pos,aim);}else{cam.pos=pos;cam.target=aim;}
 cam.focalLength=lens*FM();cam.fstop=fs;cam.focusTarget=p==='field'&&T>50&&T<70?WP.map((v,i)=>i===1?v+1.4:v):aim;
 /* transitions: dark mirror -> black; ring -> white; door clouds -> sky clouds (a soft breath of exposure) */
 const L=LOOK[p];let ex=L.exp;
 if(p==='sea')ex*=(1-ease((T-19.8)/2.2))*(.8+.2*ease(T/1.2));
 if(p==='portal')ex*=ease((T-22)/1.8)*(1+9*ease((T-45.2)/2.8));
 if(p==='field')ex*=1+9*(1-ease((T-48)/1.8))-.25*ease((T-72.5)/1.5);
 eng.setPost({exposure:ex});
 /* portal life: inner glow grows as we approach, the falls shimmer */
 if(p==='portal'){const k=1+2*ease((T-41)/6);vista.mat.intensity=.55*k;Lin.intensity=95*k;Lrim2.intensity=34;Lfall.intensity=45*(1+.2*Math.sin(T*7));strandUpdate(T,1);}
 else strandUpdate(T,0);
 if(p==='field'){door.mat.intensity=.5*(1+.8*ease((T-68)/6));Ldoor.intensity=22;Lkey.intensity=160;}
 dome.p=cam.pos.slice();dome.mat.intensity=p==='sea'?0:1.4;
 seaUpdate(T,cam.pos[0],cam.pos[2]);}
if(Q.has('t')){const t0=+Q.get('t');for(let k=0;k<t0*30;k++)step(1/30);}
eng.start(dt=>step(dt));

/* ---------- HUD ---------- */
let paused=false;
$('top').textContent='';
$('bMode').textContent='Next place';$('bMode').onclick=()=>{T=T<22?22:T<48?48:0;};
$('bTime').textContent='Pause';$('bTime').onclick=()=>{paused=!paused;eng.pause(paused);$('bTime').textContent=paused?'Play':'Pause';};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').onclick=()=>{$('bSnd').textContent=eng.audio.toggle()?'Sound on':'Sound off';};
addEventListener('resize',gate);
if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
if(Q.get('dof')==='0')cam.fstop=64;
eng.frozen=Q.has('freeze');window.__eng=eng;
})();
