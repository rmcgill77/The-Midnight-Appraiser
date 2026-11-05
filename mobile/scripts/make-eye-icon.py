import math, sys
from PIL import Image
BG=(10,11,16); OUT=(4,4,8); SCL=(206,198,172); SCL2=(168,160,140); IRIS=(224,160,64); IRIS2=(150,88,36); IRIS3=(250,206,110)
GLOW=[(30,22,16),(52,36,20)]
N=32
def grid(inner=1.0):
    g=[[BG]*N for _ in range(N)]
    cx=cy=15.5
    # soft glow behind
    for y in range(N):
        for x in range(N):
            d=math.hypot(x-cx,(y-cy)*1.25)
            if d<15: g[y][x]=GLOW[0] if d>10 else GLOW[1]
    # dithered rays
    for a in range(0,360,30):
        for r in range(12,15):
            x=int(round(cx+math.cos(math.radians(a))*r)); y=int(round(cy+math.sin(math.radians(a))*r))
            if 0<=x<N and 0<=y<N and (x+y)%2==0: g[y][x]=(96,62,28)
    W,H=13.2,7.4
    def inside(x,y,s=1):
        u=(x-cx)/(W*s)
        return abs(u)<=1 and abs(y-cy)<=H*s*math.sqrt(1-u*u)
    for y in range(N):
        for x in range(N):
            if inside(x,y,1.12) and not inside(x,y,1.0): g[y][x]=OUT
    for y in range(N):
        for x in range(N):
            if inside(x,y):
                g[y][x]=SCL if abs(y-cy)<4.5 else SCL2
    # iris
    for y in range(N):
        for x in range(N):
            if inside(x,y):
                d=math.hypot(x-cx,y-cy)
                if d<=6.2: g[y][x]=IRIS2 if d>5 else (IRIS if d>3 else IRIS3 if (x+y)%2 else IRIS)
    # slit pupil
    for y in range(N):
        for x in range(N):
            if abs(x-cx)<=1.0 and abs(y-cy)<=5.2: g[y][x]=OUT
    g[11][14]=(255,240,200); g[12][14]=(255,240,200)
    # lashes/veins
    for x,y in [(5,12),(4,11),(26,12),(27,11),(8,10),(23,10),(6,19),(25,19)]:
        if g[y][x]==BG or g[y][x] in GLOW: g[y][x]=OUT
    for x,y in [(8,16),(9,16),(10,17),(21,17),(22,16),(23,16)]: g[y][x]=(150,70,60)
    return g
def render(size,pad=0,border=False):
    img=Image.new('RGB',(N,N))
    for y,row in enumerate(grid()): 
        for x,c in enumerate(row): img.putpixel((x,y),c)
    inner=int(size*(1-2*pad))
    img=img.resize((inner,inner),Image.NEAREST)
    out=Image.new('RGB',(size,size),BG); out.paste(img,((size-inner)//2,(size-inner)//2))
    if border:
        from PIL import ImageDraw
        d=ImageDraw.Draw(out); d.rectangle([0,0,size-1,size-1],outline=(224,160,64),width=8)
    return out
if __name__=='__main__':
    render(512,0,True).save('/tmp/claude-0/eye/full.png'); render(512,0.18).save('/tmp/claude-0/eye/mask.png')
