#!/usr/bin/env python3
"""BGM 试听：把几首候选 BGM 分别配到口播开头一小段上，拼成一条连播给用户挑。

用法:
  python3 bgm_audition.py <视频> <输出目录> --track "名字=路径@起点秒" --track ... [--t0 0] [--dur 8] [--rel -11] [--crop34]

- 视频：粗剪后的 public/footage34.mp4（已是 3:4），或原片（竖屏就加 --crop34 按中上裁成 3:4）。
- 每首：从「起点秒」截 dur 秒（避开前奏空白，挑已经进拍的地方），按整段响度把 BGM 调到比人声低 rel dB，
  左上角写「BGM 编号 名字」，单独存一条，再拼成 00_全部连播.mp4。
- 经验值：试听每首 8 秒；比人声低 20dB 几乎听不见，试听用 -11 左右；成片 BGM 用 -15 左右（plan.meta.bgm.volume 按这个换算）。
- 坑：候选 BGM 的采样率不一（44.1k / 48k），拼接时一律重采样到 48k 并重新编码；用 concat 滤镜，不用 -c copy（会把人声拉高变调）。
"""
import argparse, os, re, subprocess, sys
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("out")
ap.add_argument("--track", action="append", required=True, help="名字=路径@起点秒")
ap.add_argument("--t0", type=float, default=0); ap.add_argument("--dur", type=float, default=8)
ap.add_argument("--rel", type=float, default=-11); ap.add_argument("--crop34", action="store_true")
a = ap.parse_args()
out = Path(a.out); out.mkdir(parents=True, exist_ok=True)


def lufs(path, ss, dur):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", str(ss), "-t", str(dur), "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1])


try:
    from PIL import Image, ImageDraw, ImageFont
    FONT = ImageFont.truetype("/System/Library/Fonts/Hiragino Sans GB.ttc", 44)
except Exception:
    Image = None

# 先截出口播这一段（统一 48k）
clip = out / "_voice.mov"
vf = "crop=iw:iw*4/3:0:(ih-iw*4/3)*0.35,scale=1080:1440" if a.crop34 else "scale=1080:1440"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a.t0), "-t", str(a.dur), "-i", a.video, "-vf", vf, "-c:v", "libx264", "-crf", "16", "-c:a", "pcm_s16le", "-ar", "48000", str(clip)], check=True)
voice = lufs(str(clip), 0, a.dur)
parts = []
for i, spec in enumerate(a.track, 1):
    name, rest = spec.split("=", 1)
    path, _, ss = rest.rpartition("@")
    ss = float(ss or 0)
    gain = voice + a.rel - lufs(path, ss, a.dur)
    dst = out / f"BGM{i:02d}_{name}.mp4"
    inputs = ["-i", str(clip), "-ss", str(ss), "-i", path]
    fc = (f"[1:a]atrim=0:{a.dur},asetpts=PTS-STARTPTS,aresample=48000,volume={gain:.2f}dB,afade=t=in:d=0.4,afade=t=out:st={a.dur - 0.8}:d=0.8[b];"
          f"[0:a][b]amix=inputs=2:normalize=0:duration=first,aresample=48000[a]")
    if Image:
        im = Image.new("RGBA", (1080, 120), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        txt = f"BGM {i:02d}  {name}"; w = d.textlength(txt, font=FONT)
        d.rounded_rectangle((40, 30, 40 + w + 48, 110), 24, fill=(20, 20, 20, 180)); d.text((64, 42), txt, font=FONT, fill=(255, 214, 0, 255))
        lab = out / f"_lab{i}.png"; im.save(lab)
        inputs += ["-i", str(lab)]; fc += ";[0:v][2:v]overlay=0:40[v]"
    else:
        fc += ";[0:v]null[v]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-ar", "48000", "-b:a", "256k", str(dst)], check=True)
    parts.append(dst); print(f"{i:02d} {name}  起点{ss}s  增益{gain:+.1f}dB")
args = []
for p in parts: args += ["-i", str(p)]
fc = "".join(f"[{k}:v][{k}:a]" for k in range(len(parts))) + f"concat=n={len(parts)}:v=1:a=1[v][a]"
subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-ar", "48000", "-b:a", "256k", str(out / "00_全部连播.mp4")], check=True)
for f in out.glob("_*"): f.unlink()
print(f"连播 → {out / '00_全部连播.mp4'}")
