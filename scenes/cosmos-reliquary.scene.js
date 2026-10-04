/* Cosmos Reliquary - cinematic b-roll. A cube of living nebula in a glass case on a plinth, under a night sky.
   60 s loop in five scenes (see 'the dream' below); the escaped nebula becomes a colossus over the land.
   Built on the Apex engine (v5 cinema camera). Query: ?t=seconds-into-film (0-60) &q=0|1|2 &freeze=1 */
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
eng.setPost({tone:'agx',look:[1.1,1.25],saturation:1.18,bloom:.045,threshold:1.3,knee:.6,grain:.03,chromatic:.01,vignette:.55,flare:0,dirt:.03,dofMaxCoC:7,lut:'teal-orange',lutStrength:.25,contactShadows:.6});

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

/* ---------- the dream (60 s loop) ----------
   I    0-14  DARK      one long push out of blackness; the cube breathes, heartbeats grow
   II  14-22  PULSE     macro slide past the glass edge, rack focus into the gas          (flash cut on a heartbeat)
   III 22-38  RELEASE   one unbroken drone move: lid lifts, a beam fires, we rise with the stars
                        and the escaped nebula assembles into a colossal cube over the land  (flash cut on a heartbeat)
   IV  38-46  ECHO      match cut: giant cube -> tiny cube at the same size and angle on screen;
                        the giant dissolves, stardust snows down, the lid closes
   V   46-60  RELIQUARY slow orbit, fade to black, loops into I */
const LOOP=60,EXP0=+(Q.get('exp')||.025);
const G=[0,64,-66],GX=[28,34,28];                /* the colossus: centre and half extents (m) */
const giant={m:eng.addMesh(genBox(GX[0]*2,GX[1]*2,GX[2]*2)),p:G.slice(),s:.001,rot:[0,.12,0],castShadow:false,
 mat:{a:[0,0,0],m:0,r:.04,transparent:'nebula',writeDepth:true,extents:GX,glow:[1,1,1],intensity:0,density:1.3,stars:.9,order:0}};
eng.addObject(giant);
const Lgi=eng.addLight({type:'point',pos:G,color:[.55,.32,1],intensity:0,range:170});
const beam=eng.addRibbon({points:[],width:.02,color:[.75,.55,1],intensity:0,taper:false});
const dust=eng.addEmitter({kind:'snow',pos:[0,TRAY+1.6,0],count:500,vel:[0,-.12,0],life:9,spread:[1.6,.4,1.6],size:.006,gravity:.02,turbulence:.25,color:[1,.82,.6],alpha:.9,on:false});
const gauss=(x,w)=>Math.exp(-x*x/(w*w));
const BEATS=[4,7.5,10.4,12.5,14,18,20.2,22];      /* heartbeats; the ones at 14 and 22 carry the cuts */
let shocked=false,beamSet=false;
function story(T,dt){
 /* heartbeat: a sharp pulse that grows through act I; on a cut beat the frame flashes so the cut lands inside the light */
 let beat=0,cutFlash=0;for(const b of BEATS){const k=b<14?.35+.65*b/14:1;beat=Math.max(beat,k*gauss(T-b,.16)+.45*k*gauss(T-b-.32,.12));}
 cutFlash=gauss(T-14,.11)+gauss(T-22,.11);
 const up=sstep(23,25.5,T)*(1-sstep(40,45,T)),hover=.012*Math.sin(T*1.7)*up;
 lid.p[1]=lidY0+.05+.34*up+hover;frame.p[1]=lidY0+.30*up+hover*.8;lid.rot[1]=frame.rot[1]=.35*up;
 const form=sstep(28.5,34,T)*(1-sstep(39,45,T));        /* the colossus assembles, then dissolves after the match cut */
 const base=T<14?.25+.75*sstep(0,13,T):1;
 const flare=base*(1+.9*up+1.6*beat+5*cutFlash+.6*gauss(T-24.2,.5));
 cube.mat.intensity=2.6*flare*(1+.04*Math.sin(T*2.1));
 Lv.intensity=5*flare;Lg.intensity=2.6*base*(1+.6*up+beat);Lrim.intensity=30*base;Lfill.intensity=9*base;
 plume.on=plume2.on=T>24&&T<36;plume.pos=[0,frame.p[1]+.06,0];plume2.pos=plume.pos;
 /* the colossus: overshoot-free ease, slow turn, fades as the stardust falls */
 giant.s=Math.max(.001,form*(1+.03*Math.sin(T*.7)));giant.rot[1]=.12+T*.01;
 giant.mat.intensity=2.4*form*(1+.35*gauss(T-34,1.2));Lgi.intensity=900*form;
 /* the beam: fires at 26, reaches the sky as the colossus forms, thins out by 37 */
 const bOn=sstep(25.8,26.6,T)*(1-sstep(34,37.5,T));
 if(!beamSet||bOn>0){const top=lidY0+.15+(G[1]-lidY0)*sstep(25.8,29,T),pts=[];for(let k=0;k<=24;k++){const u=k/24;pts.push([G[0]*u*u,lidY0+.12+(top-lidY0-.12)*u,G[2]*u*u]);}beam.update(pts);beamSet=true;}
 beam.intensity=14*bOn*(1+.4*Math.sin(T*23)*Math.sin(T*7));beam.width=.012+.05*bOn;
 dust.on=T>38.5&&T<50;
 {const au=Math.round((.3+.55*up+.4*form)*25)/25;if(au!==story.au){story.au=au;eng.setSky({aurora:au});}}   /* setSky rebuilds the env: only on change */
 if(T>24&&T<25&&!shocked){shocked=true;eng.addDistortion({pos:[0,lidY0+.15,0],radius:2.4,strength:.6,type:'shock',duration:2.2});}
 if(T<20)shocked=false;
 /* exposure: fade in from black, flash on cut beats, fade to black before the loop */
 const fade=sstep(0,3.2,T)*(1-sstep(57,60,T));
 eng.setPost({exposure:EXP0*fade*(1+2.2*cutFlash+.25*beat)});}

/* ---------- camera ---------- */
const C=[0,TRAY+CX[1],0];
const lc=new LensControl(cam);
const FM=()=>window.innerWidth>window.innerHeight?1:.62;
function gate(){eng.setSensor(window.innerWidth>window.innerHeight?'super35':[18.66,24.89]);}
gate();cam.fstop=2.8;cam.breathing=.5;cam.shutterAngle=180;
const wide=()=>window.innerWidth>window.innerHeight;
cam.lens={k1:-.03,k2:0,ca:.007,blades:9,bladeRotation:.2,bubble:.35,streaks:.25,astig:.3};
function frameFmt(){cam.squeeze=1;cam.letterbox=wide()?2.39:0;}frameFmt();
const ring=[];for(let i=0;i<10;i++){const a=i/10*TAU+1.1;ring.push([Math.cos(a)*2.2,1.45+.2*Math.sin(a*2),Math.sin(a)*2.2]);}
const orbit=new Dolly(new DollyTrack(ring,{closed:true}),{speed:.38,accel:.3,lookAt:()=>C,bank:.15});
const steady=new Steadicam({posSmooth:.6,aimSmooth:.35});
const hand=new Handheld({intensity:.12,sway:.5,breath:.6,tremor:.15});
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const cr=(a,b,c,d,t)=>{const t2=t*t,t3=t2*t;return a.map((_,i)=>.5*((2*b[i])+(-a[i]+c[i])*t+(2*a[i]-5*b[i]+4*c[i]-d[i])*t2+(-a[i]+3*b[i]-3*c[i]+d[i])*t3));};
function path(keys,t){let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const k0=keys[Math.max(i-1,0)],k1=keys[i],k2=keys[i+1],k3=keys[Math.min(i+2,keys.length-1)];
 const u=ease((t-k1[0])/(k2[0]-k1[0]));return [cr(k0[1],k1[1],k2[1],k3[1],u),cr(k0[2],k1[2],k2[2],k3[2],u)];}
/* drone flight for act III: [time, position, aim] */
const P_END=[40,52,22];
const FLIGHT=[[0,[.85,TRAY+.36,1.25],[0,lidY0+.2,0]],[4,[1.5,2.4,3.1],[0,3.2,-1]],[8.5,[7,8,19],[0,26,-36]],[12.5,[18,30,10],[0,50,-62]],[16,P_END,G]];
const DS=v3.norm(v3.sub(P_END,G)),MATCH=v3.len(v3.sub(P_END,G))*(CX[1]/GX[1]);
const SHOTS=[
 {name:'I',dur:14,enter(){cam.focalLength=55*FM();cam.fstop=2;cam.focusTarget=C;steady.p=null;},
  update(dt,t){const k=ease(t/14);steady.update(dt,cam,[.25+.3*k,1.22+.12*k,6.6-4.8*k],[0,C[1]+.02,0]);}},
 {name:'II',dur:8,enter(){cam.focalLength=85*FM();cam.fstop=2.8;cam.focusTarget=null;steady.p=null;},
  update(dt,t){const k=t/8,corner=[CW[0],TRAY+.3,CW[2]],p=[.95-.3*k,TRAY+.33+.03*k,.62+.3*k],tg=v3.add(v3.mul(corner,.45),v3.mul(C,.55));
   steady.update(dt,cam,p,tg);if(t<.1)lc.focusTo(v3.len(v3.sub(corner,p)),.01);if(t>2.4&&t<2.5)lc.focusTo(v3.len(v3.sub(C,cam.pos))-.12,1.8);}},
 {name:'III',dur:16,enter(){cam.focalLength=24*FM();cam.fstop=4;cam.focusTarget=null;},
  update(dt,t){const [p,a]=path(FLIGHT,t);hand.update(dt,cam,p,a);cam.focusTarget=t<5?[0,lidY0+.2,0]:a;}},
 {name:'IV',dur:8,enter(){cam.focalLength=24*FM();cam.fstop=4;cam.focusTarget=C;lc.zoomTo(38*FM(),7.5,'quintic');},
  /* starts as the exact miniature of III's last frame: same lens, same direction, distance scaled by cube size */
  update(dt,t){const d=MATCH+(2.3-MATCH)*ease(t/8);cam.pos=v3.add(C,v3.mul(DS,d));cam.pos[1]=Math.max(cam.pos[1],TRAY+.05);cam.target=C.slice();}},
 {name:'V',dur:14,enter(){lc.zoomTo(40*FM(),.01);cam.focalLength=40*FM();cam.fstop=2.8;cam.focusTarget=C;orbit.s=0;orbit.v=.25;},update(dt){orbit.update(dt,cam);}}];
const director=new ShotDirector(eng,SHOTS);
const title=$('top');title.textContent='COSMOS RELIQUARY';
title.style.cssText+=';transition:opacity 1.2s;letter-spacing:.5em;text-align:center;font-size:12px;top:42%;opacity:0';

/* ---------- clock ---------- */
let filmT=0;
function step(dt){filmT+=dt;if(filmT>=LOOP){filmT-=LOOP;director.go(0);}
 story(filmT,dt);director.update(dt);lc.update(dt);
 title.style.opacity=filmT>2.5&&filmT<7.5?'0.85':'0';}
if(Q.has('t')){const T=+Q.get('t');for(let k=0;k<T*30;k++)step(1/30);}
eng.start(dt=>step(dt));

/* ---------- HUD ---------- */
let paused=false;
const STARTS=[0,14,22,38,46];
$('bMode').textContent='Next scene';$('bMode').onclick=()=>{const i=(director.i+1)%SHOTS.length;filmT=STARTS[i];director.go(i);};
$('bTime').textContent='Pause';$('bTime').onclick=()=>{paused=!paused;eng.pause(paused);$('bTime').textContent=paused?'Play':'Pause';};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').onclick=()=>{$('bSnd').textContent=eng.audio.toggle()?'Sound on':'Sound off';};
addEventListener('resize',()=>{gate();frameFmt();});
if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
eng.setTimeOfDay(-16,250,0);
if(Q.get('dof')==='0')eng.setPost({dofMaxCoC:0});if(Q.get('fx')==='0')eng.setPost({flare:0,dirt:0});if(Q.has('noaurora'))eng.setSky({aurora:0});if(Q.get('mb')==='0')cam.shutterAngle=0;
eng.frozen=Q.has('freeze');window.__eng=eng;
})();
