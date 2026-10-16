/* Iris - a macro study of a brown eye, rebuilt in 3D from one photograph.
   The photo does three jobs: its polar band-pass gives the iris relief (crypts, radial fibres, collarette), it is projected back
   onto the iris, sclera and lids from the pose of the camera that took it (photo texture projection, delit, with detail normals),
   and it sets the framing of the opening shot. Lit by one large softbox, with voxel cone traced GI carrying the iris's orange
   into the pupil wall, the lids and the lashes. Scale: the iris is 8 m across, so 1 m here is ~1.5 mm of eye.
   Query: ?q=0|1|2 &ft=seconds (film time) &gi=0 &proj=0 &dof=0 &freeze=1 */
(function(){
const $=id=>document.getElementById(id),errBox=$('err');
const fail=m=>{errBox.style.display='block';errBox.textContent+=m+'\n';console.error(m);};
addEventListener('error',e=>fail('JS: '+e.message+' (line '+e.lineno+')'));
const Q=new URLSearchParams(location.search);
const eng=createEngine({canvas:$('c'),minScale:.8,onError:fail,onStats:s=>{$('stat').textContent=s;},
 onFirstFrame:()=>{$('load').style.opacity='0';setTimeout(()=>{$('load').style.display='none';},900);}});
if(!eng)return;
const cam=eng.camera;
let seed=29;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

/* ---------- photo geometry: pixels -> metres on the iris plane (z = 0, iris centre at the origin, y up) ---------- */
const RI=4,S=RI/IRIS_H.ri,RP=IRIS_H.rp*S;                 /* iris radius 4 m <-> 565 px; pupil 1.2 m */
const px2w=(x,y)=>[(x-IRIS_H.cx)*S,(IRIS_H.cy-y)*S];
const PC=px2w(IRIS_H.w/2,IRIS_H.h/2),PD=24,PFOV=2*Math.atan(IRIS_H.h*S/2/PD);   /* the photo's camera: on axis, 24 m out */
const HERO={pos:[PC[0],PC[1],PD],target:[PC[0],PC[1],0],fov:PFOV};

/* ---------- studio: black room, one big softbox up-left in front (the glare on the sclera and the cornea's highlight), a cool bounce card left ---------- */
{const w=256,h=128,d=new Float32Array(w*h*3);
 const box=v3.norm([-.62,.42,.66]),card=v3.norm([-.95,-.05,.3]);
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const u=i/w,v=j/h,o=(j*w+i)*3,lon=(u-.5)*TAU,th=v*Math.PI,dir=[Math.sin(th)*Math.cos(lon),Math.cos(th),Math.sin(th)*Math.sin(lon)];
  let r=.004,g=.0035,b=.004;
  const k=v3.dot(dir,box),c=v3.dot(dir,card);
  const sb=sstep(.984,.992,k);r+=140*sb;g+=134*sb;b+=125*sb;              /* softbox: a bright disc, soft rim */
  const halo=Math.pow(Math.max(k,0),24);r+=.5*halo;g+=.45*halo;b+=.4*halo;
  const cc=sstep(.75,.9,c);r+=.1*cc;g+=.13*cc;b+=.18*cc;                 /* cool card: the blue sheen over the iris's left half */
  d[o]=r;d[o+1]=g;d[o+2]=b;}
 eng.setEnvMap({data:d,w,h,intensity:1});}
eng.setTerrain(buildGrid(()=>-1500),{mode:'meadow',skirt:false,water:false});
/* the key light is the sun, placed where the softbox is (up-left, in front): the projector relief self-shadows against it */
eng.setTimeOfDay(Q.has('el')?+Q.get('el'):36,Q.has('az')?+Q.get('az'):133.2,0);eng.setClouds({coverage:0,shadows:0});eng.setSky({stars:0,moon:false,aurora:0});
eng.setFog({density:0,volumetric:0});eng.setGround({albedo:[.02,.015,.012]});

/* ---------- helpers ---------- */
const add=(g,p,mat,o)=>eng.addObject(Object.assign({m:eng.addMesh(g),p,s:1,rot:[0,0,0],mat},o||{}));
function b64bytes(s){const T='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',L=new Uint8Array(128);for(let i=0;i<64;i++)L[T.charCodeAt(i)]=i;
 const n=s.length,pad=s.endsWith('==')?2:s.endsWith('=')?1:0,out=new Uint8Array(n/4*3-pad);let o=0;
 for(let i=0;i<n;i+=4){const v=L[s.charCodeAt(i)]<<18|L[s.charCodeAt(i+1)]<<12|L[s.charCodeAt(i+2)]<<6|L[s.charCodeAt(i+3)];
  if(o<out.length)out[o++]=v>>16&255;if(o<out.length)out[o++]=v>>8&255;if(o<out.length)out[o++]=v&255;}return out;}
/* surface of revolution about +z: prof = [[radius, z], ...] from the axis outward */
function revolve(prof,n,flip){const vb=[],ib=[];
 for(let i=0;i<prof.length;i++){const [r,z]=prof[i];for(let j=0;j<=n;j++){const a=j/n*TAU;vb.push(Math.cos(a)*r,Math.sin(a)*r,z,0,0,0,j/n,i/(prof.length-1));}}
 for(let i=0;i<prof.length-1;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;if(flip)ib.push(a,a+1,b,a+1,b+1,b);else ib.push(a,b,a+1,a+1,b,b+1);}
 return weldNormals({vb:new Float32Array(vb),ib:new Uint32Array(ib)});}
function tube(pts,rad,seg){const vb=[],ib=[],n=pts.length;
 for(let i=0;i<n;i++){const a=pts[Math.max(i-1,0)],b=pts[Math.min(i+1,n-1)],t=v3.norm(v3.sub(b,a)),s=v3.norm(v3.cross(t,Math.abs(t[1])>.9?[1,0,0]:[0,1,0])),u=v3.cross(s,t),r=rad(i/(n-1));
  for(let j=0;j<=seg;j++){const an=j/seg*TAU,nn=v3.add(v3.mul(s,Math.cos(an)),v3.mul(u,Math.sin(an)));vb.push(...v3.add(pts[i],v3.mul(nn,r)),...nn,i/(n-1),j/seg);}}
 for(let i=0;i<n-1;i++)for(let j=0;j<seg;j++){const a=i*(seg+1)+j,b=a+seg+1;ib.push(a,a+1,b,a+1,b+1,b);}return {vb:new Float32Array(vb),ib:new Uint32Array(ib)};}
function mergeAll(list){let nv=0,ni=0;for(const g of list){nv+=g.vb.length/8;ni+=g.ib.length;}const vb=new Float32Array(nv*8),ib=new Uint32Array(ni);let ov=0,oi=0;
 for(const g of list){vb.set(g.vb,ov*8);for(let k=0;k<g.ib.length;k++)ib[oi+k]=g.ib[k]+ov;ov+=g.vb.length/8;oi+=g.ib.length;}return {vb,ib};}

/* ---------- procedural maps: skin (pores, fine creases, blotchy colour) and sclera (conjunctival vessels) ---------- */
function hash2(x,y){let h=(x*374761393+y*668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function vnoiseT(x,y,P){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 const w=(a,b)=>hash2(((a%P)+P)%P,((b%P)+P)%P);return (w(xi,yi)*(1-u)+w(xi+1,yi)*u)*(1-v)+(w(xi,yi+1)*(1-u)+w(xi+1,yi+1)*u)*v;}
function fbmT(x,y,P,o){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*vnoiseT(x*f,y*f,P*f);a*=.5;f*=2;}return s;}
/* pack height + colour + roughness fields into the engine's map array (normal from the height gradient, tileable) */
function packMaps(N,H,col,rough,nk){const albedo=new Uint8Array(N*N*4),orm=new Uint8Array(N*N*4),normal=new Uint8Array(N*N*4);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x,o=i*4,hx=H[y*N+(x+1)%N]-H[y*N+(x+N-1)%N],hy=H[((y+1)%N)*N+x]-H[((y+N-1)%N)*N+x];
  let nx=-hx*nk,ny=-hy*nk;const l=Math.hypot(nx,ny,1);nx/=l;ny/=l;
  albedo[o]=col[i*3];albedo[o+1]=col[i*3+1];albedo[o+2]=col[i*3+2];albedo[o+3]=255;
  orm[o]=Math.round(255*Math.min(1,.55+H[i]*.6));orm[o+1]=Math.round(255*rough[i]);orm[o+2]=0;orm[o+3]=Math.round(255*H[i]);
  normal[o]=Math.round((nx*.5+.5)*255);normal[o+1]=Math.round((ny*.5+.5)*255);normal[o+2]=255;normal[o+3]=255;}
 return eng.createMaps({w:N,h:N,albedo,orm,normal});}
function skinMaps(){const N=512,H=new Float32Array(N*N),col=new Uint8Array(N*N*3),ro=new Float32Array(N*N),C=64;
 const pts=[];for(let j=0;j<C;j++)for(let i=0;i<C;i++)pts.push([(i+hash2(i,j*7+1))/C,(j+hash2(i*3+5,j))/C,.35+.65*hash2(i+11,j+29)]);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const u=x/N,v=y/N,ci=Math.floor(u*C),cj=Math.floor(v*C);let pore=0;
  for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ii=(ci+di+C)%C,jj=(cj+dj+C)%C,p=pts[jj*C+ii];
   let dx=u-(p[0]+(ci+di-ii)/C),dy=v-(p[1]+(cj+dj-jj)/C);const d2=(dx*dx+dy*dy)*C*C;if(p[2]>.55)pore=Math.max(pore,(p[2]-.45)*1.6*Math.exp(-d2/(.03*p[2])));}   /* irregular: some pores missing, depth varies */
  const fine=fbmT(u*64,v*64,64,3),warp=fbmT(u*6,v*6,6,3);
  /* creases run along the lid (u), wavering; plus a finer cross-hatch of skin lines */
  const cr=.55*Math.pow(Math.abs(Math.sin((v*7+warp*1.2)*Math.PI)),40)+.35*Math.pow(Math.abs(Math.sin((v*19+u*3+warp*2.)*Math.PI)),60)
   +.3*Math.pow(Math.abs(Math.sin((u*13-v*9+warp*2.5)*Math.PI)),70);
  const h=.62+.2*(fine-.5)-.3*pore-.24*Math.min(cr,1);H[y*N+x]=Math.max(0,Math.min(1,h));
  const bl=fbmT(u*5+3,v*5,5,4),fr=Math.pow(fbmT(u*40,v*40+9,40,2),6)*3;
  const k=1-.1*pore-.12*Math.min(cr,1)-.1*fr-.06*(fine-.5);
  col[(y*N+x)*3]=Math.round(Math.min(255,(196+26*bl)*k));col[(y*N+x)*3+1]=Math.round((146+12*(1-bl))*k*(1-.05*bl));col[(y*N+x)*3+2]=Math.round((128+8*(1-bl))*k);
  ro[y*N+x]=Math.min(1,.82+.18*pore+.1*Math.min(cr,1)+.08*(fine-.5));}   /* multiplier on the material roughness */
 return packMaps(N,H,col,ro,9);}
function scleraMaps(){const N=512,V=new Float32Array(N*N),H=new Float32Array(N*N),col=new Uint8Array(N*N*3),ro=new Float32Array(N*N);
 let s=7;const R=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 /* vessels: random walks from the back of the eye (v = 1) toward the limbus (v = 0), branching and thinning as they go */
 const stamp=(x,y,w,a)=>{const r=Math.ceil(w*2+1);for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const d=Math.hypot(dx,dy);if(d>w*2+.5)continue;
  const X=((Math.round(x)+dx)%N+N)%N,Y=Math.round(y)+dy;if(Y<0||Y>=N)continue;V[Y*N+X]=Math.max(V[Y*N+X],a*Math.exp(-d*d/(w*w*1.4+.3)));}};
 const walk=(x,y,ang,w,a,depth)=>{for(let k=0;k<420&&y>N*.04&&w>.35;k++){ang+=(R()-.5)*.5;x+=Math.cos(ang)*1.5;y+=Math.sin(ang)*1.5-.25;
  ang+=(-Math.PI/2-ang)*.02;stamp(x,y,w,a);w*=.997;a*=.999;if(depth<4&&R()<.012){walk(x,y,ang+(R()<.5?-1:1)*(.5+R()*.6),w*.7,a*.9,depth+1);}}};
 for(let i=0;i<34;i++)walk(R()*N,N-1-R()*30,-Math.PI/2+(R()-.5)*.8,1.2+R()*1.4,.3+.35*R(),0);
 /* soften: 2 box-blur passes so vessels read as blurred capillaries under the conjunctiva, not printed lines */
 for(let pass=0;pass<2;pass++){const T=V.slice();for(let y=1;y<N-1;y++)for(let x=0;x<N;x++){let a=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)a+=T[(y+dy)*N+(x+dx+N)%N];V[y*N+x]=a/9;}}
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x,v=y/N,u=x/N,vs=V[i],mott=fbmT(u*12,v*12,12,4);
  H[i]=.5+.25*vs+.06*(mott-.5);
  const tint=Math.min(1,v*1.3),mott2=fbmT(u*5,v*5,5,3);   /* whiter at the limbus, a little pinker and yellower toward the back */
  const base=[232-16*tint-6*mott2,222-24*tint-6*mott2,210-36*tint-6*mott2];
  const vc=[150,34,30];col[i*3]=Math.round(base[0]*(1-vs)+vc[0]*vs);col[i*3+1]=Math.round(base[1]*(1-vs)+vc[1]*vs);col[i*3+2]=Math.round(base[2]*(1-vs)+vc[2]*vs);
  ro[i]=.85+.15*mott;}
 return packMaps(N,H,col,ro,6);}
/* lid: a swept tube with metric uvs (repeats every 3 m) and a fold: radius grows into a soft crease above the margin */
function lidTube(pts,R0,seg,crease,a0){const vb=[],ib=[],n=pts.length;let L=0;
 for(let i=0;i<n;i++){if(i)L+=v3.len(v3.sub(pts[i],pts[i-1]));const a=pts[Math.max(i-1,0)],b=pts[Math.min(i+1,n-1)],t=v3.norm(v3.sub(b,a)),s=v3.norm(v3.cross(t,[0,1,0])),u=v3.cross(s,t);
  const taper=Math.min(1,(1-Math.abs(i/(n-1)*2-1))*4);
  for(let j=0;j<=seg;j++){const an=j/seg*TAU,da=Math.atan2(Math.sin(an-a0),Math.cos(an-a0));
   const r=R0*(.55+.45*taper)*(1+crease*Math.exp(-da*da/.08)-crease*.6*Math.exp(-Math.pow(da-.42,2)/.02)+.012*Math.sin(an*7+L*.8));
   const nn=v3.add(v3.mul(s,Math.cos(an)),v3.mul(u,Math.sin(an)));vb.push(...v3.add(pts[i],v3.mul(nn,r)),...nn,L/1.2,an*R0/1.2);}}
 for(let i=0;i<n-1;i++)for(let j=0;j<seg;j++){const a=i*(seg+1)+j,b=a+seg+1;ib.push(a,a+1,b,a+1,b+1,b);}
 return weldNormals({vb:new Float32Array(vb),ib:new Uint32Array(ib)});}
const SKIN=skinMaps(),SCLERA=scleraMaps();

/* ---------- the iris: a polar mesh displaced by the photo's relief ---------- */
const HM=b64bytes(IRIS_H.b64),NA=IRIS_H.na,NR=IRIS_H.nr;
const hAt=(ia,ir)=>HM[Math.min(Math.max(ir,0),NR-1)*NA+((ia%NA)+NA)%NA]/255;
const irisBase=rho=>.5*Math.pow(1-rho,2)+.06*Math.exp(-Math.pow((rho-.33)/.07,2));   /* pupillary zone pushed forward by the lens, a soft collarette */
const irisZ=(rho,h)=>irisBase(rho)+.15*(h-.5)*sstep(1,.86,rho)*sstep(0,.04,rho);
const iris=(()=>{const SA=512,SR=NR,vb=new Float32Array((SA+1)*SR*8),ib=[];
 for(let j=0;j<SR;j++){const rho=j/(SR-1),r=RP+(RI-RP)*rho;
  for(let i=0;i<=SA;i++){const a=i/SA*TAU,ia=Math.round(i/SA*NA);
   /* 3x3 blur of the relief so single-texel noise does not facet the mesh */
   let h=0;for(let dj=-1;dj<=1;dj++)for(let di=-2;di<=2;di+=2)h+=hAt(ia+di,j+dj);h/=9;
   const o=(j*(SA+1)+i)*8;vb[o]=Math.cos(a)*r;vb[o+1]=Math.sin(a)*r;vb[o+2]=irisZ(rho,h);vb[o+6]=i/SA;vb[o+7]=rho;}}
 for(let j=0;j<SR-1;j++)for(let i=0;i<SA;i++){const a=j*(SA+1)+i,b=a+SA+1;ib.push(a,b,a+1,a+1,b,b+1);}
 return weldNormals({vb,ib:new Uint32Array(ib)});})();
const EYE=[];const addE=(...a)=>{const o=add(...a);EYE.push(o);return o;};   /* the globe: turns about its centre SC */
addE(iris,[0,0,0],{a:[.36,.15,.05],m:0,r:.72,fuzz:.35});   /* velvety stroma, not a glossy shell */
/* pupil: the iris's inner lip rolls back into a dark well; the lens behind it is a faint glossy dome */
const z0=irisBase(0);
addE(revolve([[RP*.97,-1.6],[RP*.98,-.8],[RP,z0-.15],[RP*1.01,z0]],96,false),[0,0,0],{a:[0,0,0],specular:[.0,.0,.0],glossiness:0,noProject:true});
addE(revolve([[0,-1.15],[RP*.5,-1.22],[RP*.99,-1.45]],64,false),[0,0,0],{a:[0,0,0],specular:[.004,.004,.004],glossiness:.55,noProject:true});
/* sclera: the eyeball (radius 8 m, centre 6.9 m behind the iris plane) with the limbus opening */
const SC=[0,0,-6.9],SRAD=8,ph0=Math.asin(RI/SRAD);
const scl=[];for(let k=0;k<=48;k++){const ph=ph0+(Math.PI*.75-ph0)*k/48;scl.push([SRAD*Math.sin(ph),SC[2]+SRAD*Math.cos(ph)]);}
addE(revolve(scl,128,false),[0,0,0],{a:[1,1,1],maps:SCLERA,uvScale:1,m:0,r:.35,clearcoat:.8,clearcoatRough:.08,mode:'skin',modelA:30});
/* limbal ring: a slightly darker ring where iris meets sclera */
addE(revolve([[RI*.985,.02],[RI*1.03,-.05]],128,false),[0,0,0],{a:[.12,.07,.05],m:0,r:.5});
/* cornea: a clear dome (radius 5.2 m) refracting the iris */
const CC=-2.8,CR=5.2,cmax=Math.asin(4.3/CR),cor=[];for(let k=0;k<=40;k++){const ph=cmax*k/40;cor.push([CR*Math.sin(ph),CC+CR*Math.cos(ph)]);}
if(Q.get('cornea')!=='0')addE(revolve(cor,128,false),[0,0,0],{a:[1,1,1],m:0,r:.02,transparent:'glass',tint:[.99,.99,1],ior:1.376,dispersion:.004,thickness:.4,writeDepth:false},{noShadow:true});

/* ---------- lids and lashes ---------- */
/* eyelids: two skin sheets that hug the eyeball and leave an almond-shaped opening. Each sheet starts with a rounded, wet
   margin rolling back onto the eye, then rises over the globe (upper lid crease, thicker skin away from the margin). Metric uvs. */
const FX=8.8;                                                    /* eye corners */
const lidU=x=>{const q=Math.max(0,1-(x/FX)**2);return 3.55*Math.pow(q,.5)+.25*x/FX*Math.min(1,q*8);};   /* upper margin (slightly higher at the outer corner) */
const lidL=x=>{const q=Math.max(0,1-(x/FX)**2);return -3.6*Math.pow(q,.75);};
const browYc=x=>8.7+1.5*Math.exp(-Math.pow((x-4.5)/6,2))-.05*Math.pow(Math.max(0,x-9),2);
/* the face around the orbit (skin-free height; the lid sheets add their thickness): temples curve back, a hollow under the brow,
   the brow ridge in front, the cheek below. The globe sits inside it - only the open eye shows the ball */
function faceZ(x,y){return .3-.009*x*x
 +2.2*Math.exp(-Math.pow((y-browYc(x)-.6)/2.6,2))*Math.exp(-Math.pow(x/15,4))-.006*Math.max(0,y-12)*(y-12)
 -.7*Math.exp(-Math.pow((y-6.6)/1.5,2))*Math.exp(-Math.pow(x/10,4))
 +1.5*Math.exp(-Math.pow((y+12)/4.5,2))*Math.exp(-Math.pow(x/18,4));}
/* skin over the eye = smooth maximum of the globe and the face (no crater), with canthal hollows: at the eye corners the skin
   folds in toward the globe */
const eyeZ0=(x,y)=>{const r2=x*x+y*y,r=Math.sqrt(r2),sp=r2<63.5?SC[2]+Math.sqrt(64-r2):SC[2]+Math.sqrt(.5)-(r-Math.sqrt(63.5))*.45;
 const dip=3.6*Math.exp(-Math.pow((Math.abs(x)-FX)/2.4,2)-Math.pow(y/2.6,2))+.9*Math.exp(-Math.pow(x/6,2)-Math.pow((y-6)/2.2,2))*0;
 const f=faceZ(x,y)-dip,k=.55,m=Math.max(sp,f);return m+k*Math.log(Math.exp((sp-m)/k)+Math.exp((f-m)/k));};
/* the lids ride over the cornea's bulge too (softened), so a closed lid never lets the cornea poke through */
const eyeZ=(x,y)=>{const r2=x*x+y*y,a=eyeZ0(x,y);if(r2>=4.6*4.6)return a;const c=CC+Math.sqrt(CR*CR-r2)+.12,k=.35;const h=Math.max(k-Math.abs(a-c),0)/k;return Math.max(a,c)+h*h*k*.25;};
/* ---- face around the eye: brow ridge and cheek. Static surfaces in absolute (x, y), so the brow does not slide with a blink.
   The eye sits deep: above the lid the skin falls back into the sulcus, then rises forward onto a brow ridge that overhangs it. ---- */
const SX=34;                                                     /* half width of the skin sheets */

const browY=browYc;     /* brow centre line: arch peaks laterally, tail drops */
function browZ(x,y){return faceZ(x,y)+1.88;}
function cheekZ(x,y){return faceZ(x,y)+1.88;}
function lidSheet(edge,dir,crease,fold){fold=fold||.18;const NX=176,NT=40,NE=dir>0?22:10,vb=[],ib=[];
 for(let j=0;j<=NT+NE;j++){for(let i=0;i<=NX;i++){const x=(i/NX-.5)*2*SX,y0=edge(x);let y,z;
   if(j<6){const a=j/5*Math.PI/2,e=Math.sin(a);                   /* margin roll: from the eye surface out to the lid front, meeting it tangentially */
    const c=Math.min(1,Math.max(0,(Math.abs(x)-FX+.7)/1.2)),cc=c*c*(3-2*c);
    /* past the corners the upper sheet laps 1 m over the lower one (no seam, no slit) */
    y=y0+(1-cc)*(-dir*.14*Math.sin(a*2)+dir*.12*e*e)-(dir>0?cc*(1-j/5)*1.1:0);z=eyeZ(x,y)+(1-cc)*(.08+1.05*(1-Math.cos(a)))+cc*(1.13+(dir>0?.012:0));}
   else if(j<=NT){const t=(j-5)/(NT-5),far=dir>0?13:-13;y=y0+(far-y0)*Math.pow(t,1.35);
    const kx=Math.exp(-Math.pow(Math.max(0,Math.abs(x)-FX*.9)/2.2,2));   /* crease and fold belong to the lid: they fade out past the corners */
    const T=1.13+.75*t-kx*crease*Math.exp(-Math.pow((t-.3)/.06,2))+kx*fold*Math.exp(-Math.pow((t-.4)/.1,2));
    z=eyeZ(x,y)+T;}
   else{const k=(j-NT)/NE;y=dir>0?13+14*k:-13-7*k;z=dir>0?browZ(x,y):cheekZ(x,y);}
   vb.push(x,y,z,0,0,0,(x+SX)/(2*SX),j<=NT?j/NT*.8:.8+.19*(j-NT)/NE);}}
 for(let j=0;j<NT+NE;j++)for(let i=0;i<NX;i++){const a=j*(NX+1)+i,b=a+NX+1;if(dir>0)ib.push(a,a+1,b,a+1,b+1,b);else ib.push(a,b,a+1,a+1,b,b+1);}
 return weldNormals({vb:new Float32Array(vb),ib:new Uint32Array(ib)});}
/* subsurface: modelA scales the curvature into the pre-integrated skin LUT (this world is ~650x real size, so real-lid curvature needs a big gain);
   transmission lets the key glow red through the thin lid margin when it is back-lit */
const skin={a:[.62,.5,.45],maps:SKIN,uvScale:1,m:0,r:.5,mode:Q.get('sm')||'skin',modelA:45,transmission:Q.has('trn')?+Q.get('trn'):.55,thickness:1.4,attenuation:[1,.32,.18],noProject:true};
const lidUp=add(lidSheet(lidU,1,.5,.42),[0,0,0],skin),lidLo=add(lidSheet(lidL,-1,.12),[0,0,0],skin);
/* lid skin from the closed-eye photo: delit tileable plate -> albedo; height = luminance band-pass -> normal; roughness from glint level */
/* ---- lid skin texture, baked once for the whole lid (1536 x 768: u across 32 m, v margin -> far edge) ----
   Real lid skin is not one tone: redder and thinner at the margin, pinker at the inner corner, a darker crease, blotchy capillary
   colour, faint blue-violet veins showing through, and a fine criss-cross of micro-wrinkles that breaks up the oily sheen.
   Fine grain comes from the photo plate (tiled at its real scale), regional colour and wrinkles are generated here. */
if(typeof document!=='undefined'&&document.createElement){const im=new Image();im.onload=()=>{try{
 const PW=im.naturalWidth,PH=im.naturalHeight,cv=document.createElement('canvas');cv.width=PW;cv.height=PH;const cx=cv.getContext('2d');cx.drawImage(im,0,0);
 const pp=cx.getImageData(0,0,PW,PH).data,PL=new Float32Array(PW*PH);
 for(let i=0;i<PW*PH;i++)PL[i]=(.2126*pp[i*4]+.7152*pp[i*4+1]+.0722*pp[i*4+2])/255;
 const pm=PL.reduce((a,b)=>a+b,0)/PL.length;
 const W=1536,H=768,N=W*H,albedo=new Uint8Array(N*4),orm=new Uint8Array(N*4),normal=new Uint8Array(N*4),h=new Float32Array(N),RO=new Float32Array(N);
 const TW=10,TH=TW*PH/PW,LV=10;                          /* plate tile: 10 m wide (a real lid is ~1.5 plates wide); lid v spans ~10 m */
 const tap=(x,y)=>{x=((x%PW)+PW)%PW;y=((y%PH)+PH)%PH;return ((Math.floor(y)*PW+Math.floor(x)));};
 for(let y=0;y<H;y++){const v=Math.min(1.2,y/(H-1)/.8),my=y/(H-1)*LV/.8;for(let x=0;x<W;x++){const u=x/(W-1),mx=u*2*SX-SX,i=y*W+x;
  const k=tap(mx/TW*PW,my/TH*PH),pl=PL[k]/pm;                               /* photo grain, ~1 */
  /* micro-wrinkles: two families of fine wavy lines (along the lid, and diagonal), broken up by noise; plus tiny pores */
  const w1=fbmT(mx*.6,my*.6,19,2),w2=fbmT(mx*.9+7,my*.9,29,2);
  const brk=(a,b,P)=>{const n=fbmT(a,b,P,3);return Math.min(1,Math.max(0,n-.42)*3.5);};   /* breaks lines into short irregular segments */
  const l1=Math.pow(Math.abs(Math.sin((my*10.5+mx*.5+w1*3.4)*Math.PI)),34)*brk(mx*2.2,my*2.2,70);
  const l2=Math.pow(Math.abs(Math.sin((mx*7.3-my*8.1+w2*3.8)*Math.PI)),40)*brk(mx*1.9+3,my*1.9,61)*.7;
  const pore=Math.pow(Math.max(0,fbmT(mx*12,my*12,384,2)-.6)*3,2);
  const wr=Math.min(1,l1+l2);
  /* micro-relief: dense fine grain + a criss-cross of very fine furrows (the skin's surface pattern) - this is what breaks the sheen into glints */
  const gr=fbmT(mx*26,my*26,832,2)-.5,f1=Math.pow(Math.abs(Math.sin((mx*13+my*21+w2*2)*Math.PI)),6),f2=Math.pow(Math.abs(Math.sin((mx*15-my*19+w1*2)*Math.PI)),6);
  const micro=.16*gr-.07*(f1+f2)*fbmT(mx*4,my*4,128,2);
  h[i]=Math.max(0,Math.min(1,.55+(pl-1)*.9-.16*wr-.2*pore+micro+.05*(fbmT(mx*2.5,my*2.5,80,3)-.5)));
  /* colour */
  let r=pp[k*4]/255,g=pp[k*4+1]/255,b=pp[k*4+2]/255;r=r*r*.9+r*.1;g=g*g*.9+g*.1;b=b*b*.9+b*.1;   /* ~linear */
  const blot=fbmT(mx*.25+11,my*.25,8,4)-.5,blot2=fbmT(mx*.9,my*.9+5,29,3)-.5;
  const lidk=Math.exp(-Math.pow(Math.max(0,Math.abs(mx)-FX*.9)/2.2,2));   /* lid-only features fade out past the eye corners */
  const marg=Math.exp(-v/.05)*lidk,inner=1/(1+Math.exp((mx+6.5)*1.2))*Math.exp(-v/.35);
  const crease=Math.exp(-Math.pow((v-.31)/.07,2))*lidk;
  const vein=.7*Math.pow(Math.max(0,1-Math.abs(fbmT(mx*.18+2,my*.18,6,4)-.5)*9),4)*Math.max(0,Math.min(1,(v-.08)*6))*(1-crease*.5);
  let R_=r*(1+.2*blot+.08*blot2+.2*marg+.25*inner),G_=g*(1-.1*blot+.03*blot2-.16*marg-.12*inner),B_=b*(1-.06*blot-.1*marg-.06*inner);
  R_*=1-.2*crease;G_*=1-.26*crease;B_*=1-.16*crease;                         /* crease: a little darker, cooler */
  R_*=1-.2*vein;G_*=1-.14*vein;B_*=1+.08*vein;                              /* veins: blue-violet through thin skin */
  const sh=1-.07*wr-.1*pore;                                               /* cavities read darker in colour too */
  const enc=c=>Math.round(255*Math.pow(Math.max(0,Math.min(1,c*sh)),1/2.2));
  albedo[i*4]=enc(R_);albedo[i*4+1]=enc(G_);albedo[i*4+2]=enc(B_);albedo[i*4+3]=255;
  /* roughness multiplier: oily, slightly glossy peaks; matte cavities, crease and pores */
  RO[i]=Math.max(.38,Math.min(1,.8+.25*wr+.3*pore+.18*crease-.35*Math.max(0,gr*2.4)-.18*Math.max(0,(pl-1)*3)+.1*(fbmT(mx*1.6,my*1.6,51,2)-.5)-.12*marg));}}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,o=i*4,hx=h[y*W+Math.min(x+1,W-1)]-h[y*W+Math.max(x-1,0)],hy=h[Math.min(y+1,H-1)*W+x]-h[Math.max(y-1,0)*W+x];
  let nx=-hx*2.6,ny=-hy*2.6;const l=Math.hypot(nx,ny,1);
  orm[o]=Math.round(255*Math.min(1,.55+h[i]*.55));orm[o+1]=Math.round(255*RO[i]);orm[o+2]=0;orm[o+3]=Math.round(255*h[i]);
  normal[o]=Math.round((nx/l*.5+.5)*255);normal[o+1]=Math.round((ny/l*.5+.5)*255);normal[o+2]=255;normal[o+3]=255;}
 skin.maps=eng.createMaps({w:W,h:H,albedo,orm,normal});skin.a=[1,.97,.96];}catch(e){console.warn('lid texture: '+e.message);}};im.src=LID_SKIN;}
let curUp=lidU;                                                  /* the current upper margin (animated) */
const lidY=x=>curUp(x)+.1,lidZ=x=>eyeZ(x,curUp(x))+.25;            /* lash roots sit on the upper margin */
/* ~170 lashes rooted along the upper lid margin: they leave forward and down, then curl up; thin, tapering, glossy */
/* upper lashes grow in clumps: 2-5 hairs from neighbouring roots whose tips converge; 3 rows deep along the margin, thick at the
   root and tapering to a fine tip, longer and more curled toward the outer corner (+x) */
const LASH=[];{let x=-FX*.93;while(x<FX*.93){const n=2+Math.floor(rnd()*4),out=(x+FX*.93)/(FX*1.86),Lc=(1.9+1.9*Math.pow(out,1.3))*(1-.5*Math.pow(Math.abs(x)/(FX*.97),6))*(.85+.3*rnd());
  const side=(x*.035+(rnd()-.5)*.3),curl=.9+.8*rnd()+.5*out,tip=[(rnd()-.5)*.25,0];
  for(let k=0;k<n;k++){const xr=x+(k-(n-1)/2)*.07+(rnd()-.5)*.05;LASH.push({x:xr,row:Math.floor(rnd()*3),L:Lc*(.82+.3*rnd()),side:side+(x-xr)*.6+tip[0],curl,conv:.6+.3*rnd(),tx:x+tip[0]});}
  x+=.16+.14*rnd();}}
const LOW=[];for(let k=0;k<64;k++){const x=-FX*.78+FX*1.5*(k+rnd()*.7)/64;LOW.push({x,L:.55+.6*rnd()*(1-Math.abs(x)/(FX*.95)),side:x*.04+(rnd()-.5)*.4});}
let curLo=lidL;
function buildLashes(close){const l=[];
 for(const q of LASH){const b=[q.x,lidY(q.x)-.05-q.row*.06,lidZ(q.x)+.62+q.row*.12-.3*close];
  const d0=v3.norm([q.side*.6,-.72-.5*close,.68*(1-.55*close)]);const pts=[];let p=b.slice(),d=d0.slice();
  for(let i=0;i<12;i++){const u=i/11;pts.push(p.slice());
   d=v3.norm(v3.add(d,[(q.tx-p[0])*.02*q.conv*u,q.curl*.042*(1-.6*close)*(.4+u),.012]));p=v3.add(p,v3.mul(d,q.L/11));}
  l.push(tube(pts,t=>.024*Math.pow(1-t,1.5)+.0025,4));}
 /* lower lashes: short, sparse, pointing down and out */
 for(const q of LOW){const y0=curLo(q.x),b=[q.x,y0-.15,eyeZ(q.x,y0)+.75];const pts=[];let p=b.slice(),d=v3.norm([q.side,-.85,.5]);
  for(let i=0;i<6;i++){pts.push(p.slice());d=v3.norm(v3.add(d,[0,-.05,.05]));p=v3.add(p,v3.mul(d,q.L/5));}
  l.push(tube(pts,t=>.018*Math.pow(1-t,1.2)+.002,4));}
 /* the lash line: a dark band of roots along the upper margin */
 const ml=[];for(let x=-FX*.95;x<=FX*.95;x+=.3)ml.push([x,lidY(x)-.08,lidZ(x)+.6-.25*close]);
 l.push(tube(ml,t=>.17*Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,t))),.35)+.02,6));
 return mergeAll(l);}
const lashObj=add(buildLashes(0),[0,0,0],{a:[.016,.012,.01],m:0,r:.32,clearcoat:.8,clearcoatRough:.12,noProject:true});
/* ---- eyebrow: ~1400 hairs on the brow ridge. Growth direction follows a real brow: steeply up at the head (nose side, -x),
   sweeping outward along the body with the upper and lower rows converging on the midline, angling down along the tail.
   Hairs leave the skin at a shallow angle and lie back onto it; thick root, fine tip; a little colour variation. ---- */
/* height of the open upper-lid / brow skin at (x, y): the same formulas the lid sheet uses */
function upSkinZ(x,y){const y0=lidU(x);if(y>=13)return browZ(x,y);if(y<=y0)return eyeZ(x,y)+1.13;
 const t=Math.pow((y-y0)/(13-y0),1/1.35),kx=Math.exp(-Math.pow(Math.max(0,Math.abs(x)-FX*.9)/2.2,2));
 return eyeZ(x,y)+1.13+.75*t-kx*.5*Math.exp(-Math.pow((t-.3)/.06,2))+kx*.42*Math.exp(-Math.pow((t-.4)/.1,2));}
const brow=(()=>{const parts=[],sn=(x,y)=>{const e=.05,zx=(upSkinZ(x+e,y)-upSkinZ(x-e,y))/(2*e),zy=(upSkinZ(x,y+e)-upSkinZ(x,y-e))/(2*e);return v3.norm([-zx,-zy,1]);};
 const X0=-FX-2.6,X1=FX+4.6;let n=0;
 while(n<1500){const x=X0+(X1-X0)*rnd(),u=(x-X0)/(X1-X0);
  const hw=1.65*(1-u)+.45*u+.25*Math.sin(u*Math.PI),yy=(rnd()*2-1);if(rnd()>Math.pow(1-Math.abs(yy),.6)*(u<.08?u/.08:1))continue;
  const y=browY(x)+yy*hw;n++;
  let ang=u<.12?80:u<.3?80-(u-.12)/.18*62:u<.75?18:18-(u-.75)/.25*38;     /* degrees from +x */
  ang+=-yy*14+(rnd()-.5)*16;
  const a=ang*DEG,tdir=[Math.cos(a),Math.sin(a)],L=(2.2+2.2*rnd())*(u<.12?.7:1);
  let p=[x,y,upSkinZ(x,y)+.05],nrm=sn(x,y);const pts=[p.slice()];
  for(let k=1;k<6;k++){const lift=(.32-.06*k)*(.7+.6*rnd());const tg=v3.norm([tdir[0],tdir[1],0]);
   const t3=v3.norm(v3.sub(tg,v3.mul(nrm,v3.dot(tg,nrm))));const d=v3.norm(v3.add(v3.mul(t3,Math.cos(lift)),v3.mul(nrm,Math.sin(lift))));
   p=v3.add(p,v3.mul(d,L/5));const sz=upSkinZ(p[0],p[1]);if(p[2]<sz+.08)p[2]=sz+.08;pts.push(p.slice());nrm=sn(p[0],p[1]);}
  parts.push(tube(pts,t=>.034*Math.pow(1-t,1.2)+.004,3));}
 return mergeAll(parts);})();
add(brow,[0,0,0],{a:[.035,.024,.017],m:0,r:.42,clearcoat:.5,clearcoatRough:.18,noProject:true});
/* conjunctiva: wet pink tissue folding back around the globe, filling the eye corners (the opening is wider than the ball),
   redder and thicker at the inner corner (caruncle, -x) */
{const NR=24,NA=96,vb=[],ib=[];
 for(let j=0;j<=NR;j++){const r=6.9+7*j/NR;for(let i=0;i<=NA;i++){const a=i/NA*TAU,x=Math.cos(a)*r,y=Math.sin(a)*r;
  const sp=r<7.97?SC[2]+Math.sqrt(64-r*r):SC[2]+.7-(r-7.97)*.35;const car=1.1*Math.exp(-Math.pow((x+FX+.2)/1.3,2)-Math.pow(y/1.3,2));
  vb.push(x,y,sp-.05+car,0,0,0,i/NA,j/NR);}}
 for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const a=j*(NA+1)+i,b=a+NA+1;ib.push(a,b,a+1,a+1,b,b+1);}
 const g=weldNormals({vb:new Float32Array(vb),ib:new Uint32Array(ib)});
 add(g,[0,0,0],{a:[.62,.3,.27],m:0,r:.28,clearcoat:1,clearcoatRough:.05,mode:'skin',modelA:30,noProject:true},{noShadow:true});}
/* face beyond: a dark skin shell so orbiting never shows the void */
add(revolve([[0,-46],[20,-42],[30,-30],[34,-18],[36,-12]],64,true),[0,0,0],{a:[.05,.025,.02],m:0,r:.6,mode:'skin',noProject:true},{noShadow:true});

/* black studio walls all round (seen from inside; no shadow, so the sun key still reaches the eye) */
if(Q.get('studio')!=='0')add(revolve((()=>{const p=[];for(let k=0;k<=24;k++){const ph=Math.PI*k/24;p.push([600*Math.sin(ph),-600*Math.cos(ph)]);}return p;})(),48,true),[0,0,0],{a:[.006,.005,.005],m:0,r:1,noProject:true},{noShadow:true});
/* ---------- light: the softbox as a big sphere light, a dim warm kicker from the right ---------- */
const keyPos=v3.mul(v3.norm([-.62,.42,.66]),18);
eng.addLight({type:'sphere',radius:5,pos:keyPos,color:[1,.96,.9],intensity:Q.has('key')?+Q.get('key'):20,range:60});   /* soft wrap around the sun key */
eng.addLight({type:'point',pos:[22,-6,18],color:[1,.6,.35],intensity:40,range:80});

/* ---------- bounce sources that only reach the eye through VXGI (no direct light of their own):
   a gold reflector card under the eye, catching the sun key and throwing warm light up under the lids and into the pupil;
   a teal practical panel off to the right, whose glow wraps the skin, sclera and lashes. Toggle GI to see them vanish. ---------- */
add(genBox(30,.3,14),[0,-22,16],{a:[.95,.72,.38],m:0,r:.9,noProject:true},{rot:[-.55,0,0],noShadow:true});
add(genBox(.3,16,16),[34,2,18],{a:[.02,.02,.02],m:0,r:.9,emissive:Q.has('em')?[.2,.9,1].map(v=>v*+Q.get('em')):[1.6,1.7,1.2],noProject:true},{rot:[0,-.75,0],noShadow:true});
/* ---------- global illumination: VXGI clipmap centred on the eye ---------- */
const giOn=Q.get('gi')!=='0';
/* clipmap: 4 nested levels from a 20 m finest span (the lids, card and panel all inside level 1), strong single bounce, glossy cone on */
const GIOPT={extent:20,levels:4,center:Q.has('gc')?Q.get('gc').split(',').map(Number):[0,-1,2],intensity:Q.has('gii')?+Q.get('gii'):2.4,bounce:1,sky:.15,specular:true};
if(giOn)eng.setGI(GIOPT);

/* ---------- the photo, projected back from its own camera ---------- */
let proj=null,projOn=Q.get('proj')!=='0';const P0={pos:HERO.pos.slice(),target:HERO.target.slice()};
/* the photo plus its aligned height map: delit albedo, projector-space parallax relief (crypts and fibres), relief normals,
   self-shadowing against the sun key, cavity AO and roughness estimated from the photo */
if(typeof Image!=='undefined'){const img=new Image(),hm=new Image();   /* albedo plate (prep: haze and fall-off taken out), height plate */let n=0;const go=()=>{if(++n<2)return;
 /* the plates are the photo extended 170 px above and below (iris filled rotationally), so a turning eye never shows unseen iris */
 proj=eng.addProjector({image:img,height:hm,pos:HERO.pos,target:HERO.target,fov:2*Math.atan((IRIS_H.h+340)*S/2/PD),aspect:IRIS_H.w/(IRIS_H.h+340),mode:Q.get('pm')||'albedo',
  delight:Q.has('dl')?+Q.get('dl'):0,highlights:1,relief:Q.has('relief')?+Q.get('relief'):.1,reliefShadow:.75,ao:.5,roughness:'auto',detail:.4,
  angle:Q.has('ang')?+Q.get('ang'):86,edge:.02,occlusion:Q.get('occ')==='1',bias:.06,static:true,on:projOn,naive:Q.get('naive')==='1'});};
 img.onload=go;hm.onload=go;img.src=IRIS_ALBEDO;hm.src=IRIS_HEIGHT;}

/* ---------- camera ---------- */
eng.setPost({tone:'agx',look:[1.18,1.2],saturation:1.12,curve:.3,bloom:Q.has('bl')?+Q.get('bl'):.13,threshold:.95,knee:.75,grain:.02,chromatic:.003,vignette:.85,flare:0,dirt:0,
 dofMaxCoC:Q.get('dof')==='0'?0:6,exposure:Q.has('ex')?+Q.get('ex'):.5});
cam.fstop=5.6;cam.bokehScale=Q.get('dof')==='0'?0:1.6;cam.shutterAngle=180;
ORBIT_FN
const orbit=makeOrbit($('c'),{minZoom:.25,maxZoom:3.8,floorY:-40,onMode:m=>{$('bMode').textContent=m==='film'?'Film':'Free';},
 /* [t, yaw, pitch, zoom, pan] around the photo's own camera */
 film:{dur:66,keys:[[0,0,0,1],[7,0,0,.97],[15,.05,.02,.5,[.68,-.34,0]],[23,.62,-.12,.62,[.4,-.2,0]],[31,.5,.42,.78,[.3,.6,0]],[39,-.55,.25,.55,[-.5,.4,0]],[46,-.2,.06,1.6,[0,2.5,0]],[53,.18,.1,3.3,[1,8.5,0]],[59,.05,0,2.2,[0,4,0]]]}});
let T=0;
let giSlow=false;
/* ---------- life: calm gaze (fixations, main-sequence saccades with a glissade, drift, tremor) and natural blinks ---------- */
const gauss=()=>{let u=0;for(let i=0;i<4;i++)u+=rnd();return (u-2)/.58;};
const GZ={from:[0,0],to:[0,0],t0:-9,dur:.05,next:1.6};
const BL={t0:-9,next:3.2,c:.09,h:.04,o:.22,dbl:false};const DR={t0:-99,next:14,len:3};
const mj=u=>u*u*u*(10-15*u+6*u*u);
function gaze(t){if(t>=GZ.next){const cur=gazeAt(t);GZ.from=cur;
  GZ.to=[clamp(gauss()*.11,-.24,.24),clamp(gauss()*.06-.01,-.13,.12)];const A=Math.hypot(GZ.to[0]-cur[0],GZ.to[1]-cur[1])/DEG;
  GZ.t0=t;GZ.dur=.022+.0022*A;GZ.next=t+GZ.dur+.7+2.3*rnd();if(A>9&&rnd()<.35&&t>BL.next-1.5)BL.next=t+.01;}   /* big gaze shifts often carry a blink */
 return gazeAt(t);}
function gazeAt(t){const u=(t-GZ.t0)/GZ.dur;let s;if(u<1)s=mj(Math.max(u,0));else{const e=t-GZ.t0-GZ.dur;s=1+.04*Math.exp(-e*16)*Math.cos(e*38);}
 return [GZ.from[0]+(GZ.to[0]-GZ.from[0])*s+.004*Math.sin(t*.61)+.0025*Math.sin(t*1.7+1)+.0006*Math.sin(t*83),
         GZ.from[1]+(GZ.to[1]-GZ.from[1])*s+.003*Math.sin(t*.47+2)+.0006*Math.sin(t*71+3)];}
function blink(t){if(t>=BL.next){BL.t0=t;const slow=rnd()<.2;BL.c=slow?.17:.085+.02*rnd();BL.h=slow?.1:.03+.02*rnd();BL.o=slow?.42:.19+.06*rnd();
  BL.dbl=!slow&&rnd()<.12;BL.next=t+2.6+4.6*rnd();}
 const e=t-BL.t0,one=e=>e<0?0:e<BL.c?Math.pow(e/BL.c,1.6):e<BL.c+BL.h?1:e<BL.c+BL.h+BL.o?1-mj((e-BL.c-BL.h)/BL.o):0;
 let c=one(e);if(BL.dbl)c=Math.max(c,one(e-(BL.c+BL.h+BL.o)*.8));
 /* now and then the lids settle half-way for a few seconds: a calm, relaxed droop */
 if(t>=DR.next){DR.t0=t;DR.len=2+3*rnd();DR.next=t+DR.len+12+16*rnd();}const dd=t-DR.t0,droop=dd<0||dd>DR.len?0:.32*Math.sin(Math.PI*dd/DR.len)**2;
 return Math.max(c,droop);}
const Rm=m4.model(0,0,0,0,0,0,1);const xf=(M,v)=>[M[0]*v[0]+M[4]*v[1]+M[8]*v[2],M[1]*v[0]+M[5]*v[1]+M[9]*v[2],M[2]*v[0]+M[6]*v[1]+M[10]*v[2]];
let lastLid=[-1,-1],lifeT=Q.has('lt')?+Q.get('lt'):0;
GZ.next+=lifeT;BL.next+=lifeT;DR.next+=lifeT;   /* schedules start from the (debug) start time */
function life(dt){lifeT+=dt;const t=lifeT;
 let g=Q.get('still')==='1'?[0,0]:gaze(t),c=Q.get('still')==='1'?0:blink(t);
 if(Q.has('lid'))c=+Q.get('lid');if(Q.has('gz'))g=Q.get('gz').split(',').map(Number);   /* debug: fixed closure / gaze */
 /* the globe turns about its centre (pitch: + looks down) */
 const rx=g[1],ry=g[0],M=m4.model(0,0,0,rx,ry,0,1),off=v3.sub(SC,xf(M,SC));
 for(const o of EYE){o.rot=[rx,ry,0];o.p=off;}
 if(proj){const pp=v3.add(off,xf(M,P0.pos)),pt=v3.add(off,xf(M,P0.target));proj.set({pos:pp,target:pt,up:xf(M,[0,1,0])});}
 /* lids: the upper lid rides the gaze (up when looking up) and sweeps down to meet the lower lid in a blink */
 const lift=clamp(-rx*7,-1.2,1.4),lowLift=clamp(-rx*2.2,-.5,.5);
 if(Math.abs(c-lastLid[0])>.004||Math.abs(lift-lastLid[1])>.01){lastLid=[c,lift];
  const lo=x=>lidL(x)*(1-.14*c)+lowLift*(1-Math.abs(x)/FX*.7)*.6;curLo=lo;
  curUp=x=>{const open=lidU(x)+lift*Math.max(0,1-(x/FX)**2),shut=lo(x)+.16*Math.max(0,1-(x/FX)**2)+.02;return open+(shut-open)*c;};
  eng.updateMesh(lidUp.m,lidSheet(curUp,1,.5*(1-.7*c),.42*(1-.5*c)).vb);eng.updateMesh(lidLo.m,lidSheet(lo,-1,.12).vb);eng.updateMesh(lashObj.m,buildLashes(c).vb);}}
function frameCam(dt){T+=dt;life(dt);if(gi&&!giSlow&&T>5){giSlow=true;eng.setGI({rate:6});}   /* static set: once converged, re-voxelize every 6th frame */
const b=1+.004*Math.sin(T*.7);
 cam.pos=[HERO.pos[0],HERO.pos[1],HERO.pos[2]*b];cam.target=HERO.target.slice();
 const wide=window.innerWidth/Math.max(window.innerHeight,1);cam.fov=wide>=1.4?HERO.fov:HERO.fov*1.5;
 cam.focusTarget=[0,0,.35];}

/* ---------- HUD ---------- */
$('top').textContent='Film: automatic camera   Drag: orbit   Pinch/scroll: zoom   Double-tap: Film';$('bMode').textContent='Film';
$('bMode').onclick=()=>{if(orbit.mode==='film')orbit.free();else orbit.film();};
let gi=giOn;$('bTime').textContent=gi?'GI on':'GI off';$('bTime').onclick=()=>{gi=!gi;if(gi)eng.setGI(GIOPT);else eng.setGI(false);$('bTime').textContent=gi?'GI on':'GI off';};
$('bSnd').textContent=projOn?'Photo on':'Photo off';$('bSnd').onclick=()=>{projOn=!projOn;if(proj)proj.set({on:projOn});$('bSnd').textContent=projOn?'Photo on':'Photo off';};
let qi=0;const QM=['auto',0,1,2],QN=['Auto','Low','Med','High'];
$('bQ').onclick=()=>{qi=(qi+1)%4;eng.setQuality(QM[qi]);$('bQ').textContent=QN[qi];};
eng.start(dt=>{frameCam(dt);orbit.apply(cam,dt);});
if(Q.has('q')){qi=+Q.get('q')+1;eng.setQuality(+Q.get('q'),Q.has('scale')?+Q.get('scale'):undefined);$('bQ').textContent=QN[qi];}
if(Q.has('ft')){orbit.ft=+Q.get('ft');orbit.snap=true;}
if(Q.has('view')){const v=Q.get('view').split(',').map(Number);orbit.free();orbit.yaw=v[0];orbit.pitch=v[1];orbit.zoom=v[2]||1;orbit.snap=true;}   /* debug: fixed free view yaw,pitch,zoom */
if(Q.has('dbg'))eng.setDebug(Q.get('dbg'));
if(Q.has('nosss'))eng.setPost({sss:0});if(Q.has('sssw'))eng.setPost({sssWidth:+Q.get('sssw')});
if(Q.has('pp'))eng.setPost(JSON.parse(Q.get('pp')));   /* debug: post overrides */
if(Q.has('ncs')){const k=Q.get('ncs').split(',').map(Number);eng.objects.forEach((o,i)=>{if(k.includes(i))o.noShadow=true;});}   /* debug: object indices without shadows */
window.__objs=()=>eng.objects.map((o,i)=>i+':'+(o.mat.mode||'')+':'+(o.noShadow?'ns':'s')+':'+(o.mat.transparent||'')).join(' ');
eng.frozen=Q.has('freeze');window.__eng=eng;
})();
