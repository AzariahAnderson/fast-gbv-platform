"""Verification gate bar chart for the FAST v1.1.5 release report (DM-1 palette)."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# Register CJK-safe font (labels are English; DejaVu covers everything)
for fp in ["/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf"]:
    try:
        fm.fontManager.addfont(fp)
    except Exception:
        pass
plt.rcParams["font.sans-serif"] = ["DejaVu Sans", "Noto Sans SC"]
plt.rcParams["axes.unicode_minus"] = False

# Darkened DM-1 table accent (#1B6B7A) family for white-page charts
ACCENT = "#1B6B7A"
GRID = "#C8DDE2"
TEXT = "#333333"

categories = [
    "Unit tests\n(vitest)",
    "Route battery\n(58 checks)",
    "Link audit\n(fragments/routes/tel)",
    "Playwright smoke\n(public flows)",
    "Playwright auth e2e\n(needs credentials)",
]
values = [46, 58, 92, 14, 48]
colors = [ACCENT, ACCENT, ACCENT, ACCENT, "#9BB8BF"]  # last layer = gated/skipped

fig, ax = plt.subplots(figsize=(10, 5.6), constrained_layout=True)
bars = ax.bar(categories, values, color=colors, width=0.62, edgecolor="white")

for bar, val in zip(bars, values):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(values) * 0.02,
            str(val), ha="center", va="bottom", fontsize=11, color=TEXT, fontweight="bold")

ax.set_title("Fresh verification gate, 26 November 2026 - checks per test layer",
             fontsize=13, pad=14, color=TEXT)
ax.set_ylabel("Checks / cases in the layer", fontsize=11, color=TEXT)
ax.tick_params(axis="x", labelsize=9.5)
ax.tick_params(axis="y", labelsize=10)
ax.spines[["top", "right"]].set_visible(False)
ax.grid(axis="y", alpha=0.35, color=GRID)
ax.set_ylim(0, 108)

# Annotation: what actually ran vs. skipped
ax.annotate("46/46 pass", xy=(0, 46), xytext=(0, 60), ha="center",
            fontsize=9, color=ACCENT, arrowprops=dict(arrowstyle="-", color=ACCENT, alpha=0))
ax.annotate("58/58 pass", xy=(1, 58), xytext=(1, 72), ha="center",
            fontsize=9, color=ACCENT, arrowprops=dict(arrowstyle="-", color=ACCENT, alpha=0))
ax.annotate("91 ok, 1 note", xy=(2, 92), xytext=(2, 102), ha="center",
            fontsize=9, color=ACCENT, arrowprops=dict(arrowstyle="-", color=ACCENT, alpha=0))
ax.annotate("14 pass / 14 gated-skip", xy=(3, 14), xytext=(3, 30), ha="center",
            fontsize=9, color=ACCENT, arrowprops=dict(arrowstyle="-", color=ACCENT, alpha=0))
ax.annotate("48 skip by design\n(no TEST_USER creds)", xy=(4, 48), xytext=(4, 68), ha="center",
            fontsize=9, color="#5A7A82", arrowprops=dict(arrowstyle="-", color=ACCENT, alpha=0))

fig.savefig("/home/z/my-project/scripts/report-assets/gate-chart.png",
            dpi=200, facecolor="white", edgecolor="none")
print("chart saved")
