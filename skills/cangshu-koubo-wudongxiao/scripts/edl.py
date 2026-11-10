#!/usr/bin/env python3
"""剪辑表工具（所有时间：剪辑后 = 当前 cut.mp4 的时间，原片 = edl.json 里 source 的时间）。

  edl.py map <工程> <剪辑后秒>...
      剪辑后时间 → 原片时间（按 cut_pieces.json）。存消音位置、核对剪点用。

  edl.py rebuild <工程> [--remove 起-止 ...] [--pause-max 0.4] [--thr -32] [--lead 0.06] [--tail 0.08] [--min-piece 0.3]
      以当前剪辑（cut_pieces.json）为底重写 edl.json，一次做完四件事：
        1. 删 --remove 给的口误区间（剪辑后时间，可以给多段）；
        2. 段内超过 --pause-max 秒的停顿（< --thr dB，换气也算）从中间切开；
        3. 每个剪点两侧的空白收到段尾留 --tail、段头留 --lead（合计约 0.14 秒）；
        4. 删掉短于 --min-piece 秒的碎片。
      系列片头（第 0 段）整段不动；响指那段（第 1 段）的开头不动。edl.json 顶层写了 "intro": false（没有系列片头）时第 0 段也照常处理。写出的 keep 都是 h=both、pause=false 的精确边界。
      改之前存一份 edl_改前.json。跑完重新 cut_takes.py。"""
import argparse, json, subprocess, sys
from pathlib import Path
import numpy as np

ap = argparse.ArgumentParser(); ap.add_argument("cmd", choices=["map", "rebuild"]); ap.add_argument("proj")
ap.add_argument("times", nargs="*", type=float)
ap.add_argument("--remove", nargs="*", default=[]); ap.add_argument("--pause-max", type=float, default=0.4)
ap.add_argument("--thr", type=float, default=-32); ap.add_argument("--lead", type=float, default=0.06)
ap.add_argument("--tail", type=float, default=0.08); ap.add_argument("--min-piece", type=float, default=0.3)
a = ap.parse_args(); P = Path(a.proj)
pcs = json.loads((P / "cut_pieces.json").read_text())

def piece_at(t): return max((p for p in pcs if p["at"] <= t + 1e-6), key=lambda p: p["at"])
if a.cmd == "map":
    for t in a.times:
        p = piece_at(t); print(f"剪辑后 {t:.3f} → 原片 {p['src_from'] + t - p['at']:.3f}")
    sys.exit()

edl = json.loads((P / "edl.json").read_text()); INTRO = edl.get("intro", True); (P / "edl_改前.json").write_text(json.dumps(edl, ensure_ascii=False, indent=1))
SR, HOP = 16000, 160
pcm = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", edl["source"], "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                   capture_output=True, check=True).stdout, np.float32)
db = 20 * np.log10(np.array([np.sqrt(np.mean(pcm[i:i + HOP] ** 2)) for i in range(0, len(pcm) - HOP, HOP)]) + 1e-9)
loud = db > a.thr; L = len(loud)
def voiced(i): return all(loud[min(max(i + d, 0), L - 1)] for d in (0, 1, 2))  # 连着 30ms 有声才算，防爆音和杂点

rm = sorted(tuple(map(float, r.split("-"))) for r in a.remove)
# 1. 每个小段减掉口误区间，换成原片区间；tag = (第几小段, 是不是这一小段的第一截)
segs = []
for k, p in enumerate(pcs):
    a0 = p["at"]; b0 = a0 + p["src_to"] - p["src_from"]; cur = a0; first = True
    for x, y in rm:
        if y <= a0 or x >= b0: continue
        x, y = max(x, a0), min(y, b0)
        if x - cur > 1e-3: segs.append([p["src_from"] + cur - a0, p["src_from"] + x - a0, k, first]); first = False
        cur = y
    if b0 - cur > 1e-3: segs.append([p["src_from"] + cur - a0, p["src_from"] + b0 - a0, k, first])
# 2. 段内长停顿从中间切开（片头段不切）
out, npause = [], 0
for s, e, k, first in segs:
    if k == 0 and INTRO: out.append([s, e, k, first]); continue
    i, i1, cur, fst = int(s * 100), int(e * 100), s, first
    while i < i1:
        if not voiced(i):
            j = i
            while j < i1 and not voiced(j): j += 1
            if (j - i) / 100 > a.pause_max and i > int(s * 100) and j < i1:
                mid = (i + j) / 200; out.append([cur, mid, k, fst]); cur, fst = mid, False; npause += 1
            i = j
        else: i += 1
    out.append([cur, e, k, fst])
# 3. 剪点两侧空白收紧；4. 删碎片
keep, trimmed, dropped = [], 0.0, []
for s, e, k, first in out:
    if k == 0 and INTRO: keep.append((s, e)); continue
    head_fixed = INTRO and k == 1 and first  # 响指那段的开头是手调的入点，不动
    if not head_fixed:
        i = int(s * 100)
        while i < int(e * 100) and not voiced(i): i += 1
        ns = max(s, i / 100 - a.lead); trimmed += ns - s; s = ns
    j = int(e * 100) - 1
    while j > int(s * 100) and not voiced(j - 2): j -= 1
    ne = min(e, j / 100 + a.tail); trimmed += e - ne; e = ne
    if not head_fixed and e - s < a.min_piece: dropped.append((round(s, 2), round(e, 2))); continue
    keep.append((s, e))
first_k = dict(edl["keep"][0], **{"from": round(keep[0][0], 4), "to": round(keep[0][1], 4), "h": "both", "pause": False}) if INTRO else {"from": round(keep[0][0], 4), "to": round(keep[0][1], 4), "h": "both", "pause": False}
edl["keep"] = [first_k] + [{"from": round(s, 4), "to": round(e, 4), "h": "both", "pause": False} for s, e in keep[1:]]
(P / "edl.json").write_text(json.dumps(edl, ensure_ascii=False, indent=1))
print(f"{len(edl['keep'])} 个 keep：删口误 {len(rm)} 处共 {sum(y - x for x, y in rm):.2f}s，切开长停顿 {npause} 处，剪点两侧收掉 {trimmed:.2f}s，删碎片 {dropped}")
print("下一步：cut_takes.py 重剪")
