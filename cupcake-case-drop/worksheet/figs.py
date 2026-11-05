import numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle, FancyArrowPatch, Rectangle
from model import *
plt.rcParams.update({"font.family":"DejaVu Sans","font.size":10,"mathtext.fontset":"dejavusans"})
BL="#1f5fa8";OR="#d9660b";GR="#9aa5b1";INK="#1d2733";GRN="#2a8a57"

def cup(ax,cx,top,w=0.5,h=0.45,n=1,fc="#f6e3c4",ec=INK):
    # nested fluted cases: trapezoid wider at top
    for i in range(n):
        y=top-i*0.0  # nested: stack offset small
        off=i*0.045
        pts=[(cx-w/2,top-off),(cx+w/2,top-off),(cx+w*0.32,top-h-off),(cx-w*0.32,top-h-off)]
        ax.add_patch(Polygon(pts,closed=True,fc=fc,ec=ec,lw=1.2,zorder=3+i))
        for f in np.linspace(-0.8,0.8,6):
            ax.plot([cx+f*w/2,cx+f*w*0.32],[top-off,top-h-off],color=ec,lw=0.5,alpha=.5,zorder=3.1+i)

def arrow(ax,x,y0,y1,c,lw=2.6):
    ax.add_patch(FancyArrowPatch((x,y0),(x,y1),arrowstyle="-|>",mutation_scale=16,lw=lw,color=c,zorder=6))

# ---------- Figure 1: rig ----------
fig,ax=plt.subplots(figsize=(6.6,4.3),dpi=200)
ax.set_xlim(0,10);ax.set_ylim(-0.7,6.3);ax.axis("off")
ax.add_patch(Rectangle((0,-0.7),10,0.7,fc="#e3e8ee",ec="none"))
ax.plot([0,10],[0,0],color=INK,lw=2)
ax.text(9.9,-0.45,"floor",ha="right",va="center",color=INK)
# ruler
rx=1.2
ax.add_patch(Rectangle((rx-0.22,0),0.44,5.5,fc="#fff4cf",ec=INK,lw=1.2))
for i in range(0,56):
    L=0.2 if i%5 else 0.34
    ax.plot([rx+0.22,rx+0.22-L],[i*0.1,i*0.1],color=INK,lw=0.6)
for m,y in [(0,0),(1,2.75),(2,5.5)]:
    pass
ax.text(rx,5.75,"metre rule",ha="center",color=INK)
# release height h  (top at 5.0)
top=5.0
cup(ax,4.6,top,w=0.8,h=0.7,n=3)
ax.text(4.6,top+0.2,"cupcake cases",ha="center",va="bottom",color=INK)
ax.plot([rx+0.22,4.15],[top-0.7,top-0.7],ls=":",color=GR,lw=1.2)
ax.text(5.55,top-0.38,"release point:\nbottom of case\nlevel with mark",va="center",color=INK,fontsize=8.5)
# h arrow
ax.add_patch(FancyArrowPatch((2.5,0.02),(2.5,top-0.7),arrowstyle="<|-|>",mutation_scale=14,lw=1.6,color=BL))
ax.text(2.35,(top-0.7)/2,"$h$",color=BL,fontsize=15,ha="right",va="center",fontweight="bold")
ax.plot([rx+0.22,2.6],[0,0],ls=":",color=GR,lw=1.2)
# fall path
ax.plot([4.6,4.6],[top-0.8,0.9],ls="--",color=GR,lw=1.2)
ax.text(4.75,2.9,"falls\nfrom rest",color=GR,va="center",fontsize=9)
cup(ax,4.6,0.55,w=0.8,h=0.5,n=3,fc="#f6e3c4")
# timer
ax.add_patch(Circle((8.7,5.1),0.5,fc="white",ec=INK,lw=1.5))
ax.add_patch(Rectangle((8.6,5.6),0.2,0.18,fc=INK,ec=INK))
ax.plot([8.7,8.7],[5.1,5.4],color=INK,lw=1.5);ax.plot([8.7,8.9],[5.1,5.0],color=OR,lw=1.5)
ax.text(8.75,4.4,"timer (stopwatch)\nstart: release\nstop: lands",ha="center",va="top",fontsize=9,color=INK)
# camera on tripod
ax.add_patch(Rectangle((7.8,1.0),1.1,0.7,fc="#3a4654",ec=INK))
ax.add_patch(Circle((8.35,1.35),0.2,fc="#9ec5ea",ec=INK))
for dx in (-0.45,0,0.45):
    ax.plot([8.35,8.35+dx*1.2],[1.0,0],color=INK,lw=1.4)
ax.text(8.35,1.85,"optional: phone camera\n(slow-motion video)",ha="center",fontsize=9,va="bottom",color=INK)
ax.plot([7.8,5.1],[1.35,0.9],ls=":",color=GR,lw=1)
fig.savefig("fig_rig.png",bbox_inches="tight",pad_inches=0.05);plt.close(fig)

# ---------- Figure 2: free body diagrams ----------
fig,axs=plt.subplots(1,3,figsize=(6.9,3.2),dpi=200)
cases=[("A  just released","$v=0$",0.0,"$D=0$","resultant $=mg$","$a=g$"),
       ("B  speeding up","$0<v<v_T$",0.45,"$D<mg$","resultant $=mg-D$","$a<g$"),
       ("C  terminal velocity","$v=v_T$",1.0,"$D=mg$","resultant $=0$","$a=0$")]
for ax,(ttl,vtxt,dl,dtxt,rtxt,atxt) in zip(axs,cases):
    ax.set_xlim(-1.5,1.5);ax.set_ylim(-1.9,1.9);ax.axis("off");ax.set_aspect("equal")
    ax.set_title(ttl,fontsize=9.5,fontweight="bold",color=INK,loc="center")
    cup(ax,0,0.28,w=0.7,h=0.56,n=1)
    arrow(ax,0,0,-1.15,BL)
    ax.text(0.12,-1.25,"$W=mg$",color=BL,fontsize=11,ha="left",va="center")
    if dl>0:
        arrow(ax,0,0.28,0.28+1.15*dl,OR)
        ax.text(0.14,0.28+1.15*dl+0.1,"$D$",color=OR,fontsize=11,ha="left",va="bottom")
    else:
        ax.text(0.0,0.62,"no drag",color=OR,fontsize=9,ha="center")
    ax.text(0,-1.62,vtxt+"    "+atxt,ha="center",fontsize=10,color=INK)
    ax.text(0,-1.95,rtxt,ha="center",fontsize=9,color=GRN,va="top")
fig.subplots_adjust(wspace=0.05)
fig.savefig("fig_fbd.png",bbox_inches="tight",pad_inches=0.05);plt.close(fig)

# ---------- motion graphs ----------
def gridax(ax,xmax,ymax,xl,yl,xs,ys):
    ax.set_xlim(0,xmax);ax.set_ylim(0,ymax)
    ax.set_xticks(np.arange(0,xmax+1e-9,xs));ax.set_yticks(np.arange(0,ymax+1e-9,ys))
    ax.set_xticks(np.arange(0,xmax+1e-9,xs/5),minor=True);ax.set_yticks(np.arange(0,ymax+1e-9,ys/5),minor=True)
    ax.grid(which="major",color="#b8c2cc",lw=0.8);ax.grid(which="minor",color="#e1e6eb",lw=0.4)
    ax.set_xlabel(xl);ax.set_ylabel(yl)
    for s in ("top","right"):ax.spines[s].set_visible(False)
    ax.tick_params(labelsize=8)

H=3.0;XM=2.6
def curves(n):
    tf=tfall(n,H);t=np.linspace(0,tf,300);v,vv,ss,aa=sv(n,t);return t,vv,ss,aa,v,tf
def motion(fname,show,ghost,blank_title=None,figsize=(7.0,2.6)):
    fig,axs=plt.subplots(1,3,figsize=figsize,dpi=200)
    defs=[("$s$ / m",3.5,0.5),("$v$ / m s$^{-1}$",3.0,0.5),("$a$ / m s$^{-2}$",10.0,2.0)]
    for i,ax in enumerate(axs):
        yl,ym,ys=defs[i]
        gridax(ax,XM,ym,"$t$ / s",yl,0.5,ys)
    if ghost:
        t,vv,ss,aa,v,tf=curves(1)
        for ax,y in zip(axs,(ss,vv,aa)):
            ax.plot(t,y,color=GR,lw=2.2,ls="-")
        axs[0].text(0.35,2.7,"1 case",color="#6d7885",fontsize=8.5,rotation=0)
        axs[1].text(1.55,1.35,"1 case",color="#6d7885",fontsize=8.5)
    if show:
        t,vv,ss,aa,v,tf=curves(1)
        axs[0].plot(t,ss,color=BL,lw=2.2);axs[1].plot(t,vv,color=BL,lw=2.2);axs[2].plot(t,aa,color=BL,lw=2.2)
        axs[1].axhline(v,color=OR,ls="--",lw=1,xmax=1)
        axs[2].axhline(G,color=OR,ls="--",lw=1);axs[2].text(1.35,G+0.35,"$g$ = 9.81",color=OR,fontsize=8)
        axs[0].plot([tf],[H],"o",color=BL,ms=4);axs[0].text(tf-0.03,H+0.14,"lands",ha="right",fontsize=8,color=BL)
    for ax,l in zip(axs,("(a)","(b)","(c)")):
        ax.text(-0.02,1.08,l,transform=ax.transAxes,fontsize=10,fontweight="bold",color=INK)
    fig.tight_layout(w_pad=1.2)
    fig.savefig(fname,bbox_inches="tight",pad_inches=0.05);plt.close(fig)
motion("fig_motion_given.png",True,False)
motion("fig_motion_sketch.png",False,True)

# ---------- blank grids for student plots ----------
def blank(fname,xl,yl,size=(6.4,3.6),xn=10,yn=10):
    fig,ax=plt.subplots(figsize=size,dpi=200)
    ax.set_xlim(0,xn);ax.set_ylim(0,yn)
    ax.set_xticks(range(0,xn+1));ax.set_yticks(range(0,yn+1))
    ax.set_xticks(np.arange(0,xn,0.2),minor=True);ax.set_yticks(np.arange(0,yn,0.2),minor=True)
    ax.grid(which="major",color="#a9b4bf",lw=0.8);ax.grid(which="minor",color="#e3e8ed",lw=0.35)
    ax.set_xticklabels([]);ax.set_yticklabels([])
    ax.tick_params(which="both",length=0)
    ax.set_xlabel(xl,fontsize=10.5);ax.set_ylabel(yl,fontsize=10.5)
    for s in ax.spines.values():s.set_color(INK)
    fig.tight_layout();fig.savefig(fname,pad_inches=0.05);plt.close(fig)
blank("grid_v_n.png","number of cases, $n$","average speed, $\\bar{v}$ / m s$^{-1}$")
blank("grid_vsq_n.png","number of cases, $n$","$\\bar{v}^{\\,2}$ / m$^2$ s$^{-2}$")
# prediction axes (no numbers)
fig,ax=plt.subplots(figsize=(3.1,2.5),dpi=200)
ax.set_xlim(0,1);ax.set_ylim(0,1);ax.set_xticks([]);ax.set_yticks([])
ax.annotate("",xy=(1.0,0),xytext=(0,0),arrowprops=dict(arrowstyle="-|>",color=INK))
ax.annotate("",xy=(0,1.0),xytext=(0,0),arrowprops=dict(arrowstyle="-|>",color=INK))
ax.set_xlabel("number of cases, $n$");ax.set_ylabel("fall time, $t$ / s")
for s in ax.spines.values():s.set_visible(False)
ax.grid(color="#e3e8ed",lw=0.5)
fig.tight_layout();fig.savefig("pred_axes.png",pad_inches=0.05);plt.close(fig)
print("ok")
