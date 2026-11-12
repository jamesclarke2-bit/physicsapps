import sys; sys.path.insert(0, '../../tools/worksheet-kit')
from figkit import *
import math
d = load_data()

# ---- Figure 1: the rig (ramp, block, start line, light gate, s, ell, h, theta) ----
fig, ax = plt.subplots(figsize=(7.0, 3.3), dpi=200); ax.set_xlim(-1.2, 13.2); ax.set_ylim(-3.0, 5.4); ax.axis("off"); ax.set_aspect("equal")
th = math.radians(14); L = 11.5; bx = 12.2; by = 0.0
tx, ty = bx - L*math.cos(th), by + L*math.sin(th)          # top of the ramp
ax.plot([bx, bx], [by, by], lw=0)
ax.add_patch(Polygon([(tx, ty), (bx, by), (tx, by)], fc="#e6ecf3", ec="none"))
ax.plot([-0.5, 13], [by, by], color=GR, lw=1.4)
def onramp(u, off=0.0):                                   # u along the ramp from the TOP (m-like units), off perpendicular (up)
    return (tx + u*math.cos(th) + off*math.sin(th), ty - u*math.sin(th) + off*math.cos(th))
p0, p1 = onramp(0), onramp(L); ax.plot([p0[0], p1[0]], [p0[1], p1[1]], color=INK, lw=2.2)
for i in range(0, 21):
    u = L - i*L/20; a0 = onramp(u); a1 = onramp(u, -(0.28 if i % 5 == 0 else 0.16)); ax.plot([a0[0], a1[0]], [a0[1], a1[1]], color=INK, lw=0.7)
# trolley at the start line
us = L - 0.55*L/ (1.0)*0.0 - 6.2; c0 = onramp(us); 
def rect(u0, u1, o0, o1, fc, ec=INK, z=4):
    pts = [onramp(u0, o0), onramp(u1, o0), onramp(u1, o1), onramp(u0, o1)]; ax.add_patch(Polygon(pts, fc=fc, ec=ec, lw=1.3, zorder=z))
rect(us-1.9, us, 0.15, 0.85, "#7fa8e0"); 
for uu in (us-1.5, us-0.4): cc = onramp(uu, 0.3); ax.add_patch(Circle(cc, 0.17, fc=INK, zorder=5))
rect(us-1.0, us-0.8, 0.85, 1.35, "#e8956a", z=5)
# start line
a0, a1 = onramp(us, -0.1), onramp(us, 2.0); ax.plot([a0[0], a1[0]], [a0[1], a1[1]], ls="--", color=OR, lw=1.3); q = onramp(us, 2.3); ax.text(q[0]-0.2, q[1]-0.1, "start line", ha="center", fontsize=8.5, color=OR)
# gate and stopper
g0, g1 = onramp(L-0.3, 0), onramp(L-0.3, 2.2); ax.plot([g0[0], g1[0]], [g0[1], g1[1]], color="#0c7a84", lw=3); q = onramp(L-0.3, 2.7); ax.text(q[0]+0.2, q[1], "light gate", ha="center", fontsize=8.5, color="#0c7a84")
rect(L-0.1, L+0.55, 0.0, 0.9, "#e8b64a")
# s
d0, d1 = onramp(us, 3.1), onramp(L-0.3, 3.1); dim_arrow(ax, d0[0], d0[1], d1[0], d1[1], c=BL); mm = ((d0[0]+d1[0])/2, (d0[1]+d1[1])/2); ax.text(mm[0], mm[1]+0.35, "$s$", ha="center", fontsize=12, color=BL, fontweight="bold")
# ell
e0, e1 = onramp(0, -1.3), onramp(L, -1.3); dim_arrow(ax, e0[0], e0[1], e1[0], e1[1], c=OR); mm = ((e0[0]+e1[0])/2, (e0[1]+e1[1])/2); ax.text(mm[0]-0.3, mm[1]-0.75, "ramp length $\\ell$", ha="center", fontsize=9.5, color=OR, rotation=-14)
# h
hx = tx - 0.9; dim_arrow(ax, hx, by, hx, ty, c=GRN); ax.text(hx-0.2, (ty+by)/2, "height $h$", ha="right", va="center", fontsize=9.5, color=GRN)
ax.plot([hx-0.2, tx], [ty, ty], color=GRN, lw=0.8, ls=":")
# theta
r = 2.6; ang = np.linspace(math.pi - th, math.pi, 30); ax.plot(bx + r*np.cos(ang), by + r*np.sin(ang), color=BL, lw=1.4); ax.text(bx - r - 0.2, by + 0.45, "$\\theta$", fontsize=12, color=BL, ha="right", fontweight="bold")
ax.text(1.0, -2.8, "angle $\\theta$ from a protractor, or from $\\sin\\theta = h \\div \\ell$ with a metre rule", fontsize=8.5, color=INK)
fig.savefig("fig_rig.png", bbox_inches="tight", pad_inches=0.05); plt.close(fig)

# ---- blank graph paper (students choose scales) ----
blank_grid("grid_t_s.png", "distance, $s$ / m", "time, $t$ / s", size=(6.2, 3.0))
blank_grid("grid_t2_s.png", "distance, $s$ / m", "$t^{2}$ / s$^{2}$", size=(6.2, 3.0))
blank_grid("grid_v2_s.png", "distance, $s$ / m", "$v^{2}$ / m$^{2}$ s$^{-2}$", size=(6.2, 3.0))
blank_grid("grid_a_th.png", "angle, $\\theta$ / $^{\\circ}$", "acceleration, $a$ / m s$^{-2}$", size=(6.2, 3.0))
blank_grid("grid_a_sin.png", "$\\sin\\theta$", "acceleration, $a$ / m s$^{-2}$", size=(6.2, 3.0))
def two(fname, a, b):
    fig, axs = plt.subplots(1, 2, figsize=(6.2, 2.0), dpi=200)
    for ax, (xl, yl) in zip(axs, (a, b)):
        ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.set_xticks([]); ax.set_yticks([])
        ax.annotate("", xy=(1.0, 0), xytext=(0, 0), arrowprops=dict(arrowstyle="-|>", color=INK)); ax.annotate("", xy=(0, 1.0), xytext=(0, 0), arrowprops=dict(arrowstyle="-|>", color=INK))
        ax.set_xlabel(xl); ax.set_ylabel(yl); ax.grid(color="#e3e8ed", lw=0.5)
        for sp in ax.spines.values(): sp.set_visible(False)
    fig.tight_layout(w_pad=3); fig.savefig(fname, pad_inches=0.05); plt.close(fig)
two("pred_A.png", ("distance, $s$", "time, $t$"), ("distance, $s$", "speed at the gate, $v$"))
two("pred_B.png", ("angle, $\\theta$", "acceleration, $a$"), ("$\\sin\\theta$", "acceleration, $a$"))
print("figures ok")

# ---- worked-example graphs: points, best fit, steepest and shallowest worst-fit lines ----
ex = d["example"]
def exfig(fname, xs, ys, fit, xl, yl, xmax, ymax, xt, yt, ax=None):
    fig, ax = plt.subplots(figsize=(3.4, 3.0), dpi=200)
    ax.set_xlim(0, xmax); ax.set_ylim(0, ymax); ax.set_xticks(xt); ax.set_yticks(yt); ax.grid(color="#dde3ea", lw=0.6); ax.set_axisbelow(True)
    for sp in ("top", "right"): ax.spines[sp].set_visible(False)
    ax.set_xlabel(xl, fontsize=9); ax.set_ylabel(yl, fontsize=9); ax.tick_params(labelsize=8)
    xx = np.array([0, xmax])
    for k, col, ls, lab in (("steep", OR, "--", "steepest"), ("shallow", OR, ":", "shallowest")):
        ax.plot(xx, fit[k]["intercept"] + fit[k]["slope"]*xx, color=col, lw=1.4, ls=ls, label=lab)
        for x, y in ((fit[k]["x0"], fit[k]["y0"]), (fit[k]["x1"], fit[k]["y1"])): ax.plot([x], [y], marker="x", color=col, ms=6, mew=1.4)
    ax.plot(xx, fit["best"]["intercept"] + fit["best"]["slope"]*xx, color=BL, lw=1.8, label="best fit")
    ax.plot(xs, ys, "o", color=INK, ms=4.5, zorder=5, label="data")
    ax.legend(fontsize=7, loc="upper left", frameon=False)
    fig.tight_layout(); fig.savefig(fname, pad_inches=0.05); plt.close(fig)
ax_ = [r["s"] for r in ex["A"]]
exfig("ex_t2.png", ax_, [r["t2"] for r in ex["A"]], ex["fT"], "distance, $s$ (m)", "$t^2$ (s$^2$)", 1.8, 4.0, [0, .4, .8, 1.2, 1.6], [0, 1, 2, 3, 4])
exfig("ex_v2.png", ax_, [r["v2"] for r in ex["A"]], ex["fV"], "distance, $s$ (m)", "$v^2$ (m$^2$ s$^{-2}$)", 1.8, 5.0, [0, .4, .8, 1.2, 1.6], [0, 1, 2, 3, 4, 5])
exfig("ex_asin.png", [r["sin"] for r in ex["B"]], [r["a"] for r in ex["B"]], ex["fB"], "$\\sin\\theta$", "acceleration, $a$ (m s$^{-2}$)", 0.34, 3.2, [0, .1, .2, .3], [0, 1, 2, 3])
print("example figures ok")

from PIL import Image
a = Image.open("ex_t2.png"); b = Image.open("ex_v2.png"); W = a.width + b.width; H = max(a.height, b.height)
c = Image.new("RGB", (W, H), "white"); c.paste(a, (0, 0)); c.paste(b, (a.width, 0)); c.save("ex_A.png")
