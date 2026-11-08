import sys; sys.path.insert(0, '../../tools/worksheet-kit')
from figkit import *
import os
d = load_data()
os.makedirs('../img', exist_ok=True)

def graph(name, series, xmax, ymax, xl, yl, xs, ys, size=(5.6, 3.5), labels=None):
    fig, ax = plt.subplots(figsize=size, dpi=200)
    gridax(ax, xmax, ymax, xl, yl, xs, ys)
    for (x, y, c, lab) in series:
        ax.plot(x, y, color=c, lw=2.2, label=lab)
    if labels: ax.legend(frameon=False, fontsize=9, loc="upper right")
    fig.tight_layout()
    for p in (name, '../img/' + name):
        fig.savefig(p, pad_inches=0.05)
    plt.close(fig)

q = d['q3']
graph('fig_q3.png', [(q['t'], q['A'], BL, None)], 40, 700, 'time, $t$ / days', 'activity, $A$ / Bq', 4, 100)
q = d['q12']
graph('fig_q12.png', [(q['t'], q['total'], BL, None)], 96, 2000, 'time, $t$ / hours', 'total activity, $A$ / Bq', 12, 200)
q = d['q13']
graph('fig_q13.png', [(q['t'], q['X'], OR, 'Sample X'), (q['t'], q['Y'], BL, 'Sample Y')], 36, 100, 'time, $t$ / hours', 'activity, $A$ / arbitrary units', 4, 10, labels=True)

# Geiger counter bench diagram (no numbers): used by Q17
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle
fig, ax = plt.subplots(figsize=(5.8, 2.9), dpi=200); ax.set_xlim(0, 120); ax.set_ylim(0, 62); ax.axis('off')
ax.add_patch(Rectangle((2, 12), 116, 4, fc='#e9eef5', ec='#222', lw=1.5))                      # bench
ax.add_patch(Rectangle((6, 4), 3, 8, fc='#e9eef5', ec='#222', lw=1.2)); ax.add_patch(Rectangle((111, 4), 3, 8, fc='#e9eef5', ec='#222', lw=1.2))
ax.add_patch(Rectangle((46, 16), 18, 3, fc='#e9eef5', ec='#222', lw=1.2)); ax.add_patch(Rectangle((54, 19), 2, 14, fc='#e9eef5', ec='#222', lw=1.2))   # stand
ax.add_patch(FancyBboxPatch((26, 31), 36, 8, boxstyle='round,pad=0,rounding_size=4', fc='#fdeee3', ec='#222', lw=1.5))   # GM tube
ax.plot([27, 27], [32.5, 37.5], color='#c8501e', lw=2.5)
ax.text(44, 26, 'Geiger-Müller tube', ha='center', fontsize=8)
ax.add_patch(FancyBboxPatch((82, 18), 34, 34, boxstyle='round,pad=0,rounding_size=2', fc='#fdeee3', ec='#222', lw=1.5))
ax.add_patch(Rectangle((86, 38), 26, 10, fc='#13222b', ec='#222')); ax.text(99, 41.5, '- - -', color='white', ha='center', fontsize=10, family='monospace')
ax.text(99, 30, 'counter', ha='center', fontsize=8)
ax.plot([62, 72, 72, 82], [35, 35, 28, 28], color='#222', lw=1.5)
for x0 in (30, 42, 54): ax.annotate('', xy=(x0, 41), xytext=(x0 + 7, 56), arrowprops=dict(arrowstyle='->', ls='--', color='#777', lw=1.2))
ax.text(60, 58.5, 'background radiation (always there)', ha='center', fontsize=8, color='#555')
ax.add_patch(Rectangle((7, 17), 6, 15, fc='#e9eef5', ec='#222', lw=1.2)); ax.add_patch(Circle((10, 36), 2.2, fc='#c8501e', ec='#222', lw=1.2))
ax.text(10, 41, 'source', ha='center', fontsize=8); ax.annotate('', xy=(26, 22), xytext=(10, 22), arrowprops=dict(arrowstyle='<->', color='#555', lw=1)); ax.text(18, 23.5, '5 cm', ha='center', fontsize=7)
ax.add_patch(Rectangle((5, 49), 10, 6, fc='#9aa4ad', ec='#222', lw=1.2)); ax.text(10, 56.5, 'lead-lined box', ha='center', fontsize=7)
fig.tight_layout()
for p in ('fig_bench.png', '../img/fig_bench.png'): fig.savefig(p, pad_inches=0.05)
plt.close(fig)
print('figures ok')
