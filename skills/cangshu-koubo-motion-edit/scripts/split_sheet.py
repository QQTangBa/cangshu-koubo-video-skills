"""切绿底角色表（你自己画的或用任意工具生成的角色设定表）：按行、列的空隙切开，抠绿，存透明 PNG。
用法: python3 split_sheet.py <表.png> <输出目录> <行数> <列数> <名字1,名字2,...>（名字按从左到右、从上到下）
切完把每张图写进工程 src/scenes/custom/ipq.json：{"名字": [宽, 高, 头中心x, 头中心y, 头宽]}（qkid.tsx 用宽高；morph.tsx 用后三个把真人的头对到小人头上，新图在图上量）。"""
import sys, numpy as np, cv2
from PIL import Image
def key(path):
    a=np.asarray(Image.open(path).convert('RGB')).astype(np.float32); r,g,b=a[...,0],a[...,1],a[...,2]; m=np.maximum(r,b)
    al=1-np.clip((g-m-25)/60,0,1); g2=np.where(g>m,np.minimum(g,m+6),g); return np.dstack([r,g2,b,al*255]).astype(np.uint8)
def valleys(prof, n, span):
    L=len(prof); cuts=[0]
    for k in range(1,n):
        c=L*k/n; lo,hi=int(c-L/span),int(c+L/span); cuts.append(lo+int(np.argmin(prof[lo:hi])))
    return cuts+[L]
def split(path, names, rows, cols, out):
    rgba=key(path); al=(rgba[...,3]>128)
    rc=valleys(al.sum(1).astype(float), rows, 8) if rows>1 else [0, al.shape[0]]
    i=0
    for r in range(rows):
        band=al[rc[r]:rc[r+1]]; cc=valleys(band.sum(0).astype(float), cols, 14)
        for c in range(cols):
            if i>=len(names): return
            sub=rgba[rc[r]:rc[r+1], cc[c]:cc[c+1]].copy(); a2=sub[...,3]>128
            n,lab,st,_=cv2.connectedComponentsWithStats(a2.astype(np.uint8),8)
            big=1+np.argmax(st[1:,4]); bx,by,bw,bh=st[big,:4]
            # 留下最大块和它附近的小块（汗滴、Z 之类），去掉贴着格子边、从隔壁伸过来的碎片
            keep=np.zeros_like(a2)
            for j in range(1,n):
                x,y,w,h,A=st[j]
                near = x+w>=bx-40 and x<=bx+bw+40 and y+h>=by-60 and y<=by+bh+40
                edge = x==0 or x+w>=sub.shape[1]
                if j==big or (near and not (edge and A<st[big,4]*0.05)): keep|=lab==j
            keep=cv2.dilate(keep.astype(np.uint8),np.ones((5,5),np.uint8))>0
            sub[...,3]=sub[...,3]*keep; ys,xs=np.where(sub[...,3]>10)
            sub=sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
            Image.fromarray(sub,'RGBA').save(f'{out}/{names[i]}.png'); print(names[i], sub.shape[1], sub.shape[0]); i+=1
if __name__=='__main__':
    sheet, out, rows, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]); names=sys.argv[5].split(',')
    split(sheet, names, rows, cols, out)
