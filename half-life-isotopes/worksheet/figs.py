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
print('figures ok')
