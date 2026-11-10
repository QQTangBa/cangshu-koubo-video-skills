#!/usr/bin/env python3
"""按剪辑表（edl.json）把口播里的重复和口误剪掉，不裁画面、不加任何东西。

用法: python3 cut_takes.py <工程目录> [--crf 10]
读: <工程>/edl.json（keep 列表，原时间线秒数）、<工程>/raw_transcript.json（transcribe.py 的输出）
写: <工程>/cut.mp4（原分辨率原帧率，crf 10）、cut_words.json（新时间线逐字时间戳）、cut_pieces.json（每一小段的原→新时间）

每个 keep 的边界：
  - 不写 h 的，按逐字时间戳 + 音量吸附到声音起止处，前留 0.06 秒、后留 0.08 秒，且不越过相邻那个字；
  - h 是 "from" / "to" / "both" 的那一边按给的时间硬切（响指转场、片头出点用）。
停顿默认不在这里压（交给 edl.py rebuild：>0.4 秒才压、压到 0.25 秒）；--pause-max 给了数才压 keep 内部的停顿，写了 "pause": false 的 keep 不压。所有剪点对齐到帧，音频每个剪点 8ms 淡入淡出防爆音。
"""
import argparse, json, subprocess
from pathlib import Path
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("proj")
ap.add_argument("--pause-max", type=float, default=1e9)
ap.add_argument("--pause-keep", type=float, default=0.18)
ap.add_argument("--crf", type=int, default=10)
ap.add_argument("--quiet-db", type=float, default=-48)
a = ap.parse_args()
P = Path(a.proj)
edl = json.loads((P / "edl.json").read_text())
src = edl["source"]
_st = {x["codec_type"]: float(x.get("start_time") or 0) for x in json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,start_time", "-of", "json", src]))["streams"]}
if abs(_st.get("audio", 0) - _st.get("video", 0)) > 0.01:
    raise SystemExit(f"素材的音频比视频晚 {_st['audio'] - _st['video']:.3f} 秒开始：这里按解码时间切，直接剪会把口型剪错。先走第 0 步 prepare_source.py，剪辑表的 source 指向它的输出")
tr = json.loads((P / "raw_transcript.json").read_text())
words = [w for s in tr["segments"] for w in s.get("words", [])]

pr = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                         "stream=r_frame_rate,width,height", "-of", "json", src]))["streams"][0]
n, d = map(int, pr["r_frame_rate"].split("/")); FPS = n / d
SR, HOP = 16000, 160  # 10ms 一格
pcm = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                   capture_output=True, check=True).stdout, np.float32)
rms = np.array([np.sqrt(np.mean(pcm[i:i + HOP] ** 2)) for i in range(0, len(pcm) - HOP, HOP)])
db = 20 * np.log10(rms + 1e-9)
db = np.maximum.reduce([db, np.roll(db, 1), np.roll(db, -1)])  # 30ms 平滑，别把字中间的瞬间低谷当停顿
loud = db > a.quiet_db
def L(t): return bool(loud[min(max(int(t * 100), 0), len(loud) - 1)])

def refine_from(t):
    lo = max([w["end"] for w in words if w["end"] <= t + 0.02] or [0.0])
    lo = max(lo - 0.02, t - 0.5)
    x = t
    if L(x):
        while x - 0.01 > lo and L(x - 0.01): x -= 0.01
    else:
        while x < t + 0.5 and not L(x): x += 0.01
    return max(x - 0.06, lo)

def refine_to(t):
    hi = min([w["start"] for w in words if w["start"] >= t - 0.02] or [1e9])
    hi = min(hi + 0.02, t + 0.5)
    x = t
    if L(x):
        while x + 0.01 < hi and L(x + 0.01): x += 0.01
    else:
        while x > t - 0.5 and not L(x): x -= 0.01
    return min(x + 0.08, hi)

def fr(t): return round(t * FPS) / FPS

pieces = []
for k in edl["keep"]:
    h = k.get("h", "")
    s = k["from"] if h in ("from", "both") else refine_from(k["from"])
    e = k["to"] if h in ("to", "both") else refine_to(k["to"])
    # 内部长停顿
    segs, cur = [], s
    i0 = int(s * 100); i1 = int(e * 100)
    q = None
    for i in range(i0, i1 + 1):
        if i < i1 and not loud[i]:
            q = i if q is None else q
            continue
        if k.get("pause") is not False and q is not None and (i - q) / 100 > a.pause_max and q > i0 and i < i1:  # "pause": false 的 keep（系列片头）不压停顿
            segs.append((cur, q / 100 + a.pause_keep)); cur = i / 100 - a.pause_keep
        q = None
    segs.append((cur, e))
    for x, y in segs:
        x, y = fr(x), fr(y)
        if y - x >= 2 / FPS: pieces.append({"from": x, "to": y, "hard": bool(h)})

# 开头第一帧就要有声音（开局停顿哪怕 0.2–0.3 秒也不留）：不留任何气口，从开口那一帧切
if pieces:
    _on = next((i for i in range(int(pieces[0]["from"] * 100), int(pieces[0]["to"] * 100)) if db[i] > -36), None)
    if _on is not None:
        _s = int(_on / 100 * FPS) / FPS
        if _s > pieces[0]["from"]: print(f"开头收紧 {_s - pieces[0]['from']:.3f}s，第一帧 = 开口")
        pieces[0]["from"] = max(pieces[0]["from"], _s)

fc, maps, t_new, out_pieces = [], [], 0.0, []
for i, p in enumerate(pieces):
    s, e = p["from"], p["to"]
    fade = 0.008
    fc.append(f"[0:v]trim=start={s:.4f}:end={e:.4f},setpts=PTS-STARTPTS[v{i}]")
    fc.append(f"[0:a]atrim=start={s:.4f}:end={e:.4f},asetpts=PTS-STARTPTS,afade=t=in:d={fade},afade=t=out:st={e - s - fade:.4f}:d={fade}[a{i}]")
    maps.append(f"[v{i}][a{i}]")
    out_pieces.append({"src_from": s, "src_to": e, "at": round(t_new, 4)}); t_new += e - s
fc.append("".join(maps) + f"concat=n={len(pieces)}:v=1:a=1[v][a]")
(P / "cut_filter.txt").write_text(";\n".join(fc))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex_script", str(P / "cut_filter.txt"), "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-crf", str(a.crf), "-preset", "slow", "-pix_fmt", "yuv420p", "-r", f"{n}/{d}",
                "-c:a", "aac", "-b:a", "256k", "-ar", "48000", str(P / "cut.mp4")], check=True)

nw = []
for w in words:
    for p in out_pieces:
        if p["src_from"] - 0.05 <= w["start"] and w["end"] <= p["src_to"] + 0.05:
            nw.append({"w": w["word"].strip(), "start": round(max(w["start"], p["src_from"]) - p["src_from"] + p["at"], 3),
                       "end": round(min(w["end"], p["src_to"]) - p["src_from"] + p["at"], 3)}); break
(P / "cut_words.json").write_text(json.dumps(nw, ensure_ascii=False))
(P / "cut_pieces.json").write_text(json.dumps(out_pieces, indent=1))
(P / "cut_pieces_校正前.json").unlink(missing_ok=True)  # 重剪后旧的校正记录作废，否则 from_base 会跳过 fix_edits
total = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(P / "cut.mp4")]))
print(f"{len(edl['keep'])} 个 keep → {len(pieces)} 小段，成片 {total:.2f}s（原 {len(pcm) / SR:.2f}s）")
for k, p in zip(range(len(out_pieces)), out_pieces):
    print(f"  {p['at']:7.2f}  ← 原 {p['src_from']:.2f}-{p['src_to']:.2f}")
