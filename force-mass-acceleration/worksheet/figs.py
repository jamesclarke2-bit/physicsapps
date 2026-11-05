import sys; sys.path.insert(0, '../../tools/worksheet-kit')
from figkit import *
d = load_data()

def trolley(ax, x, y, w=2.0, h=0.62, masses=3, c="#7fa8e0"):
    ax.add_patch(Rectangle((x, y), w, h, fc=c, ec=INK, lw=1.4, zorder=4))
    for cx in (x+0.35, x+w-0.35): ax.add_patch(Circle((cx, y-0.0), 0.17, fc=INK, ec=INK, zorder=5))
    for i in range(masses): ax.add_patch(Rectangle((x+0.2+i*0.3, y+h), 0.26, 0.34, fc="#e8956a", ec=INK, lw=0.8, zorder=4))

# ---- Figure 1: set-up ----
fig, ax = plt.subplots(figsize=(7.0, 3.4), dpi=200); ax.set_xlim(0, 14); ax.set_ylim(-3.4, 3.2); ax.axis("off")
ty = 1.0
ax.add_patch(Rectangle((0.6, ty-0.12), 11.6, 0.12, fc="#d5dbe2", ec=INK, lw=1.2))
for i in range(0, 21):
    x = 1.6 + i*0.5; ax.plot([x, x], [ty-0.12, ty-(0.35 if i % 5 == 0 else 0.22)], color=INK, lw=0.8)
    if i % 5 == 0: ax.text(x, ty-0.7, f"{i*0.1:.1f}", ha="center", fontsize=7.5, color=INK)
ax.text(11.75, ty-0.7, "m", fontsize=7.5, color=INK, ha="left")
ax.plot([1.6, 1.6], [ty-0.12, ty+1.6], ls="--", color=OR, lw=1.3); ax.text(1.6, ty+1.7, "start", ha="center", fontsize=8.5, color=OR)
trolley(ax, 0.6, ty+0.0, 1.0, 0.55, masses=2)
trolley(ax, 1.9-1.0, ty, 1.0, 0.55, masses=0, c="none") if False else None
for gx, lab in ((3.1, "gate 1"), (7.6, "gate 2")):
    ax.plot([gx, gx], [ty, ty+1.5], color="#0c7a84", lw=3); ax.text(gx, ty+1.65, lab, ha="center", fontsize=8.5, color="#0c7a84")
ax.annotate("", xy=(3.1, ty+1.15), xytext=(7.6, ty+1.15), arrowprops=dict(arrowstyle="<|-|>", color=BL, lw=1.3)); ax.text(5.35, ty+1.22, "$s$", ha="center", fontsize=12, color=BL, fontweight="bold")
ax.plot([1.0+0.0, 12.45], [ty+0.28, ty+0.28], color=INK, lw=1.1)
ax.add_patch(Circle((12.45, ty+0.1), 0.18, fc="white", ec=INK, lw=1.4))
ax.plot([12.63, 12.63], [ty+0.1, -1.6], color=INK, lw=1.1)
ax.add_patch(Rectangle((12.25, -1.9), 0.75, 0.3, fc="white", ec=INK, lw=1.4))
for i in range(4): ax.add_patch(Rectangle((12.32, -2.2-i*0.28), 0.62, 0.24, fc="#e8956a", ec=INK, lw=0.8))
ax.text(11.7, -2.25, "hanger and\nslotted masses", ha="right", fontsize=8.5, color=INK, va="center")
ax.text(0.1, ty-1.25, "trolley with slotted masses", fontsize=8.5, color=INK, va="center")
ax.text(12.0, ty+1.2, "pulley", fontsize=8.5, color=INK, ha="center")
arrow(ax, 12.63, -2.5, 12.63, -3.1, c=BL, lw=2.2); ax.text(11.5, -3.1, "weight $F = m_h g$", fontsize=9, color=BL, ha="right", va="center")
ax.text(3.6, ty-1.75, "track: tilt it slightly (pulley end lower) to compensate for friction", fontsize=8.5, color=INK)
fig.savefig("fig_rig.png", bbox_inches="tight", pad_inches=0.05); plt.close(fig)

# ---- Figure 2: free body diagrams ----
fig, axs = plt.subplots(1, 2, figsize=(6.6, 2.7), dpi=200, gridspec_kw={"width_ratios": [1.5, 1]})
ax = axs[0]; ax.set_xlim(-3, 3.6); ax.set_ylim(-2.2, 2.2); ax.axis("off"); ax.set_title("Trolley (mass $M$)", fontsize=10, fontweight="bold")
ax.add_patch(Rectangle((-0.9, -0.4), 1.8, 0.8, fc="#cfe0f7", ec=INK, lw=1.4, zorder=3))
arrow(ax, 0, 0, 0, -1.7, c=BL); ax.text(0.12, -1.7, "$W = Mg$", color=BL, fontsize=10, va="top")
arrow(ax, 0, 0, 0, 1.7, c=GRN); ax.text(0.12, 1.7, "$N$", color=GRN, fontsize=10, va="bottom")
arrow(ax, 0.9, 0, 2.6, 0, c=OR); ax.text(2.7, 0, "$T$", color=OR, fontsize=10, va="center")
arrow(ax, -0.9, 0, -2.4, 0, c="#9b2d78"); ax.text(-2.5, 0.12, "$f$", color="#9b2d78", fontsize=10, ha="right", va="bottom")
ax = axs[1]; ax.set_xlim(-2, 2.6); ax.set_ylim(-2.2, 2.2); ax.axis("off"); ax.set_title("Hanger (mass $m_h$)", fontsize=10, fontweight="bold")
ax.add_patch(Rectangle((-0.6, -0.35), 1.2, 0.7, fc="#f6e3c4", ec=INK, lw=1.4, zorder=3))
arrow(ax, 0, 0.35, 0, 1.8, c=OR); ax.text(0.12, 1.75, "$T$", color=OR, fontsize=10, va="bottom")
arrow(ax, 0, -0.35, 0, -1.8, c=BL); ax.text(0.12, -1.8, "$W = m_h g$", color=BL, fontsize=10, va="top")
fig.subplots_adjust(wspace=0.02); save(fig, "fig_fbd.png")

# ---- Figure 3 and 4: motion graphs for one run ----
m1, m2 = d["m1"], d["m2"]; TM = 1.8
def motion(fname, show, ghost):
    fig, axs = plt.subplots(1, 3, figsize=(7.0, 2.6), dpi=200)
    defs = [("$s$ / m", 1.2, 0.2), ("$v$ / m s$^{-1}$", 1.6, 0.4), ("$a$ / m s$^{-2}$", 1.6, 0.4)]
    for ax, (yl, ym, ys) in zip(axs, defs): gridax(ax, TM, ym, "$t$ / s", yl, 0.2, ys)
    def draw(m, col, lw, ls="-"):
        a = m["a"]; axs[0].plot(m["t"], m["s"], color=col, lw=lw, ls=ls); axs[1].plot(m["t"], m["v"], color=col, lw=lw, ls=ls); axs[2].plot([0, m["T"]], [a, a], color=col, lw=lw, ls=ls)
    if ghost: draw(m1, GR, 2.2)
    if show: draw(m1, BL, 2.2)
    for ax, l in zip(axs, ("(a)", "(b)", "(c)")): ax.text(-0.02, 1.08, l, transform=ax.transAxes, fontsize=10, fontweight="bold", color=INK)
    fig.tight_layout(w_pad=1.2); save(fig, fname)
motion("fig_motion_given.png", True, False); motion("fig_motion_sketch.png", False, True)

# ---- blank graph paper and sketch axes ----
blank_grid("grid_a_F.png", "force, $F$ / N", "acceleration, $a$ / m s$^{-2}$", size=(6.2, 3.4))
blank_grid("grid_a_invm.png", "$1/m$ / kg$^{-1}$", "acceleration, $a$ / m s$^{-2}$", size=(6.2, 3.4))
blank_grid("grid_s_t2.png", "$t^{2}$ / s$^{2}$", "distance, $s$ / m", size=(6.2, 3.4))
blank_grid("grid_v2_d.png", "distance between gates, $s$ / m", "$v^{2} - u^{2}$ / m$^{2}$ s$^{-2}$", size=(6.2, 3.4))
blank_grid("grid_a_sin.png", "$\\sin\\theta$", "acceleration, $a$ / m s$^{-2}$", size=(6.2, 3.2))
sketch_axes("pred_axes.png", "force, $F$", "acceleration, $a$")
print("figures ok")
