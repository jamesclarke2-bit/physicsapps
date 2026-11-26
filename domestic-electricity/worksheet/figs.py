import sys; sys.path.insert(0, '../../tools/worksheet-kit')
from figkit import *
from matplotlib.path import Path
from matplotlib.patches import PathPatch, FancyBboxPatch
d = load_data()
BRN = "#7a4a21"

# Figure 1: blank voltage-time axes for d.c. and a.c.
fig, axs = plt.subplots(1, 2, figsize=(6.6, 2.1), dpi=200)
for ax, title in zip(axs, ["Cell (d.c.)", "Mains (a.c.)"]):
    ax.set_xlim(0, 10); ax.set_ylim(-1.25, 1.25); ax.set_xticks(range(0, 11)); ax.set_yticks([-1, -0.5, 0, 0.5, 1])
    ax.grid(color="#dfe4ea", lw=0.5); ax.set_xticklabels([]); ax.set_yticklabels([]); ax.tick_params(length=0)
    for s in ax.spines.values(): s.set_visible(False)
    ax.annotate("", xy=(10.2, 0), xytext=(0, 0), arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.2), annotation_clip=False)
    ax.annotate("", xy=(0, 1.32), xytext=(0, -1.25), arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.2), annotation_clip=False)
    ax.text(-0.35, 1, "+", ha="right", va="center", fontsize=10); ax.text(-0.35, 0, "0", ha="right", va="center", fontsize=9); ax.text(-0.35, -1, "−", ha="right", va="center", fontsize=10)
    ax.text(10.1, -0.2, "time", ha="right", va="top", fontsize=8.5); ax.text(0.2, 1.3, "voltage", ha="left", va="center", fontsize=8.5)
    ax.set_title(title, fontsize=10, fontweight="bold", color=INK, pad=8)
fig.tight_layout(w_pad=3); save(fig, "fig_acdc.png")

# Figure 2: earthed metal kettle
fig, ax = plt.subplots(figsize=(6.6, 3.2), dpi=200); ax.set_xlim(0, 90); ax.set_ylim(0, 46); ax.axis("off")
Y = lambda y: 46 - y / 10
ax.add_patch(Rectangle((0, 0), 90, 4, fc="#e3ece4", ec="none")); ax.plot([0, 90], [4, 4], color=INK, lw=1.4)
ax.text(89, 1.3, "the ground: earth, 0 V", ha="right", fontsize=8)
ax.add_patch(FancyBboxPatch((2, Y(310)), 11, 22, boxstyle="round,pad=0,rounding_size=1", fc="white", ec=INK, lw=1.4))
ax.text(7.5, Y(76), "mains socket", ha="center", fontsize=8)
for lab, y in (("L", 130), ("N", 200), ("E", 270)): ax.text(4.2, Y(y), lab, fontsize=10, fontweight="bold", va="center")
ax.plot([13, 22], [Y(130)] * 2, color=BRN, lw=2.6); ax.plot([30, 52], [Y(130)] * 2, color=BRN, lw=2.6)
ax.add_patch(Rectangle((22, Y(130) - 1.4), 8, 2.8, fc="white", ec=INK, lw=1.2)); ax.plot([22.6, 29.4], [Y(130)] * 2, color=GR, lw=1)
ax.text(26, Y(100), "A", ha="center", fontsize=10, fontweight="bold", color=OR)
ax.plot([52, 13], [Y(200)] * 2, color=BL, lw=2.6)
ax.plot([40, 13], [Y(270)] * 2, color=GRN, lw=2.6, ls=(0, (4, 2))); ax.plot([9, 9], [Y(270), 4], color=GRN, lw=2.6, ls=(0, (4, 2))); ax.plot([13, 9], [Y(270)] * 2, color=GRN, lw=2.6, ls=(0, (4, 2)))
ax.add_patch(FancyBboxPatch((40, Y(340)), 26, 26, boxstyle="round,pad=0,rounding_size=2", fc="#f1f3f6", ec="#7e8ca6", lw=5))
zx = [52, 53.4, 50.6, 53.4, 50.6, 52]; zy = [Y(130), Y(140), Y(156), Y(172), Y(188), Y(200)]
ax.plot(zx, zy, color=OR, lw=2.2); ax.text(55, Y(165), "heating\nelement", fontsize=8, va="center")
ax.text(53, Y(316), "metal case", ha="center", fontsize=9, fontweight="bold")
ax.text(18, Y(120), "B", ha="center", fontsize=10, fontweight="bold", color=OR, va="bottom")
ax.text(30, Y(192), "C", ha="center", fontsize=10, fontweight="bold", color=OR, va="bottom")
ax.text(26, Y(262), "D", ha="center", fontsize=10, fontweight="bold", color=OR, va="bottom")
ax.add_patch(Circle((76, Y(216)), 2.3, fc="white", ec=INK, lw=1.8))
for xs, ys in (([76, 76], [Y(240), Y(335)]), ([76, 74.2], [Y(335), 4]), ([76, 77.8], [Y(335), 4]), ([76, 72.2], [Y(268), Y(318)]), ([76, 80], [Y(268), Y(318)])): ax.plot(xs, ys, color=INK, lw=1.8)
save(fig, "fig_earth.png")

# Figure 3: empty three-pin plug for the student to wire
fig, ax = plt.subplots(figsize=(4.3, 4.1), dpi=200); ax.set_xlim(30, 600); ax.set_ylim(0, 600); ax.axis("off"); ax.set_aspect("equal")
F = lambda y: 610 - y
verts = [(260, 24), (335, 24), (388, 58), (406, 122), (452, 392), (464, 470), (420, 524), (350, 524), (170, 524), (100, 524), (56, 470), (68, 392), (114, 122), (132, 58), (185, 24), (260, 24), (260, 24)]
codes = [Path.MOVETO] + [Path.CURVE4] * 3 + [Path.LINETO] + [Path.CURVE4] * 3 + [Path.LINETO] + [Path.CURVE4] * 3 + [Path.LINETO] + [Path.CURVE4] * 3 + [Path.CLOSEPOLY]
ax.add_patch(PathPatch(Path([(x, F(y)) for x, y in verts], codes), fc="#f6f8fb", ec=INK, lw=1.6))
brass = dict(fc="#e9dcb4", ec=INK, lw=1.1)
def box(x, y, w, h, **k): ax.add_patch(Rectangle((x, F(y + h)), w, h, **k))
box(232, 64, 56, 104, **brass); box(104, 250, 100, 46, **brass); box(318, 232, 100, 42, **brass); box(322, 380, 80, 34, **brass)
box(371, 274, 28, 106, fc="white", ec=INK, lw=1.1); box(368, 280, 34, 18, fc="#c9d0d9", ec=INK, lw=1); box(368, 366, 34, 18, fc="#c9d0d9", ec=INK, lw=1)
for x, y in ((260, 146), (180, 273), (342, 397)): ax.add_patch(Circle((x, F(y)), 13, fc="#b79a4c", ec=INK, lw=1.1))
box(233, 436, 54, 174, fc="#e6eaef", ec=INK, lw=1.1); box(196, 452, 128, 28, fc="#c9d0d9", ec=INK, lw=1.1)
for x in (248, 260, 272): ax.plot([x, x], [F(440), F(416)], color=INK, lw=2.4, solid_capstyle="round")
for x, y in ((300, 96), (62, 222), (430, 222)): box(x, y, 44, 40, fc="white", ec=OR, lw=1.3)
for lab, px, py in (("fuse", 400, 330), ("cable grip", 324, 466), ("cable", 287, 570)):
    ax.plot([px, 486], [F(py)] * 2, color=INK, lw=0.7); ax.text(492, F(py), lab, fontsize=8, va="center")
save(fig, "fig_plug.png")
print("figures ok")
