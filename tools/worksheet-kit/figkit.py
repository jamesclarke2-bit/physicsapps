"""Figure helpers for worksheets (matplotlib). Import from <app>/worksheet/figs.py:
    import sys; sys.path.insert(0, '../../tools/worksheet-kit'); from figkit import *
House style: same blue/orange as the apps, print-safe, 200 dpi PNGs, labelled axes with units ("t / s")."""
import json, numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle, FancyArrowPatch, Rectangle

BL = "#1f5fa8"; OR = "#d9660b"; GR = "#9aa5b1"; INK = "#1d2733"; GRN = "#2a8a57"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "mathtext.fontset": "dejavusans"})

def load_data(path="data.json"):
    """data.json is written by build_data.cjs from the app's model.js. Never type model numbers into figures by hand."""
    return json.load(open(path))

def arrow(ax, x0, y0, x1, y1, c=BL, lw=2.6, style="-|>"):
    ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle=style, mutation_scale=16, lw=lw, color=c, zorder=6))

def dim_arrow(ax, x0, y0, x1, y1, c=BL, lw=1.6):
    arrow(ax, x0, y0, x1, y1, c=c, lw=lw, style="<|-|>")

def gridax(ax, xmax, ymax, xlabel, ylabel, xstep, ystep, xmin=0, ymin=0):
    """Scientific grid: major lines every step, minor every fifth, labelled axes."""
    ax.set_xlim(xmin, xmax); ax.set_ylim(ymin, ymax)
    ax.set_xticks(np.arange(xmin, xmax + 1e-9, xstep)); ax.set_yticks(np.arange(ymin, ymax + 1e-9, ystep))
    ax.set_xticks(np.arange(xmin, xmax + 1e-9, xstep / 5), minor=True); ax.set_yticks(np.arange(ymin, ymax + 1e-9, ystep / 5), minor=True)
    ax.grid(which="major", color="#b8c2cc", lw=0.8); ax.grid(which="minor", color="#e1e6eb", lw=0.4)
    ax.set_xlabel(xlabel); ax.set_ylabel(ylabel)
    for s in ("top", "right"): ax.spines[s].set_visible(False)
    ax.tick_params(labelsize=8)

def blank_grid(fname, xlabel, ylabel, size=(6.4, 3.6), nx=10, ny=10):
    """Empty graph paper for student plots: no tick numbers, so students choose and label their own scales."""
    fig, ax = plt.subplots(figsize=size, dpi=200)
    ax.set_xlim(0, nx); ax.set_ylim(0, ny)
    ax.set_xticks(range(0, nx + 1)); ax.set_yticks(range(0, ny + 1))
    ax.set_xticks(np.arange(0, nx, 0.2), minor=True); ax.set_yticks(np.arange(0, ny, 0.2), minor=True)
    ax.grid(which="major", color="#a9b4bf", lw=0.8); ax.grid(which="minor", color="#e3e8ed", lw=0.35)
    ax.set_xticklabels([]); ax.set_yticklabels([]); ax.tick_params(which="both", length=0)
    ax.set_xlabel(xlabel, fontsize=10.5); ax.set_ylabel(ylabel, fontsize=10.5)
    for s in ax.spines.values(): s.set_color(INK)
    fig.tight_layout(); fig.savefig(fname, pad_inches=0.05); plt.close(fig)

def sketch_axes(fname, xlabel, ylabel, size=(3.1, 2.5)):
    """Axes with arrows and no scale, for sketching a prediction."""
    fig, ax = plt.subplots(figsize=size, dpi=200)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.set_xticks([]); ax.set_yticks([])
    ax.annotate("", xy=(1.0, 0), xytext=(0, 0), arrowprops=dict(arrowstyle="-|>", color=INK))
    ax.annotate("", xy=(0, 1.0), xytext=(0, 0), arrowprops=dict(arrowstyle="-|>", color=INK))
    ax.set_xlabel(xlabel); ax.set_ylabel(ylabel)
    for s in ax.spines.values(): s.set_visible(False)
    ax.grid(color="#e3e8ed", lw=0.5)
    fig.tight_layout(); fig.savefig(fname, pad_inches=0.05); plt.close(fig)

def save(fig, fname):
    fig.savefig(fname, bbox_inches="tight", pad_inches=0.05); plt.close(fig)
