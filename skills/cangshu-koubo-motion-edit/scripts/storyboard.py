#!/usr/bin/env python3
"""成片逐帧复查用的分镜拼图：查穿模、越界、两层字叠在一起。
用法:
  连续段：python storyboard.py <成片.mp4> <起始秒> <时长秒> --out <拼图.jpg> [--fps 5] [--cols 6] [--w 240]
  指定时刻：python storyboard.py <成片.mp4> --at 25.1,25.25,25.4 --out <拼图.jpg> [--cols 4] [--w 405]
每格左上角印时间；--hud 在每格画两条红线标出顶部进度条区（屏幕 y 30–74），元素碰到红线以上就是顶进了进度条。
依赖 numpy、opencv-python-headless<5、ffmpeg。"""
import argparse, subprocess
import cv2, numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("t0", nargs="?", type=float); ap.add_argument("dur", nargs="?", type=float)
ap.add_argument("--at", help="逗号分隔的时刻（秒），给了就不用 t0/dur")
ap.add_argument("--out", required=True); ap.add_argument("--fps", type=float, default=5); ap.add_argument("--cols", type=int, default=6)
ap.add_argument("--w", type=int, default=240, help="每格宽度，高按 3:4"); ap.add_argument("--hud", action="store_true")
a = ap.parse_args()
w = a.w; h = int(round(w * 4 / 3))


def grab(t, n=1, fps=None):
    vf = (f"fps={fps}," if fps else "") + f"scale={w}:{h}"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", *(["-t", f"{n / fps:.3f}"] if fps else []), "-i", a.video,
                          *([] if fps else ["-frames:v", "1"]), "-vf", vf, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).copy()


if a.at:
    ts = [float(x) for x in a.at.split(",")]
    frames = [grab(t)[0] for t in ts]
else:
    if a.t0 is None or a.dur is None: ap.error("要么给 起始秒 + 时长秒，要么给 --at")
    frames = list(grab(a.t0, int(round(a.dur * a.fps)), a.fps)); ts = [a.t0 + i / a.fps for i in range(len(frames))]
for f, t in zip(frames, ts):
    if a.hud:
        for y in (30, 74): cv2.line(f, (0, int(y * h / 1440)), (w, int(y * h / 1440)), (0, 0, 255), 1)
    cv2.rectangle(f, (0, 0), (int(w * 0.32), int(h * 0.06)), (0, 0, 0), -1)
    cv2.putText(f, f"{t:.2f}s", (3, int(h * 0.045)), cv2.FONT_HERSHEY_SIMPLEX, w / 520, (0, 230, 255), 1, cv2.LINE_AA)
cols = min(a.cols, len(frames)); rows = (len(frames) + cols - 1) // cols; pad = 3
sheet = np.full((rows * (h + pad) + pad, cols * (w + pad) + pad, 3), 255, np.uint8)
for i, f in enumerate(frames):
    r, c = divmod(i, cols)
    sheet[pad + r * (h + pad): pad + r * (h + pad) + h, pad + c * (w + pad): pad + c * (w + pad) + w] = f
cv2.imwrite(a.out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])
print(a.out, len(frames), "帧")
