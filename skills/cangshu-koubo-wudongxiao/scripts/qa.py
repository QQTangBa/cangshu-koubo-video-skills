#!/usr/bin/env python3
"""成片自查，一条命令出数字（判法见 references/motion.md「自查」）：
  1. 每个剪点：剪点前一帧和融合做完（后 6 帧）比画面左右两条背景的平移，>6px 列出来；
  2. 剪点处缩放连续：剪点前后一帧的缩放差 vs 全片逐帧缩放变化 95% 分位（读 <成片>.cam.json）；
  3. 字幕对齐：在 1/4、1/2、3/4 处各听写 6 秒，和字幕起点并排打印；
  4. 消音：每处听写一遍，被消的词不该出现；
  5. 片头响指：前后 0.4 秒逐帧拼图存成 PNG，看是不是一刀硬切；
  6. 响度、峰值；
并写出 <工程>/屏幕文字_<成片名>.md（上黑边文字 + 全部字幕），交给文字合规自查。
用法: python qa.py <工程> <成片.mp4>"""
import argparse, glob, json, os, subprocess, tempfile
from pathlib import Path
import cv2, numpy as np

ap = argparse.ArgumentParser(); ap.add_argument("proj"); ap.add_argument("video")
a = ap.parse_args(); P = Path(a.proj); V = a.video; Q = P / "fast"
cfg = json.loads((P / "剪辑配置.json").read_text())
caps = json.loads((Q / "captions.json").read_text()); pcs = json.loads((Q / "cut_pieces.json").read_text())
FPS, VY, VH = 30, 300, 1440; K = cfg.get("speed", 1.0)
INTRO = json.loads((P / "edl.json").read_text()).get("intro", True) if (P / "edl.json").exists() else True; SNAP = pcs[1]["at"] if INTRO else 0.0
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", V]))
edits = [p["at"] for p in (pcs[2:] if INTRO else pcs[1:]) if p["at"] < dur - 0.3]
print(f"成片 {dur:.2f}s，剪点 {len(edits)} 个（不含片头响指）")

def frame(t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", V, "-frames:v", "1", "-vf", f"crop=1080:{VH}:0:{VY},scale=540:720",
                          "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(720, 540).astype(np.float32)
def bg_shift(x, y):
    v = []
    for x0, x1 in ((0, 110), (430, 540)):
        (dx, dy), _ = cv2.phaseCorrelate(x[60:420, x0:x1], y[60:420, x0:x1]); v.append(np.hypot(dx, dy) * 2)
    return float(np.median(v))
jumps = [(e, bg_shift(frame((round(e * FPS) - 1) / FPS + 0.001), frame((round(e * FPS) + 6) / FPS + 0.001))) for e in edits]
big = [j for j in jumps if j[1] > 6]
print(f"1. 剪点背景跳动：中位 {np.median([j[1] for j in jumps]):.1f}px，最大 {max(j[1] for j in jumps):.1f}px，>6px 的 {len(big)} 个"
      + "".join(f"\n   {int(e // 60)}:{e % 60:05.2f} {v:.1f}px" for e, v in big))
cam = Path(V + ".cam.json")
if cam.exists():
    s = np.array([f[1] for f in json.loads(cam.read_text())["frames"]]); at = [abs(s[round(e * FPS)] - s[round(e * FPS) - 1]) for e in edits if round(e * FPS) < len(s)]
    p95 = np.percentile(np.abs(np.diff(s)), 95)
    print(f"2. 剪点处缩放：最大逐帧变化 {max(at):.4f}，全片 95% 分位 {p95:.4f}（{'连续' if max(at) <= p95 else '有跳，查换景别是不是压在剪点上'}）")

import mlx_whisper
mdl = (glob.glob(os.path.expanduser("~/.cache/huggingface/hub/models--mlx-community--whisper-large-v3-turbo/snapshots/*")) or ["mlx-community/whisper-large-v3-turbo"])[0]
def hear(t0, d):
    with tempfile.TemporaryDirectory() as td:
        f = f"{td}/c.wav"; subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.3f}", "-t", f"{d:.3f}", "-i", V, "-ac", "1", "-ar", "16000", f])
        return mlx_whisper.transcribe(f, path_or_hf_repo=mdl, language="zh", condition_on_previous_text=False)["segments"]
print("3. 字幕对齐（起点差 0.3 秒以内算对齐）")
for fr in (0.25, 0.5, 0.75):
    t0 = round(dur * fr, 1); seg = hear(t0, 6)
    heard = " | ".join("%.2f %s" % (t0 + x["start"], x["text"]) for x in seg)
    shown = " | ".join("%.2f %s" % (c["start"], c["text"]) for c in caps if t0 <= c["start"] < t0 + 6)
    print("   听 " + heard); print("   字 " + shown)
for b in cfg.get("bleep", []):
    p = next(p for p in pcs if p["src_from"] - 1e-3 <= b["src_from"] <= p["src_to"] + 1e-3)
    t = p["at"] + (b["src_from"] - p["src_from"]) / (K if p["at"] >= SNAP else 1)
    txt = "".join(s_["text"] for s_ in hear(t - 2, 4.5))
    print(f"4. 消音「{b['word']}」@{t:.2f}s 听到：{txt}  → {'还听得到，重新定位' if b['word'] in txt else '听不到，前后的字看上面这句在不在'}")
strip = P / f"qa_响指_{Path(V).stem}.png"
if INTRO: subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{SNAP - 0.2:.3f}", "-t", "0.4", "-i", V, "-vf", "scale=120:-1,tile=12x1", "-frames:v", "1", str(strip)])
print(f"5. 片头响指前后逐帧：{strip}（中间应该是一刀切，没有叠影）" if INTRO else "5. 没有系列片头，跳过")
lo = subprocess.run(["ffmpeg", "-hide_banner", "-i", V, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
I = [l for l in lo.splitlines() if l.strip().startswith("I:")][-1].split()[1]; pk = [l for l in lo.splitlines() if "Peak:" in l][-1].split()[1]
print(f"6. 响度 {I} LUFS，峰值 {pk} dBFS（-16 左右、峰值不超过 -0.7 为好）")
md = P / f"屏幕文字_{Path(V).stem}.md"
md.write_text("\n".join([f"# {Path(V).stem} 全部屏幕文字", "", "## 上黑边", cfg.get("series", ""), cfg.get("day", "")] +
                        [f"{i + 1:02d} {c['title']}" for i, c in enumerate(cfg["chapters"])] + ["", "## 字幕"] + [c["text"] for c in caps]) + "\n")
print(f"屏幕文字 → {md}（交给你的文字合规自查，或让用户自己核）")
