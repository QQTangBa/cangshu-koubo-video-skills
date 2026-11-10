#!/usr/bin/env python3
"""量口型：把成片的画面和声音分别对到参考片，差值就是口型偏差。不靠推算，也不听，直接量。
做法：画面取中间一块每帧的变化量（60 格/秒），声音取 1ms 包络，在 ±0.5 秒里各找最像的位置。
「声-画」< 0 = 声音比画面晚，> 0 = 声音比画面早。

用法:
  sync_check.py <成片> <参考片> [--plan src/plan.json] [--json out.json] [--max-ms 20]
      参考片和成片同一条时间线（动效版 public/footage34.mp4，无动效版 fast/cut.mp4）。给 --plan 只量真人段；不给就每 15 秒量一段。
      退出码 1 = 声-画中位数的绝对值超过 --max-ms。
  sync_check.py --audio-lag <成片> <参考片>
      只打印成片声音比参考片晚多少秒（master_audio.sh 用它扣掉渲染带来的延迟）。"""
import argparse, json, subprocess, sys
import numpy as np

R = 0.5


def vsig(p):
    cmd = ["ffmpeg", "-v", "error", "-i", str(p), "-vf", "crop=iw*0.5:ih*0.45:iw*0.25:ih*0.15,scale=48:48,format=gray,fps=60", "-f", "rawvideo", "-"]
    pr = subprocess.Popen(cmd, stdout=subprocess.PIPE); out, prev = [], None
    while True:
        b = pr.stdout.read(48 * 48)
        if len(b) < 48 * 48: break
        a = np.frombuffer(b, np.uint8).astype(np.int16)
        out.append(0.0 if prev is None else float(np.abs(a - prev).mean())); prev = a
    pr.wait()
    return np.array(out, np.float32)


def asig(p):
    """按容器时间线读声音：音频起点不是 0 时前面补静音"""
    a = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-af", "aresample=async=1:first_pts=0", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                                     capture_output=True, check=True).stdout, np.float32)
    n = len(a) // 16
    return np.abs(a[:n * 16]).reshape(-1, 16).mean(1)


def lag(x, y, t, tr, dur, rate):
    """x[t…] 在 y[tr±R] 里最像的位置：返回（偏移秒，相关系数）。正数 = x 的内容在 y 里更靠后"""
    a = x[int(t * rate):int((t + dur) * rate)]; a = a - a.mean()
    s = max(0, int((tr - R) * rate)); b = y[s:s + len(a) + int(2 * R * rate)]; b = b - b.mean()
    if len(a) < rate or len(b) <= len(a): return 0.0, 0.0
    c = np.correlate(b, a, "valid"); k = int(np.argmax(c))
    return k / rate - (tr - s / rate), float(c[k] / (np.linalg.norm(a) * np.linalg.norm(b[k:k + len(a)]) + 1e-9))


def measure(fv, fa, rv, ra, windows):
    """windows: [(成片秒, 时长, 参考片秒)]。返回每窗 (t, 画面ms, 声音ms, 声-画ms, 可信)"""
    rows = []
    for t, d, tr in windows:
        dv, cv = lag(fv, rv, t, tr, d, 60); da, ca = lag(fa, ra, t, tr, d, 1000)
        rows.append((t, dv * 1000, da * 1000, (da - dv) * 1000, cv >= 0.7 and ca >= 0.6))
    return rows


def retime_lag(fast, ref, k, s=0.0):
    """变速版的声音比原速版（按倍速压到同一时间线）晚多少秒。s = 原速保留到几秒（系列片头），之后才变速"""
    fa, r0 = asig(fast), asig(ref); n = len(fa); tt = np.arange(n) / 1000
    ra = np.interp(np.where(tt < s, tt, s + (tt - s) * k) * 1000, np.arange(len(r0)), r0).astype(np.float32)
    ls = [lag(fa, ra, t, t, 8, 1000) for t in np.linspace(s + 1, max(s + 1, n / 1000 - 9), 9)]
    ok = [x for x, c in ls if c >= 0.5]
    return -float(np.median(ok)) if ok else 0.0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("film"); ap.add_argument("ref"); ap.add_argument("--plan"); ap.add_argument("--json")
    ap.add_argument("--max-ms", type=float, default=20); ap.add_argument("--audio-lag", action="store_true")
    a = ap.parse_args()
    fa, ra = asig(a.film), asig(a.ref); dur = min(len(fa), len(ra)) / 1000
    if a.audio_lag:
        ls = [lag(fa, ra, t, t, 12, 1000) for t in np.linspace(1, max(1, dur - 13), 7)]
        ok = [x for x, c in ls if c >= 0.5] or [x for x, _ in ls]
        print(f"{-float(np.median(ok)):.4f}"); return  # 成片内容在参考里更靠前 = 成片声音晚
    fv, rv = vsig(a.film), vsig(a.ref)
    if a.plan:
        win = []
        for s in json.load(open(a.plan))["segments"]:
            if s["world"] == "A" and s["end"] - s["start"] >= 2.4: win.append((s["start"] + 0.3, s["end"] - s["start"] - 0.5, s["start"] + 0.3))
    else:
        win = [(t, 8.0, t) for t in np.arange(2, max(3, dur - 9), 15)]
    rows = measure(fv, fa, rv, ra, win)
    good = [r for r in rows if r[4]]
    for t, dv, da, d, ok in rows: print(f"  {t:7.1f}s 画面 {dv:+6.0f}ms 声音 {da:+6.0f}ms 声-画 {d:+6.0f}ms{'' if ok else '（信号弱，不计）'}")
    if not good: print("没有可信的测量窗"); sys.exit(1)
    ds = [r[3] for r in good]; med = float(np.median(ds))
    print(f"声-画中位 {med:+.0f}ms，范围 {min(ds):+.0f} 到 {max(ds):+.0f}ms（{len(good)}/{len(rows)} 窗可信）；负数 = 声音晚")
    if a.json: json.dump({"median_ms": med, "min_ms": min(ds), "max_ms": max(ds), "windows": len(good)}, open(a.json, "w"))
    sys.exit(1 if abs(med) > a.max_ms else 0)


if __name__ == "__main__":
    main()
