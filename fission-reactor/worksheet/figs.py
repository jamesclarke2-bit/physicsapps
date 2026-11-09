import sys; sys.path.insert(0, '../../tools/worksheet-kit')
from figkit import *
d = load_data()

# Figure 1: the set-up
fig, ax = plt.subplots(figsize=(5.4, 3.6), dpi=200); ax.set_xlim(0, 10); ax.set_ylim(0, 7); ax.axis("off")
px, py, L = 4.2, 6.4, 4.6
th = np.radians(14); bx, by = px + L*np.sin(th), py - L*np.cos(th)
ax.add_patch(Rectangle((2.6, py), 3.2, 0.25, fc=INK, ec=INK))
ax.plot([px, px], [py, py-L-0.7], ls=":", color=GR, lw=1.2)
ax.plot([px, bx], [py, by], color=INK, lw=1.6)
ax.add_patch(Circle((bx, by), 0.3, fc="#e8956a", ec=INK, lw=1.5, zorder=5))
ax.plot([bx, 2*px-bx], [by, by], ls=":", color=GR, lw=1)
ax.add_patch(Circle((2*px-bx, by), 0.3, fc="none", ec=GR, lw=1, ls="--"))
dim_arrow(ax, 2.2, py, 2.2, by)
ax.text(2.05, (py+by)/2, "$L$", color=BL, fontsize=15, ha="right", va="center", fontweight="bold")
ax.annotate("", xy=(bx-0.1, py-1.3), xytext=(px, py-1.3), arrowprops=dict(arrowstyle="<|-|>", color=OR, lw=1.4, connectionstyle="arc3,rad=-0.3"))
ax.text(px+0.55, py-1.9, r"$\theta$", color=OR, fontsize=14)
ax.text(px+0.1, 7.05, "pivot (clamp)", fontsize=9, color=INK)
ax.text(bx+0.5, by-0.2, "bob", fontsize=9, color=INK)
ax.text(9.9, 0.2, "L is measured from the pivot to the centre of the bob", fontsize=8.5, color=INK, ha="right")
ax.add_patch(Circle((8.6, 5.7), 0.7, fc="white", ec=INK, lw=1.5)); ax.plot([8.6, 8.6], [5.7, 6.3], color=INK, lw=1.4); ax.plot([8.6, 8.95], [5.7, 5.5], color=OR, lw=1.4)
ax.text(8.6, 4.6, "timer\nstart: bob passes the\nreference mark", fontsize=8.5, ha="center", va="top", color=INK)
fig.savefig("fig_rig.png", bbox_inches="tight", pad_inches=0.05); plt.close(fig)

blank_grid("grid_T2_L.png", "length, $L$ / m", "$T^{2}$ / s$^{2}$")
sketch_axes("pred_axes.png", "length, $L$", "period, $T$")
print("figures ok")
