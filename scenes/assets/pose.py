import json,numpy as np,sys,base64,struct
V=[];F=[];grp=None
for ln in open('base.obj'):
    if ln.startswith('v '):V.append([float(x) for x in ln.split()[1:4]])
    elif ln.startswith('g '):grp=ln.split()[1]
    elif ln.startswith('f ') and grp=='body':
        idx=[int(t.split('/')[0])-1 for t in ln.split()[1:]]
        F.append(idx[:3]);
        if len(idx)==4:F.append([idx[0],idx[2],idx[3]])
V=np.array(V);F=np.array(F)
sk=json.load(open('default.mhskel'));W=json.load(open('default_weights.mhw'))['weights']
J={k:V[v].mean(0) for k,v in sk['joints'].items()}
B=sk['bones']
def head(b):return J[B[b]['head']]
def tail(b):return J[B[b]['tail']]
def rot(ax,deg):
    ax=np.array(ax,float);ax/=np.linalg.norm(ax);a=np.radians(deg);c,s=np.cos(a),np.sin(a);x,y,z=ax
    return np.array([[c+x*x*(1-c),x*y*(1-c)-z*s,x*z*(1-c)+y*s],[y*x*(1-c)+z*s,c+y*y*(1-c),y*z*(1-c)-x*s],[z*x*(1-c)-y*s,z*y*(1-c)+x*s,c+z*z*(1-c)]])
P=json.loads(sys.argv[1]) if len(sys.argv)>1 else {}
# pose: world-space axis-angle per bone, applied about rest head, composed down the hierarchy
M={}
def mat(b):
    if b in M:return M[b]
    p=B[b]['parent'];Mp=mat(p) if p else np.eye(4)
    R=np.eye(4)
    if b in P:
        h=head(b);r=np.eye(3)
        for ax,dg in P[b]:r=rot(ax,dg)@r
        T=np.eye(4);T[:3,:3]=r;T[:3,3]=h-r@h;R=T
    M[b]=Mp@R;return M[b]
acc=np.zeros_like(V);ws=np.zeros(len(V))
Vh=np.c_[V,np.ones(len(V))]
for b,lst in W.items():
    if b not in B:continue
    m=mat(b);idx=np.array([i for i,_ in lst]);w=np.array([x for _,x in lst])
    acc[idx]+=(Vh[idx]@m.T)[:,:3]*w[:,None];ws[idx]+=w
ok=ws>0;acc[ok]/=ws[ok][:,None];acc[~ok]=V[~ok]
used=np.unique(F);remap=-np.ones(len(V),int);remap[used]=np.arange(len(used))
Vp=acc[used];Fi=remap[F]
print('verts',len(Vp),'tris',len(Fi),'bbox',Vp.min(0).round(2),Vp.max(0).round(2),file=sys.stderr)
# write simple OBJ for checking + packed binary (float32 pos, uint16 idx)
with open('posed.obj','w') as f:
    for v in Vp:f.write('v %f %f %f\n'%tuple(v))
    for t in Fi:f.write('f %d %d %d\n'%tuple(t+1))
blob=struct.pack('<II',len(Vp),len(Fi))+Vp.astype('<f4').tobytes()+Fi.astype('<u2').tobytes()
open('posed.b64','w').write(base64.b64encode(blob).decode())
print('joints', {k:head(k).round(2).tolist() for k in ['root','upperleg01.L','lowerleg01.L','foot.L','upperarm01.L','lowerarm01.L','wrist.L','head']},file=sys.stderr)
