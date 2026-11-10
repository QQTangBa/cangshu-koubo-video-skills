#!/usr/bin/env python3
"""把转写和静音段排成一条时间线，用来找 NG（同一句说了几遍、说一半停下、多余的半截词）。

用法: python3 timeline.py <视频> <转写.json> [--words 0-20,115-141] [--silence-db -38] [--silence 0.6]
默认输出：每一段连续说话一行（开头时间 + 整段文字），段与段之间插一行〔静 X 秒→结束时间〕。
--words 给几段原时间，额外逐字打印「字@起-止」，剪点要落在字中间的地方用它定边界。
"""
import argparse, json, re, subprocess

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("transcript")
ap.add_argument("--words", default="")
ap.add_argument("--silence-db", type=float, default=-38); ap.add_argument("--silence", type=float, default=0.6)
a = ap.parse_args()
tr = json.load(open(a.transcript))
W = [w for s in tr["segments"] for w in s.get("words", [])]
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", a.video, "-af", f"silencedetect=n={a.silence_db}dB:d={a.silence}", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
sil = [(float(e) - float(d), float(e)) for e, d in re.findall(r"silence_end: ([\d.]+) \| silence_duration: ([\d.]+)", log)]
ev = sorted([(w["start"], 0, w["word"]) for w in W] + [(s, 1, f"〔静{e - s:.1f}s→{e:.2f}〕") for s, e in sil])
line = ""
for t, k, x in ev:
    if k:
        if line: print(line)
        line = ""; print(f"        {t:7.2f} {x}"); continue
    line = line or f"{t:7.2f} "
    line += x.strip()
if line: print(line)
for r in filter(None, a.words.split(",")):
    lo, hi = map(float, r.split("-"))
    print(f"\n--- {lo}-{hi}")
    print(" ".join(f"{w['word'].strip()}@{w['start']:.2f}-{w['end']:.2f}" for w in W if lo <= w["start"] < hi))
