#!/usr/bin/env python3
"""风格样片：同一段（建议挑一段图形段，10 秒左右）按几种画风主题各渲一遍，左上角写风格名，拼成一条连播给用户挑。

用法:
  python3 style_reel.py <工程> <起秒> <止秒> [--themes dark,white,chalk,news] [--out <目录>]
主题名见 style-bible 第 7 节（toon white chalk dark news blue neon water）。只对用 toon.tsx 写的场景有效（lux.tsx 白卡场景色板固定，换主题看不出差别）；合成 ID 是 Style-<主题>（模板 Root 里注册好了）。
只换画风，台词、动作、字幕都不变。拼接一律重采样到 48k、重新编码（不用 -c copy）。
"""
import argparse, subprocess
from pathlib import Path

NAMES = {"toon": "动画片（米黄纸）", "white": "白卡极简", "chalk": "黑板粉笔", "dark": "深色科普（扁平亮色）",
         "news": "报纸拼贴", "blue": "蓝图工程", "neon": "霓虹赛博", "water": "水彩手账"}
ap = argparse.ArgumentParser()
ap.add_argument("project"); ap.add_argument("t0", type=float); ap.add_argument("t1", type=float)
ap.add_argument("--themes", default="dark,white,chalk,news"); ap.add_argument("--out")
a = ap.parse_args()
P = Path(a.project).resolve(); out = Path(a.out) if a.out else P / "out/style_reel"; out.mkdir(parents=True, exist_ok=True)
f0, f1 = round(a.t0 * 30), round(a.t1 * 30) - 1
try:
    from PIL import Image, ImageDraw, ImageFont
    FONT = ImageFont.truetype("/System/Library/Fonts/Hiragino Sans GB.ttc", 44)
except Exception:
    Image = None
parts = []
for i, th in enumerate(a.themes.split(","), 1):
    raw = out / f"_raw_{th}.mp4"
    subprocess.run(["npx", "remotion", "render", "src/index.ts", f"Style-{th}", str(raw), f"--frames={f0}-{f1}", "--crf=16", "--concurrency=8", "--timeout=180000", "--log=error"], cwd=P, check=True)
    name = f"风格{i} {NAMES.get(th, th)}"
    dst = out / f"风格{i}_{th}.mp4"
    inputs = ["-i", str(raw)]; fc = "[0:a]aresample=48000[a]"
    if Image:
        im = Image.new("RGBA", (1080, 120), (0, 0, 0, 0)); d = ImageDraw.Draw(im); w = d.textlength(name, font=FONT)
        d.rounded_rectangle((40, 30, 40 + w + 48, 110), 22, fill=(20, 20, 20, 190)); d.text((64, 42), name, font=FONT, fill=(255, 210, 63, 255))
        lab = out / f"_lab_{th}.png"; im.save(lab); inputs += ["-i", str(lab)]; fc += ";[0:v][1:v]overlay=0:84[v]"
    else:
        fc += ";[0:v]null[v]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-ar", "48000", "-b:a", "256k", str(dst)], check=True)
    parts.append(dst); print("→", dst)
args = []
for p in parts: args += ["-i", str(p)]
fc = "".join(f"[{k}:v][{k}:a]" for k in range(len(parts))) + f"concat=n={len(parts)}:v=1:a=1[v][a]"
subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-ar", "48000", "-b:a", "256k", str(out / "00_风格连播.mp4")], check=True)
for f in out.glob("_*"): f.unlink()
print("连播 →", out / "00_风格连播.mp4")
