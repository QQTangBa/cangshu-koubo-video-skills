#!/usr/bin/env python3
"""拆景切镜素材：把切镜那一帧拆成「空墙 / 左边的物件 / 右边的物件」三层，人像用抠像实时盖在上面。只适合背景左右两侧各有明显物件的机位，分界和颜色阈值按你自己的背景调；两侧没物件就别用拆景，用 fade。

用法：$PY $SK/scripts/split_plates.py <工程>            按 plan.json 里 enter:"split" / exit:"split" 的段生成
      $PY $SK/scripts/split_plates.py <工程> --at 16.6  只做这一秒（试效果）

输出 public/split/f<帧号>_wall.jpg、_left.png、_right.png（帧号 = round(秒 × fps)，Film.tsx 按同样的规则找）。
做法：墙面颜色拟合成平滑渐变（二次多项式）当空墙；和空墙差得多的像素就是东西，按在人像左边还是右边分两层；
被人挡住的那一圈先 inpaint 补上（只补到人像边缘外 70px，再里面就是空墙），东西滑走时露出来的才是墙。
"""
import argparse, json, subprocess, sys
import math
from pathlib import Path
import cv2
import numpy as np


def jsround(x):  # 和 Film.tsx 的 Math.round 一致：.5 往上舍（Python 的 round 往偶数舍，差一帧就找不到图）
    return math.floor(x + 0.5)


ap = argparse.ArgumentParser()
ap.add_argument("proj")
ap.add_argument("--at", type=float, action="append")
ap.add_argument("--debug", action="store_true")
a = ap.parse_args()
P = Path(a.proj)
plan = json.loads((P / "src/plan.json").read_text(encoding="utf-8"))
fps = plan["meta"].get("fps", 30)
out = P / "public/split"
out.mkdir(parents=True, exist_ok=True)


def frames_needed():
    if a.at:
        return sorted({jsround(t * fps) for t in a.at})
    segs = plan["segments"]
    fs = set()
    for i, s in enumerate(segs):
        if s["world"] != "B":
            continue
        if s.get("enter") == "split":
            fs.add(jsround(s["start"] * fps))
        nxt = segs[i + 1] if i + 1 < len(segs) else None
        # 只有显式写了 exit: "split" 才要退场素材（Film.tsx 的 exitOf 默认硬切；变身段退场是实拍叠化，不用两侧物件滑回来）
        if nxt and nxt["world"] == "A" and s.get("exit") == "split":
            fs.add(jsround(s["end"] * fps) - 1)
    return sorted(fs)


def grab(src, f, alpha=False):
    t = f / fps
    if alpha:
        cmd = ["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-ss", f"{t:.4f}", "-i", str(src), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "-"]
        ch = 4
    else:
        cmd = ["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", str(src), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
        ch = 3
    buf = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(buf, np.uint8).reshape(1440, 1080, ch)


H, W = 1440, 1080
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
X, Y = xx / W - 0.5, yy / H - 0.5
BASIS = np.stack([np.ones_like(X), X, Y, X * X, X * Y, Y * Y], -1)


def make(f):
    img = grab(P / "public" / plan["meta"].get("footageSrc", plan["meta"]["footage"]), f).astype(np.float32)  # 原时间线的素材（剪口误前）
    al = grab(P / "public" / plan["meta"].get("personSrc", plan["meta"]["person"]), f, alpha=True)[..., 3]
    person = al > 40
    # 人像的洞（话筒等）补上，免得洞被当成墙
    k15 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    person_d = cv2.dilate(person.astype(np.uint8), k15, iterations=2) > 0
    # 墙：亮、低饱和、不是人
    mx, mn = img.max(-1), img.min(-1)
    sat = (mx - mn) / (mx + 1)
    cand = (~person_d) & (mx > 170) & (sat < 0.16)
    idx = np.flatnonzero(cand.ravel())[::7]
    A = BASIS.reshape(-1, 6)[idx]
    fit = np.zeros((H, W, 3), np.float32)
    for c in range(3):
        b = img[..., c].ravel()[idx]
        coef = np.linalg.lstsq(A, b, rcond=None)[0]
        # 一次重加权：去掉离群的（墙上的影子、书脊）再拟合
        r = np.abs(A @ coef - b)
        keep = r < np.percentile(r, 80)
        coef = np.linalg.lstsq(A[keep], b[keep], rcond=None)[0]
        fit[..., c] = BASIS @ coef
    fit = np.clip(fit, 0, 255)
    # 东西 = 和墙差得多（人挡住的地方先 inpaint）
    clean = cv2.inpaint(img.astype(np.uint8), person_d.astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA).astype(np.float32)
    diff = np.abs(clean - fit).max(-1)
    obj = (diff > 20).astype(np.uint8)
    obj = cv2.morphologyEx(obj, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    obj = cv2.morphologyEx(obj, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)))
    # 人像里面只留贴着边缘 70px 的一圈（两侧物件被人挡住的那一截），再往里就是空墙
    dist = cv2.distanceTransform(person_d.astype(np.uint8), cv2.DIST_L2, 5)
    obj[(person_d) & ((dist > 45) | (diff < 34))] = 0
    # 去掉小碎块、主要长在人像里的块（inpaint 出来的手、衣服色块）
    n, lab, stats, _ = cv2.connectedComponentsWithStats(obj, 8)
    for i in range(1, n):
        m = lab == i
        if stats[i, cv2.CC_STAT_AREA] < 900 or (m & ~person_d).sum() < 0.55 * m.sum():
            obj[m] = 0
    soft = cv2.GaussianBlur(cv2.dilate(obj, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))).astype(np.float32), (0, 0), 2.2)
    soft = np.clip(soft * 1.15, 0, 1)
    # 左右分界：人像在 y 300–700 的水平中心
    cols = np.where(person[300:700].any(0))[0]
    cx = int((cols.min() + cols.max()) / 2) if len(cols) else W // 2
    left = soft * (xx < cx)
    right = soft * (xx >= cx)
    # 空墙：拟合渐变 + 一点原图的细纹理（避免太假）
    rng = np.random.default_rng(f)
    wall = np.clip(fit + cv2.GaussianBlur(rng.normal(0, 2.2, (H, W)).astype(np.float32), (0, 0), 0.8)[..., None], 0, 255)
    cv2.imwrite(str(out / f"f{f}_wall.jpg"), cv2.cvtColor(wall.astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
    for name, m in (("left", left), ("right", right)):
        rgba = np.dstack([clean, m * 255]).astype(np.uint8)
        cv2.imwrite(str(out / f"f{f}_{name}.png"), cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))
    if a.debug:
        dbg = np.vstack([np.hstack([img, wall]), np.hstack([clean * left[..., None] + 40, clean * right[..., None] + 40])])
        cv2.imwrite(str(out / f"f{f}_debug.jpg"), cv2.cvtColor(cv2.resize(np.clip(dbg, 0, 255).astype(np.uint8), (1080, 1440)), cv2.COLOR_RGB2BGR))
    print(f"f{f} ({f / fps:.2f}s) 背景墙颜色中位 {np.median(fit.reshape(-1, 3), 0).astype(int).tolist()} 分界 x={cx}")


fs = frames_needed()
if not fs:
    sys.exit("plan 里没有 enter/exit = split 的图形段")
for f in fs:
    make(f)
