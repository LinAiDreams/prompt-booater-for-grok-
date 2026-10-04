/* Cosmos Reliquary - cinematic b-roll. A cube of living nebula in a glass case on a plinth, under a night sky.
   48 s loop, six shots cut by the shot director; at 24 s the lid lifts and the cube releases its stars.
   Built on the Apex engine (v5 cinema camera). Query: ?shot=1..6 &t=seconds-into-film &q=0|1|2 &freeze=1 */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),onError:fail,onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},900);}});
if(!eng)return;
const cam=eng.camera;

/* ---------- night: dark meadow, stars, a faint violet aurora ---------- */
const grid=buildGrid((x,z)=>.02+.5*sstep(40,260,Math.hypot(x,z))*fbm2(x*.01,z*.01,3));
eng.setTerrain(grid,{mode:'meadow',skirt:true,water:false,lush:[.02,.035,.015],dry:[.04,.04,.03]});
eng.setGround({albedo:[.05,.05,.07]});
eng.setSky({stars:1,aurora:.35,moon:true,moonEl:18,moonOffset:-40,moonlight:.35});
eng.setClouds({coverage:.15});
eng.setFog({density:.004,falloff:.08,rayleigh:.2,mie:.4,g:.7});
eng.setPost({exposure:+(Q.get('exp')||.025),tone:'agx',look:[1.1,1.25],saturation:1.18,bloom:.045,threshold:1.3,knee:.6,grain:.03,chromatic:.01,vignette:.55,flare:0,dirt:.03,dofMaxCoC:7,lut:'teal-orange',lutStrength:.25,contactShadows:.6});

/* ---------- the set ---------- */
const PH=1.0;                                   /* plinth height (m) */
const ink=[.018,.018,.024];
/* black polished stone floor disc */
eng.addObject({m:eng.addMesh(genPlaneGrid(22,6)),p:[0,.035,0],s:1,rot:[0,0,0],mat:{a:ink,m:0,r:.22,clearcoat:1,clearcoatRough:.04}});
/* plinth: warm plaster with a softly bevelled top */
eng.addObject({m:eng.addMesh(genRoundedBox(1.15,PH,1.15,.025,4)),p:[0,PH/2+.035,0],s:1,rot:[0,0,0],mat:{a:[.62,.57,.52],m:0,r:.62,edgeWear:.3}});
const TOP=PH+.035;
/* bronze tray */
eng.addObject({m:eng.addMesh(genRoundedBox(.72,.07,.72,.01,3)),p:[0,TOP+.035,0],s:1,rot:[0,0,0],mat:{a:[.16,.10,.05],m:.85,r:.42,edgeWear:.5,wearColor:[.75,.5,.25]}});
const TRAY=TOP+.07;
/* the nebula cube */
const CX=[.19,.235,.19];
const cube={m:eng.addMesh(genBox(CX[0]*2,CX[1]*2,CX[2]*2)),p:[0,TRAY+CX[1]+.002,0],s:1,rot:[0,.12,0],
 mat:{a:[0,0,0],m:0,r:.04,transparent:'nebula',writeDepth:true,extents:CX,glow:[1,1,1],intensity:2.6,density:1.3,stars:34,order:0}};
eng.addObject(cube);
/* glass case walls + lid (thin panes drawn over the cube), black lid frame */
const CW=[.34,.28,.34];
eng.addObject({m:eng.addMesh(genBox(CW[0]*2,CW[1]*2,CW[2]*2)),p:[0,TRAY+CW[1],0],s:1,rot:[0,0,0],castShadow:false,
 mat:{a:[1,1,1],m:0,r:.02,transparent:'pane',extents:CW,glow:[1.6,1.1,1.9],intensity:1,alpha:.035,order:1}});
const lidY0=TRAY+CW[1]*2+.03;
const frame={m:eng.addMesh(genRoundedBox(.76,.045,.76,.008,3)),p:[0,lidY0,0],s:1,rot:[0,0,0],mat:{a:ink,m:.2,r:.35,clearcoat:.6}};
const LG=[.37,.028,.37];
const lid={m:eng.addMesh(genBox(LG[0]*2,LG[1]*2,LG[2]*2)),p:[0,lidY0+.05,0],s:1,rot:[0,0,0],castShadow:false,
 mat:{a:[1,1,1],m:0,r:.02,transparent:'pane',extents:LG,glow:[2.2,1.4,2.6],intensity:1.4,alpha:.05,order:2}};
eng.addObject(frame);eng.addObject(lid);

/* ---------- light: the cube is the key ---------- */
const Lv=eng.addLight({type:'sphere',radius:.15,pos:[0,TRAY+CX[1],0],color:[.62,.36,1],intensity:5,range:5});
const Lg=eng.addLight({type:'point',pos:[0,TRAY+.04,.12],color:[1,.55,.16],intensity:2.6,range:1.6});
const Lrim=eng.addLight({type:'spot',pos:[.6,2.6,-1.6],dir:v3.norm([-.6,-1.5,1.6]),angle:.45,inner:.25,color:[.45,.6,1],intensity:30,range:6});
const Lfill=eng.addLight({type:'spot',pos:[0,2.3,2.2],dir:v3.norm([0,-1.2,-2.2]),angle:.5,inner:.3,color:[1,.72,.5],intensity:9,range:5});

/* star motes drifting inside the case, and the release plume (off until the lid lifts) */
const motes=[eng.addEmitter({kind:'sparks',pos:[0,TRAY+.26,0],count:70,vel:[0,.02,0],life:7,spread:[.3,.24,.3],size:.004,gravity:0,turbulence:.06,color:[.7,.8,1],alpha:.9,stretch:0}),
 eng.addEmitter({kind:'sparks',pos:[0,TRAY+.26,0],count:40,vel:[0,.02,0],life:6,spread:[.3,.24,.3],size:.005,gravity:0,turbulence:.06,color:[1,.75,.4],alpha:.9,stretch:0})];
const plume=eng.addEmitter({kind:'sparks',pos:[0,lidY0+.03,0],count:600,vel:[0,.7,0],life:4.5,spread:[.3,.02,.3],size:.008,gravity:-.05,turbulence:.35,color:[.85,.7,1],alpha:1,stretch:.05,on:false});
const plume2=eng.addEmitter({kind:'sparks',pos:[0,lidY0+.03,0],count:260,vel:[0,.5,0],life:5,spread:[.3,.02,.3],size:.01,gravity:-.03,turbulence:.5,color:[1,.7,.35],alpha:1,stretch:.04,on:false});

/* ---------- the dream: lid lifts at 24 s, cube flares, stars rise, lid settles by 46 s ---------- */
const LOOP=48;let shocked=false;
function story(T,dt){
 const up=sstep(24,27.5,T)*(1-sstep(40,45,T)),hover=.012*Math.sin(T*1.7)*up;
 lid.p[1]=lidY0+.05+.34*up+hover;frame.p[1]=lidY0+.30*up+hover*.8;lid.rot[1]=frame.rot[1]=.35*up;
 const flare=1+1.1*up+.25*Math.exp(-Math.pow((T-25.2)/.6,2));
 cube.mat.intensity=2.6*flare*(1+.04*Math.sin(T*2.1));
 Lv.intensity=5*flare*(1+.06*Math.sin(T*2.1+1));Lg.intensity=2.6*(1+.6*up);
 plume.on=plume2.on=up>.35;plume.pos=[0,frame.p[1]+.06,0];plume2.pos=plume.pos;
 eng.setSky({aurora:.35+.5*up});
 if(T>25&&T<26&&!shocked){shocked=true;eng.addDistortion({pos:[0,lidY0+.15,0],radius:2.2,strength:.6,type:'shock',duration:2.2});}
 if(T<20)shocked=false;}

/* ---------- camera: six shots ---------- */
const C=[0,TRAY+CX[1],0];                      /* subject centre */
const lc=new LensControl(cam);
/* portrait screens: turn the gate upright and widen focal lengths so each shot keeps its framing */
const FM=()=>window.innerWidth>window.innerHeight?1:.62;
function gate(){eng.setSensor(window.innerWidth>window.innerHeight?'super35':[18.66,24.89]);}
gate();cam.fstop=2.8;cam.breathing=.5;cam.shutterAngle=180;
const lensSph={k1:-.03,k2:0,ca:.006,blades:9,bladeRotation:.2,bubble:.45,streaks:0,astig:.3};
const lensAna={k1:-.03,k2:0,ca:.01,blades:11,bladeRotation:0,bubble:.15,streaks:.45,astig:.4};
const wide=()=>window.innerWidth>window.innerHeight;
function setLens(ana){cam.lens=Object.assign({},ana?lensAna:lensSph);cam.squeeze=ana&&wide()?2:1;cam.letterbox=wide()?2.39:0;}
const ring=[];for(let i=0;i<10;i++){const a=i/10*TAU+.6;ring.push([Math.cos(a)*2.1,1.35+.25*Math.sin(a*2),Math.sin(a)*2.1]);}
const orbit=new Dolly(new DollyTrack(ring,{closed:true}),{speed:.42,accel:.4,lookAt:()=>C,bank:.2});
const crane=new Crane({base:[0,0,4.2],armLength:3.4,pivotHeight:1.2,pitch:.95,yaw:-Math.PI/2,lookAt:()=>v3.add(C,[0,.05,0]),smooth:1.4});
const hand=new Handheld({intensity:.35,sway:.6,breath:.6,tremor:.3});
const steady=new Steadicam({posSmooth:.6,aimSmooth:.35});
const ease=x=>x*x*(3-2*x);
const SHOTS=[
 {name:'I. Overture',dur:8,enter(){setLens(false);cam.focalLength=24*FM();cam.fstop=4;crane.pitch=.95;crane._s=[.95,crane.yaw];crane._v=[0,0];cam.focusTarget=C;},
  update(dt,t){crane.pitch=.95-.82*ease(Math.min(t/7,1));crane.yaw=-Math.PI/2+.35*t/8;crane.update(dt,cam);}},
 {name:'II. Glass',dur:7,enter(){setLens(false);cam.focalLength=85*FM();cam.fstop=2.8;cam.focusTarget=null;steady.p=null;},
  /* macro slide past the front glass corner: focus holds on the polished edge, then racks to the nebula behind it */
  update(dt,t){const k=t/7,corner=[CW[0],TRAY+.3,CW[2]],p=[.95-.3*k,TRAY+.33+.03*k,.62+.3*k],tg=v3.add(v3.mul(corner,.45),v3.mul(C,.55));
   steady.update(dt,cam,p,tg);if(t<.1)lc.focusTo(v3.len(v3.sub(corner,p)),.01);if(t>2.6&&t<2.7)lc.focusTo(v3.len(v3.sub(C,cam.pos))-.12,1.8);}},
 {name:'III. Orbit',dur:9,enter(){setLens(false);cam.focalLength=40*FM();cam.fstop=2.8;cam.focusTarget=C;orbit.s=0;orbit.v=.3;},update(dt){orbit.update(dt,cam);}},
 {name:'IV. Ascension',dur:9,enter(){setLens(true);cam.focalLength=35*FM();cam.fstop=2.8;cam.focusTarget=C;},
  update(dt,t){hand.update(dt,cam,[.4,1.0,1.95-.2*t/9],[0,lidY0+.15+.25*ease(Math.min(t/6,1)),0]);}},
 {name:'V. Into the nebula',dur:8,enter(){setLens(false);cam.focalLength=50*FM();cam.fstop=5.6;cam.focusTarget=null;lc.zoomTo(100*FM(),7.5,'quintic');},
  update(dt,t){const k=ease(t/8),d=1.5-.95*k,a=.12+.35;cam.pos=[Math.sin(a)*d,C[1]+.03,Math.cos(a)*d];cam.target=[0,C[1],0];cam.focusTarget=[Math.sin(a)*.19,C[1],Math.cos(a)*.19];}},
 {name:'VI. Reliquary',dur:7,enter(){setLens(false);lc.zoomTo(50*FM(),.01);cam.focalLength=50*FM();cam.fstop=2.8;cam.focusTarget=C;},
  update(dt,t){steady.update(dt,cam,[.95+.08*t/7,1.62,2.05-.1*t/7],[0,TRAY+.27,0]);}}];
const director=new ShotDirector(eng,SHOTS);
const title=$('top');
function showTitle(){title.textContent=director.shot.name;}
title.style.transition='opacity .8s';title.style.letterSpacing='.32em';title.style.textAlign='center';title.style.fontSize='11px';

/* ---------- clock ---------- */
let filmT=0,lastShot=-1;
function step(dt){filmT=(filmT+dt)%LOOP;story(filmT,dt);director.update(dt);
 if(director.i===4)cube.mat.intensity*=.5+.5*(1-sstep(1,6,director.t));   /* frame-filling push-in: ease the glow so the gas keeps its colour */
lc.update(dt);if(director.i!==lastShot){lastShot=director.i;showTitle();}
 title.style.opacity=director.t>.4&&director.t<3?'0.9':'0';}   /* shot card fades in after the cut, out after 3 s */
if(Q.has('shot')){let acc=0;for(let i=0;i<+Q.get('shot')-1;i++)acc+=SHOTS[i].dur;for(let k=0;k<acc*30;k++)step(1/30);}
if(Q.has('t')){const T=+Q.get('t');for(let k=0;k<T*30;k++)step(1/30);}
eng.start(dt=>step(dt));

/* ---------- HUD ---------- */
let paused=false;
$('bMode').textContent='Next shot';$('bMode').onclick=()=>{let acc=0;const i=(director.i+1)%SHOTS.length;for(let k=0;k<i;k++)acc+=SHOTS[k].dur;filmT=acc;director.go(i);};
$('bTime').textContent='Pause';$('bTime').onclick=()=>{paused=!paused;eng.pause(paused);$('bTime').textContent=paused?'Play':'Pause';};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').onclick=()=>{$('bSnd').textContent=eng.audio.toggle()?'Sound on':'Sound off';};
addEventListener('resize',()=>{gate();setLens(director.i===3);});
if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
eng.setTimeOfDay(-16,250,0);
if(Q.get('dof')==='0')eng.setPost({dofMaxCoC:0});if(Q.get('fx')==='0')eng.setPost({flare:0,dirt:0});if(Q.has('noaurora'))eng.setSky({aurora:0});if(Q.get('mb')==='0')cam.shutterAngle=0;
eng.frozen=Q.has('freeze');window.__eng=eng;
})();
