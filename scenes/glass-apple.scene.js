/* Glass Apple - a clear glass apple full of pearls on a beach at sunset.
   Built on the Apex engine library. Query: ?q=0|1|2 &scale= &t= &freeze=1 */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),onError:fail,cloud:[-.06,.3],
 onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},700);}});
if(!eng)return;
const cam=eng.camera;
let seed=4242;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

/* ---------- island + beach spot facing the sea ---------- */
const grid=buildGrid(islandH);eng.setTerrain(grid);
const ANG=.7,dir=[Math.cos(ANG),Math.sin(ANG)],side=[-dir[1],dir[0]];
const pad=findBeachPad(grid,ANG);
let k=0;while(k<40&&gridH(grid,pad[0]+dir[0]*k,pad[1]+dir[1]*k)>.8)k+=.25;   /* walk toward the sea to damp sand */
const AX=pad[0]+dir[0]*k,AZ=pad[1]+dir[1]*k,AH=gridH(grid,AX,AZ);
eng.setFocusArea(AX,AZ,AX+dir[0]*14,AZ+dir[1]*14);

/* ---------- apple: lathe of a profile, 5 soft lobes, top + bottom dimples ---------- */
function prof(t){ /* t: 0 top centre .. 1 bottom centre -> [radius, y] in unit space */
 const th=t*Math.PI,sn=Math.sin(th),cs=Math.cos(th);
 let r=.9*sn*(1+.16*cs)*(1-.12*Math.exp(-Math.pow((t-1)/.18,2)));
 let y=cs*1.0-.36*Math.exp(-Math.pow(t/.15,2))+.14*Math.exp(-Math.pow((t-1)/.1,2));
 return [r,y];}
function genApple(){
 const NT=72,NA=96,vb=[],ib=[];
 for(let i=0;i<=NT;i++){const t=i/NT,[r,y]=prof(t);
  for(let j=0;j<=NA;j++){const a=j/NA*TAU,lobe=1+.035*Math.cos(5*a)*Math.sin(t*Math.PI);vb.push(Math.cos(a)*r*lobe,y,Math.sin(a)*r*lobe,0,0,0,j/NA,t);}}
 for(let i=0;i<NT;i++)for(let j=0;j<NA;j++){const a=i*(NA+1)+j,b=a+NA+1;ib.push(a,a+1,b,a+1,b+1,b);}
 /* stem: curved tapered tube rising out of the top dimple */
 const base=vb.length/8,SN=16,SR=10,top=prof(0)[1];
 const sp=u=>[.10*u*u*1.6,top+.02+u*.52,0],sr=u=>.075*(1-.45*u)+.02*Math.pow(u,6);
 for(let i=0;i<=SN;i++){const u=i/SN,c=sp(u),d=v3.norm(v3.sub(sp(Math.min(u+.02,1.02)),sp(Math.max(u-.02,-.02)))),n1=v3.norm(v3.cross(d,[0,0,1])),n2=v3.cross(n1,d);
  for(let j=0;j<=SR;j++){const a=j/SR*TAU,n=v3.add(v3.mul(n1,Math.cos(a)),v3.mul(n2,Math.sin(a))),q=v3.add(c,v3.mul(n,sr(u)));vb.push(q[0],q[1],q[2],0,0,0,j/SR,2+u);}}
 for(let i=0;i<SN;i++)for(let j=0;j<SR;j++){const a=base+i*(SR+1)+j,b=a+SR+1;ib.push(a,b,a+1,a+1,b,b+1);}
 const cap=vb.length/8,cc=sp(1);vb.push(cc[0],cc[1]+.01,cc[2],0,0,0,0,3);
 for(let j=0;j<SR;j++){const a=base+SN*(SR+1)+j;ib.push(cap,a+1,a);}
 /* smooth normals */
 const V=vb.length/8,acc=new Float32Array(V*3);
 for(let t=0;t<ib.length;t+=3){const [a,b,c]=[ib[t],ib[t+1],ib[t+2]],pa=vb.slice(a*8,a*8+3),pb=vb.slice(b*8,b*8+3),pc=vb.slice(c*8,c*8+3);
  const n=v3.cross(v3.sub(pc,pa),v3.sub(pb,pa));for(const x of [a,b,c]){acc[x*3]+=n[0];acc[x*3+1]+=n[1];acc[x*3+2]+=n[2];}}
 for(let i=0;i<V;i++){const n=v3.norm([acc[i*3],acc[i*3+1],acc[i*3+2]]);vb[i*8+3]=n[0];vb[i*8+4]=n[1];vb[i*8+5]=n[2];}
 return {vb:new Float32Array(vb),ib:new Uint16Array(ib)};}
/* fix winding so normals point outward (lathe goes top->bottom) */
const appleG=genApple();
{const g=appleG;let out=0;for(let i=0;i<g.vb.length/8;i+=37){out+=g.vb[i*8]*g.vb[i*8+3]+g.vb[i*8+2]*g.vb[i*8+5];}
 if(out<0){for(let i=0;i<g.vb.length/8;i++){g.vb[i*8+3]*=-1;g.vb[i*8+4]*=-1;g.vb[i*8+5]*=-1;}}}
const S=.24,ymin=prof(1)[1],AY=AH+.005-ymin*S;
const FILL=-.28;                                   /* local y of the pearl line */
eng.addObject({m:eng.addMesh(appleG),p:[AX,AY,AZ],s:S,rot:[0,ANG+.4,0],
 mat:{a:[.93,.97,1.0],m:0,r:.02,mode:5,glass:{fill:FILL,aTop:.9,aBot:.12,ior:1.5,r:.9}}});

/* ---------- pearls: packed inside the apple's lower half + scattered on the sand ---------- */
const rAt=y=>{let best=0;for(let i=1;i<200;i++){const [r,yy]=prof(i/200);if(Math.abs(yy-y)<.012&&i>100)best=Math.max(best,r);}return best||.5;};
const pearls=[];
const fits=(x,y,z,r)=>pearls.every(p=>Math.hypot(p[0]-x,p[1]-y,p[2]-z)>(p[3]+r)*.92);
for(let n=0;n<6000&&pearls.length<150;n++){
 const r=S*(.075+.035*rnd()),ly=ymin+.12+rnd()*(FILL+.06-ymin-.12),R=rAt(ly)*.86-r/S,a=rnd()*TAU,rr=Math.sqrt(rnd())*Math.max(R,0);
 const x=AX+Math.cos(a)*rr*S,z=AZ+Math.sin(a)*rr*S,y=AY+ly*S;if(fits(x,y,z,r))pearls.push([x,y,z,r]);}
const near=[];
for(let n=0;n<70;n++){
 const f=rnd(),dist=.35+Math.pow(rnd(),.8)*2.4,lat=(rnd()-.5)*(.9+dist*1.4),back=rnd()<.7?-dist*.55:dist*.6;
 const x=AX+dir[0]*back+side[0]*lat,z=AZ+dir[1]*back+side[1]*lat;
 if(Math.hypot(x-AX,z-AZ)<.2)continue;
 const r=.006+Math.pow(f,2.2)*.04;near.push([x,gridH(grid,x,z)+r*.82,z,r]);}
const pi=new Float32Array((pearls.length+near.length)*8);
[...pearls,...near].forEach((p,i)=>pi.set([p[0],p[1],p[2],p[3],rnd()*TAU,0,0,0],i*8));
const sg=genSphere(1,32,20);for(let i=0;i<sg.vb.length/8;i++)sg.vb[i*8+7]=3;   /* uv.y=3: no foliage flutter */
const sl=genSphere(1,14,9);for(let i=0;i<sl.vb.length/8;i++)sl.vb[i*8+7]=3;
eng.addInstanced({kind:'pearl',geom:sg,lod:sl,instances:pi,shadow:true,mirror:true});

/* ---------- camera: low, looking over the apple at the sun on the sea ---------- */
cam.fov=30*DEG;
const rig={mode:'film',yaw:0,pitch:0,dist:1.55};
const tgt=[AX,AY+.03,AZ];
function setMode(m){rig.mode=m;$('bMode').textContent=m==='film'?'Film':'Free';}
function update(dt,t){
 let yaw=Math.atan2(dir[1],dir[0])+Math.PI+.12,pit=.07,d=rig.dist;
 const asp=cv.width/Math.max(cv.height,1);if(asp<1)d*=Math.min(2.2,Math.pow(1/asp,.85));   /* portrait phones: back off so the apple fits */
 if(rig.mode==='film'){yaw+=.16*Math.sin(t*.06);pit+=.02*Math.sin(t*.05);d+=.15*Math.sin(t*.04);}
 else{yaw+=rig.yaw;pit=clamp(pit+rig.pitch,.03,1.2);}
 const cp=Math.cos(pit);
 const p=[tgt[0]+d*cp*Math.cos(yaw),tgt[1]+d*Math.sin(pit),tgt[2]+d*cp*Math.sin(yaw)];
 p[1]=Math.max(p[1],gridH(grid,p[0],p[2])+.12);
 cam.pos=p;cam.target=[tgt[0]+dir[0]*.6,tgt[1]+.04,tgt[2]+dir[1]*.6];cam.focus=Math.hypot(p[0]-AX,p[2]-AZ);}

/* ---------- input + HUD ---------- */
$('top').textContent='Drag: orbit   Pinch or wheel: zoom';
const ptr=new Map(),cv=$('c');let pinch0=0,dist0=1;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptr.size===2){const [a,b]=[...ptr.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);dist0=rig.dist;}});
cv.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(ptr.size===1&&Math.abs(dx)+Math.abs(dy)>1){setMode('free');rig.yaw-=dx*.005;rig.pitch=clamp(rig.pitch+dy*.004,-.1,1.1);}
 else if(ptr.size===2){const [a,b]=[...ptr.values()];setMode('free');rig.dist=clamp(dist0*pinch0/Math.max(Math.hypot(a.x-b.x,a.y-b.y),1),.7,6);}});
const pup=e=>ptr.delete(e.pointerId);cv.addEventListener('pointerup',pup);cv.addEventListener('pointercancel',pup);
cv.addEventListener('wheel',e=>{e.preventDefault();setMode('free');rig.dist=clamp(rig.dist*(1+e.deltaY*.001),.7,6);},{passive:false});
const SUNAZ=ANG/DEG+3;
const TOD=[{n:'Sunset',el:7,az:SUNAZ+17},{n:'Golden hour',el:9,az:SUNAZ-10},{n:'Morning',el:26,az:SUNAZ-60},{n:'Dusk',el:-1.5,az:SUNAZ+5}];let ti=0;
$('bTime').textContent=TOD[0].n;
$('bMode').onclick=()=>{setMode(rig.mode==='film'?'free':'film');if(rig.mode==='film'){rig.yaw=0;rig.pitch=0;rig.dist=1.55;}};
$('bTime').onclick=()=>{ti=(ti+1)%TOD.length;eng.setTimeOfDay(TOD[ti].el,TOD[ti].az,3.5);$('bTime').textContent=TOD[ti].n;};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').onclick=()=>{$('bSnd').textContent=eng.audio.toggle()?'Sound on':'Sound off';};

if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
eng.setTimeOfDay(Q.has('el')?+Q.get('el'):TOD[0].el,Q.has('az')?+Q.get('az'):TOD[0].az,0);
if(Q.has('t'))eng.time=+Q.get('t');eng.frozen=Q.has('freeze');window.__eng=eng;
eng.start(update);
})();
