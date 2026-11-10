#!/usr/bin/env python3
"""身后大字防遮挡：按抠像 alpha 给每个 behind 大字挑一个不被人挡太多的高度。

用法：python3 fit_bigtext.py <工程目录> [--max 0.35] [--dry]
- 读 src/plan.json 里所有 behind=true 的 bigText，读 public/<meta.person> 的 alpha 通道；
- 在大字出现的时间窗里每 0.2 秒取一帧，逐字算被人盖住的比例，取挡得最多的那个字（80 分位，防止某一下抬手被平均掉）；
- 抠像跟着真人层逐帧放大（段内 zoom × 落版回弹 × 慢推 × punch，和 Film.tsx 同一套算法），大字本身不放大；没写 y 时按模板默认 0.05 算；结果总是把 y、x、s 写回 plan；
- meta.person 为空就跳过（模板会把身后大字画到人前面）；
- 先用原字号，在原来那一边、原高度附近找遮挡 ≤ --max 的位置，找不到再试左边、右边，再把字号缩到 85%、72%（不压字幕区，有进度导航时也不顶进顶部进度条）；
- 哪里都挡得太多，就改成 behind=false（放到人前面），并在报告里写出来。
直接改写 plan.json，改之前备份为 plan.before_fit.json。
"""
import json, subprocess, sys, shutil
from pathlib import Path
import numpy as np

W, H, SW, SH = 1080, 1440, 270, 360  # 视频尺寸 / 分析用缩小尺寸
CAPTION_TOP = 1100                    # 字幕区上沿，大字底边不能压进去
HUD_BOTTOM = 90                       # 有进度导航（plan.chapters）时，顶部进度条 30–74px 加余量：大字顶边放大后也不能顶进去


def size_of(text, k=1.0):
    n = len(text)  # 和 overlays.tsx 里身后大字的字号一致
    return (300 if n <= 2 else 230 if n <= 4 else 170) * k


def alpha_frames(src, t0, t1, step=0.2):
    """返回 [帧数, SH, SW] 的 0..1 alpha"""
    cmd = ["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-ss", f"{t0:.3f}", "-t", f"{max(0.2, t1 - t0):.3f}", "-i", str(src),
           "-vf", f"fps={1/step},alphaextract,scale={SW}:{SH}", "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.uint8).astype(np.float32) / 255
    n = len(a) // (SW * SH)
    return a[: n * SW * SH].reshape(n, SH, SW)


def zoom_at(segs, i, t):
    """真人层在时刻 t 的放大倍数，照抄 Film.tsx：段内 zoom × 从图形段回来的落版回弹 × 慢推慢拉（≤8%）× 各次 punch。"""
    seg, prev = segs[i], (segs[i - 1] if i > 0 else None)
    z = seg.get("zoom", 1)
    if prev and prev["world"] != "A" and seg.get("settle", True) is not False:
        u = min(1, max(0, (t - seg["start"]) / 0.35)); z *= 1.15 - 0.15 * (1 - (1 - u) ** 3)
    a_idx = sum(1 for x in segs[:i] if x["world"] == "A")
    d = seg.get("drift") or ("in" if a_idx % 2 == 0 else "out")
    L = max(0.01, seg["end"] - seg["start"]); span = min(0.08, seg.get("driftRate", 0.015) * L); u = (t - seg["start"]) / L
    if d == "in": z *= 1 + span * u
    elif d == "out": z *= 1 + span * (1 - u)
    for pu in seg.get("punch", []):
        v = min(1, max(0, (t - pu["at"]) / 0.25)); z *= 1 + (pu["to"] - 1) * (1 - (1 - v) ** 3)
    return z


def occlusion(frames, text, y, zs=1.0, align="center", k=1.0):
    """逐字算遮挡：返回被挡得最多的那个字的遮挡比例（字被挡一半就认不出了，平均值会掩盖这点）。
    zs：每一帧真人层的放大倍数（以 50% 38% 为原点），屏幕点按它映射回抠像原图坐标。"""
    zs = np.broadcast_to(np.asarray(zs, dtype=float), (len(frames),))
    s = size_of(text, k)
    n = len(text)
    cw = s * 0.96 if any(ord(c) > 0x2E80 for c in text) else s * 0.62
    tw = min(W, int(n * cw))
    x0 = {"center": (W - tw) / 2, "left": 60, "right": W - 60 - tw}[align]
    y0, y1 = y * H, y * H + s * 0.92
    ox, oy = W * 0.5, H * 0.38
    worst = 0.0
    for i in range(n):
        a, b = x0 + i * tw / n, x0 + (i + 1) * tw / n
        per = []
        for f, z in zip(frames, zs):
            unz = lambda v, o: (v - o) / z + o
            sx0, sx1 = int(unz(a, ox) * SW / W), int(unz(b, ox) * SW / W)
            sy0, sy1 = int(unz(y0, oy) * SH / H), int(unz(y1, oy) * SH / H)
            sx0, sy0 = max(0, sx0), max(0, sy0)
            sx1, sy1 = min(SW, max(sx0 + 1, sx1)), min(SH, max(sy0 + 1, sy1))
            per.append(f[sy0:sy1, sx0:sx1].mean())
        worst = max(worst, float(np.percentile(per, 80)))
    return worst


def main():
    root = Path(sys.argv[1])
    mx = float(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 0.35
    dry = "--dry" in sys.argv
    plan_p = root / "src/plan.json"
    plan = json.loads(plan_p.read_text())
    name = plan["meta"].get("person")
    if not name:  # 和 Film.tsx 一致：没有抠像时身后大字画在前景，不用算遮挡
        print("meta.person 为空：没有抠像，身后大字会画在人前面，跳过"); return
    person = root / "public" / name
    if not person.is_file():
        sys.exit(f"找不到抠像 {person}")
    changed = []
    segs = plan["segments"]
    for si, seg in enumerate(segs):
        if seg.get("world") != "A":
            continue
        for o in seg.get("overlays", []):
            if o.get("type") != "bigText" or not o.get("behind"):
                continue
            t0, t1 = o["at"], o.get("until", seg["end"])
            fr = alpha_frames(person, t0, t1)
            z = [zoom_at(segs, si, t0 + 0.2 * j) for j in range(len(fr))]  # 每一帧的真人层放大倍数
            y_orig = o.get("y", 0.05)  # 和 overlays.tsx 里身后大字的默认高度一致
            s = size_of(o["text"])
            ymax = (CAPTION_TOP - s * 0.92) / H
            a_orig = o.get("x", "center")
            # 身后大字画在真人放大层外面（只有抠像跟着放大），墨迹顶端 ≈ y·H + 0.08 个字号，要落在进度条下面
            ymin = lambda k: (HUD_BOTTOM - 0.08 * size_of(o["text"], k)) / H if plan.get("chapters") else 0.0
            ys = sorted({round(y_orig, 3), *[round(v, 3) for v in np.arange(0.02, ymax, 0.01)]}, key=lambda v: abs(v - y_orig))
            # 先试原来的左右位置，再试另外两边；同一边里离原高度越近越好
            # 字号也可以缩：先原字号，再 85%、72%
            cands = [(a, y, k) for k in (1.0, 0.85, 0.72) for a in [a_orig] + [x for x in ("left", "right", "center") if x != a_orig] for y in ys]
            occ0 = occlusion(fr, o["text"], y_orig, z, a_orig, o.get("s", 1.0))
            if y_orig < ymin(o.get("s", 1.0)): occ0 = 1.0  # 原位置顶进了进度条：当作不合格，必须挪
            best = None
            for a, y, k in cands:
                if y * H + size_of(o["text"], k) * 0.92 > CAPTION_TOP or y < ymin(k): continue
                oc = occlusion(fr, o["text"], y, z, a, k)
                if oc <= mx:
                    best = (y, oc, a, k)
                    break
            if occ0 <= mx:
                changed.append(f"「{o['text']}」{t0:.2f}s 原位置 y={y_orig} 遮挡 {occ0:.0%}，不动")
                o["y"], o["x"], o["s"] = y_orig, a_orig, o.get("s", 1.0)  # 写明位置：模板和本脚本按同一个位置算
            elif best:
                changed.append(f"「{o['text']}」{t0:.2f}s {a_orig}/y{y_orig} → {best[2]}/y{best[0]}/字号×{best[3]}，遮挡 {occ0:.0%} → {best[1]:.0%}")
                o["y"], o["x"], o["s"] = best[0], best[2], best[3]
            else:
                changed.append(f"「{o['text']}」{t0:.2f}s 哪个高度都挡 >{mx:.0%}（原 {occ0:.0%}），改到人前面")
                o["behind"] = False
    print("\n".join(changed) or "没有身后大字")
    if not dry and changed:
        shutil.copy(plan_p, root / "src/plan.before_fit.json")
        plan_p.write_text(json.dumps(plan, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
