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
let k=0;while(k<40&&gridH(grid,pad[0]+dir[0]*k,pad[1]+dir[1]*k)>1.0)k+=.25;   /* dry sand a few metres above the swash */
const OX=pad[0]+dir[0]*k,OZ=pad[1]+dir[1]*k,OH=gridH(grid,OX,OZ);
eng.setFocusArea(OX,OZ,OX+dir[0]*16,OZ+dir[1]*16);
eng.setClouds({coverage:.62});
eng.setFog({density:.0011});
eng.setWind({strength:.25});
eng.setPost({exposure:1.25,bloom:.08,threshold:.9,knee:.6,saturation:1.3,look:[1.08,1.22],vignette:.38,grain:.015,chromatic:.01,dofMaxCoC:Q.get('dof')==='0'?0:7});

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
cam.fov=38*DEG;cam.fstop=1.8;cam.bokehScale=Q.get('dof')==='0'?0:2.4;
const rig={mode:'film',yaw:0,pitch:0,dist:1.7};
function setMode(m){rig.mode=m;$('bMode').textContent=m==='film'?'Film':'Free';}
const tgt=[OX,CY,OZ];
function update(dt,t){
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
