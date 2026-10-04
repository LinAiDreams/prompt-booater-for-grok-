/* Floating Monolith - a black mirror slab hovering over a wildflower meadow.
   Built on the Apex engine library. Query: ?q=0|1|2 &scale= &t= &freeze=1 &yaw= &pitch= */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),onError:fail,water:false,biome:'meadow',
 fog:[.0009,.045],ground:[.09,.15,.04],cloud:[.1,.6],
 onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},700);}});
if(!eng)return;
const cam=eng.camera;

/* ---------- deterministic random ---------- */
let seed=1337;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

/* ---------- meadow terrain (always above the engine's y=0 water level) ---------- */
const meadowH=(x,z)=>4+2.2*(fbm2(x*.005+3,z*.005+7,4)-.5)+.7*(fbm2(x*.03,z*.03,3)-.5)+.25*(vn2(x*.12,z*.12)-.5);
const grid=buildGrid(meadowH);eng.setTerrain(grid);
const camXZ=[0,62],gy=gridH(grid,camXZ[0],camXZ[1]);

/* ---------- the monolith ---------- */
const BOX={w:62,h:13,d:42,x:-6,z:-26,yaw:-.62,lift:12.5};
const by=gridH(grid,BOX.x,BOX.z);
const slab=eng.addObject({m:eng.addMesh(genBox(BOX.w,BOX.h,BOX.d)),p:[BOX.x,by+BOX.lift+BOX.h/2,BOX.z],s:1,rot:[0,BOX.yaw,0],
 mat:{a:[.006,.007,.009],m:.03,r:.03,mode:4},mirror:false});

/* ---------- flower geometry (pos3 nrm3 uv2; uv.y<.5 stem, .5-2.5 petal, >2.5 centre) ---------- */
function Geo(){this.v=[];this.i=[];}
Geo.prototype.vert=function(p,n,u,w){this.v.push(p[0],p[1],p[2],n[0],n[1],n[2],u,w);return this.v.length/8-1;};
Geo.prototype.tri=function(a,b,c){this.i.push(a,b,c);};
Geo.prototype.done=function(){return {vb:new Float32Array(this.v),ib:new Uint16Array(this.i)};};
function stem(g,base,top,w){
 for(const a of [0,Math.PI/2]){const dx=Math.cos(a)*w,dz=Math.sin(a)*w,n=[-Math.sin(a),0,Math.cos(a)];
  const i0=g.vert([base[0]-dx,base[1],base[2]-dz],n,0,.2),i1=g.vert([base[0]+dx,base[1],base[2]+dz],n,0,.2),
   i2=g.vert([top[0]+dx*.6,top[1],top[2]+dz*.6],n,1,.2),i3=g.vert([top[0]-dx*.6,top[1],top[2]-dz*.6],n,1,.2);
  g.tri(i0,i1,i2);g.tri(i0,i2,i3);}}
/* flat-ish flower head: n petals around c, facing normal nn, radius R, cup lifts the tips */
function head(g,c,nn,R,n,pw,cup){
 const up=nn,t=Math.abs(up[1])<.9?[0,1,0]:[1,0,0],e1=v3.norm(v3.cross(t,up)),e2=v3.cross(up,e1);
 const P=(r,a,lift)=>[c[0]+(e1[0]*Math.cos(a)+e2[0]*Math.sin(a))*r+up[0]*lift,c[1]+(e1[1]*Math.cos(a)+e2[1]*Math.sin(a))*r+up[1]*lift,c[2]+(e1[2]*Math.cos(a)+e2[2]*Math.sin(a))*r+up[2]*lift];
 const a0=rnd()*TAU;
 for(let k=0;k<n;k++){const a=a0+k*TAU/n;
  const b=g.vert(P(R*.12,a,0),up,0,2),l=g.vert(P(R*.55,a-pw,R*cup*.4),up,.6,2),r=g.vert(P(R*.55,a+pw,R*cup*.4),up,.6,2),tp=g.vert(P(R,a,R*cup),up,1,2);
  g.tri(b,l,tp);g.tri(b,tp,r);}
 const cc=g.vert(P(0,0,R*.12),up,0,3);let prev=-1,first=-1;
 for(let k=0;k<=6;k++){const id=k<6?g.vert(P(R*.2,k*TAU/6,R*.04),up,1,3):first;if(k===0)first=id;if(prev>=0)g.tri(cc,prev,id);prev=id;}}
function tiltN(ax,az){return v3.norm([ax,1,az]);}
function genCosmos(){const g=new Geo();const H=.62,tx=.06;stem(g,[0,0,0],[tx,H,0],.0045);
 head(g,[tx,H,0],tiltN(.45,.1),.048,8,.17,.08);return g.done();}
function genButtercup(){const g=new Geo();const H=.42;stem(g,[0,0,0],[0,H*.55,0],.004);
 for(let k=0;k<3;k++){const a=k*2.2+.3,ox=Math.cos(a)*.06,oz=Math.sin(a)*.06,hh=H*(.8+.2*k/2);
  stem(g,[0,H*.55,0],[ox,hh,oz],.003);head(g,[ox,hh,oz],tiltN(ox*5,oz*5),.032,5,.42,.35);}return g.done();}
function genForget(){const g=new Geo();const H=.3;stem(g,[0,0,0],[0,H*.6,0],.0035);
 for(let k=0;k<6;k++){const a=k*1.05+rnd()*.4,rr=.025+.03*rnd(),ox=Math.cos(a)*rr,oz=Math.sin(a)*rr,hh=H*(.85+.25*rnd());
  stem(g,[0,H*.6,0],[ox,hh,oz],.0022);head(g,[ox,hh,oz],tiltN(ox*8,oz*8),.021,5,.5,.12);}return g.done();}

/* ---------- scatter around the camera, denser near it and in drifts ---------- */
const FWD=Math.atan2(BOX.z-camXZ[1],BOX.x-camXZ[0]);
function scatter(n,rMax,pow,zoneFn,tintFn,smin,smax){
 const out=new Float32Array(n*8);let k=0,guard=0;
 while(k<n&&guard++<n*40){
  const wedge=rnd()<.88,a=wedge?FWD+(rnd()-.5)*2.5:rnd()*TAU,r=1.2+rMax*Math.pow(rnd(),pow);
  const x=camXZ[0]+Math.cos(a)*r,z=camXZ[1]+Math.sin(a)*r;
  if(rnd()>zoneFn(x,z))continue;
  out.set([x,gridH(grid,x,z)-.02,z,smin+(smax-smin)*rnd(),rnd()*TAU,0,rnd()*TAU,tintFn()],k*8);k++;}
 return out.subarray(0,k*8);}
const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const zPink=(x,z)=>.05+.95*sm(.45,.7,vn2(x*.07+3,z*.07+7));
const zYel=(x,z)=>.1+.9*sm(.42,.7,vn2(x*.06+11,z*.06+2));
const zBlue=(x,z)=>.12+.88*sm(.36,.64,vn2(x*.08+5,z*.08+19));
const grassI=scatter(130000,62,1.7,()=>1,()=>rnd(),.22,.55);
for(let o=0;o<grassI.length;o+=8){grassI[o+5]=grassI[o+6];grassI[o+6]=grassI[o+7];grassI[o+7]=0;} /* grass layout: x,y,z,s, yaw,phase,tint,0 */
eng.addInstanced({kind:'grass',geom:genBlade(),instances:grassI,density:t=>t.grass*.7+.3});
eng.addInstanced({kind:'flower',geom:genCosmos(),instances:scatter(11000,78,1.9,zPink,()=>{const u=rnd();return u<.86?u*.42/.86:.97;},.45,1.05),density:t=>t.grass*.6+.4});
eng.addInstanced({kind:'flower',geom:genButtercup(),instances:scatter(14000,74,1.9,zYel,()=>rnd()<.85?.52:.65,.75,1.3),density:t=>t.grass*.6+.4});
eng.addInstanced({kind:'flower',geom:genForget(),instances:scatter(20000,70,1.9,zBlue,()=>.8,.9,1.6),density:t=>t.grass*.6+.4});

/* ---------- camera ---------- */
const target=[BOX.x+3,by+BOX.lift+9,BOX.z];
const rig={mode:'film',yaw:0,pitch:0};
function setMode(m){rig.mode=m;$('bMode').textContent=m==='film'?'Film':'Free';}
if(Q.has('yaw')){rig.mode='free';rig.yaw=+Q.get('yaw');rig.pitch=+Q.get('pitch')||0;}
cam.fov=58*DEG;
function update(dt,t){
 const px=camXZ[0]+2.2*Math.sin(t*.035),pz=camXZ[1]+1.2*Math.sin(t*.023+1);
 cam.pos=[px,gridH(grid,px,pz)+1.05+.12*Math.sin(t*.05),pz];
 const base=v3.sub(target,cam.pos),d=v3.len(base);let yaw=Math.atan2(base[2],base[0]),pit=Math.asin(base[1]/d);
 if(rig.mode==='film'){yaw+=.025*Math.sin(t*.04);pit+=.012*Math.sin(t*.031);}
 else{yaw+=rig.yaw;pit=clamp(pit+rig.pitch,-.5,1.1);}
 cam.target=[cam.pos[0]+Math.cos(pit)*Math.cos(yaw)*d,cam.pos[1]+Math.sin(pit)*d,cam.pos[2]+Math.cos(pit)*Math.sin(yaw)*d];
 slab.p[1]=by+BOX.lift+BOX.h/2+.35*Math.sin(t*.25);
 eng.look.mirrorY=slab.p[1]-BOX.h/2;}

/* sun just behind the slab's top-right edge (back-lit, like the reference photo) */
function sunBehindSlab(elOff,azOff){
 const c=Math.cos(BOX.yaw),s=Math.sin(BOX.yaw),e=[camXZ[0],gy+1.05,camXZ[1]];let best=null;
 for(const [lx,lz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){const x=lx*BOX.w/2,z=lz*BOX.d/2;
  const d=v3.norm(v3.sub([BOX.x+c*x+s*z,by+BOX.lift+BOX.h,BOX.z-s*x+c*z],e));
  const az=Math.atan2(d[2],d[0])/DEG,el=Math.asin(d[1])/DEG;if(!best||az>best.az)best={az,el};}
 return {el:best.el+elOff,az:best.az+azOff};}
const TOD=[{n:'Afternoon',...sunBehindSlab(-1.4,-.35)},{n:'Golden hour',el:7,az:sunBehindSlab(0,0).az+30},{n:'Noon',el:62,az:sunBehindSlab(0,0).az-40},{n:'Dusk',el:-1.5,az:sunBehindSlab(0,0).az+50}];let ti=0;

/* ---------- input ---------- */
$('top').textContent='Drag: look around   Film: slow drift';
const ptr=new Map(),cv=$('c');
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});});
cv.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(Math.abs(dx)+Math.abs(dy)>1){setMode('free');rig.yaw=clamp(rig.yaw+dx*.003,-1.1,1.1);rig.pitch=clamp(rig.pitch-dy*.003,-.6,.9);}});
const pup=e=>ptr.delete(e.pointerId);cv.addEventListener('pointerup',pup);cv.addEventListener('pointercancel',pup);
$('bMode').onclick=()=>{setMode(rig.mode==='film'?'free':'film');if(rig.mode==='film'){rig.yaw=0;rig.pitch=0;}};
$('bTime').textContent=TOD[0].n;
$('bTime').onclick=()=>{ti=(ti+1)%TOD.length;eng.setTimeOfDay(TOD[ti].el,TOD[ti].az,3.5);$('bTime').textContent=TOD[ti].n;};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
$('bSnd').onclick=()=>{$('bSnd').textContent=eng.audio.toggle()?'Sound on':'Sound off';};

if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
eng.setTimeOfDay(Q.has('el')?+Q.get('el'):TOD[0].el,Q.has('az')?+Q.get('az'):TOD[0].az,0);
if(Q.has('t'))eng.time=+Q.get('t');eng.frozen=Q.has('freeze');window.__eng=eng;
eng.start(update);
})();
