#!/usr/bin/env python3
"""逐个音效查响度：在"纯音效"音轨上找出每一个音效，和口播人声的中位响度比。
check_audio.py 只能听出没被人声盖住的那些；被盖住的音效可能根本没出声，也可能太响，只有纯音效音轨看得清。

纯音效音轨由 render_final.py 自动渲（--props '{"sfxOnly":true}'，口播原声和 BGM 静音），单独跑：
  npx remotion render src/index.ts Koubo34 <临时目录>/sfx_only.wav --codec=wav --props='{"sfxOnly":true}'
  python3 sfx_levels.py <sfx_only.wav> <工程>/public/footage34.mp4 [--lo -6] [--hi -1] [--gap 0.5] [--json 明细.json]
两路都先过近似 K 计权（滤掉 60Hz 以下、1.5kHz 以上抬 4dB，接近人耳），再按 20ms 窗算响度。
每个音效输出：峰值时刻、峰值、比人声中位高多少；超过 --hi 标"偏响"，低于 --lo 标"偏小"，峰值和上一个隔得比 --gap 近标"挤"。
目标（style-bible 第 10 节）：每个音效都压在人声底下 1–6dB。依赖 numpy、ffmpeg。"""
import argparse, subprocess
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("sfx"); ap.add_argument("voice")
ap.add_argument("--lo", type=float, default=-6); ap.add_argument("--hi", type=float, default=-1); ap.add_argument("--gap", type=float, default=0.5)
ap.add_argument("--json", help="把每个音效的时刻和响度写进这个文件")
a = ap.parse_args()
SR, HOP = 48000, 960  # 20ms


def load(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", str(SR), "-af", "highpass=f=60,highshelf=f=1500:g=4", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    n = len(x) // HOP
    return 20 * np.log10(np.sqrt((x[: n * HOP].reshape(n, HOP) ** 2).mean(axis=1)) + 1e-9)


v = load(a.voice); s = load(a.sfx)
vmed = float(np.median(v[v > v.max() - 40]))
# 找音效：在纯音效轨的响度曲线上找峰（±0.3 秒内最高、高于 -50dBFS、比两侧 0.5 秒内的谷底高 4dB 以上），
# 两个音叠在一起也能分开；时刻取峰值处，和模板按动作时刻排间隔（音效最响的点对着动作）是同一个口径
W, R = 15, 25
events = []
for i in range(len(s)):
    if s[i] < -50 or s[i] < s[max(0, i - W): i + W + 1].max(): continue
    if events and i - events[-1][0] <= W: continue  # 平顶只取第一个
    if s[i] - max(s[max(0, i - R): i + 1].min(), s[i: i + R + 1].min()) < 4: continue
    events.append((i, float(s[i])))
events = [(i * HOP / SR, pk) for i, pk in events]
print(f"人声中位 {vmed:.1f} dB（近似 K 计权，20ms）；音效 {len(events)} 个；目标 比人声中位 {a.lo:+.0f} 到 {a.hi:+.0f} dB")
loud = quiet = tight = 0; prev = None
for tp, pk in events:
    rel = pk - vmed; flag = []
    if rel > a.hi: flag.append("偏响"); loud += 1
    if rel < a.lo: flag.append("偏小"); quiet += 1
    if prev is not None and tp - prev < a.gap - 0.05: flag.append("挤"); tight += 1  # 留 0.05 秒测量误差
    prev = tp
    print(f"  {tp:7.2f}s  峰 {pk:6.1f} dB  比人声中位 {rel:+5.1f} dB  {' '.join(flag)}")
print(f"偏响 {loud} 个、偏小 {quiet} 个、挤 {tight} 处" + ("" if loud + quiet + tight else "：都在目标里"))
if a.json:
    import json
    json.dump({"voice_median_db": round(vmed, 1), "loud": loud, "quiet": quiet, "tight": tight,
               "events": [{"t": round(tp, 2), "peak_db": round(pk, 1), "rel_db": round(pk - vmed, 1)} for tp, pk in events]},
              open(a.json, "w"), ensure_ascii=False, indent=1)
