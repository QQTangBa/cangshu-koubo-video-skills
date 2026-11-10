#!/usr/bin/env python3
"""成片音频检查（成片总检）：音效到底出没出声、有没有盖过人声。
做法：把成片音轨和口播原声对齐（求延迟 + 最小二乘增益）后相减，剩下的就是音效轨（加一点编码噪声）。
再按 150Hz–16kHz 五个频段算能量。
目标：对标的音效轻、少、压在人声底下（441 个动效全在连续说话中，动作处整体峰值只比随机时刻高约 2dB）；
我们 v11 把音效推到比人声中位高 3.4dB、每秒近 2 个，用户听感"纯污染"。所以：音效峰值比人声中位低 1–6dB，图形段每秒 0.3–0.7 个（v12 每秒 0.68 个时用户仍说"有时太密"）。
（之前写的"对标停顿处音效比人声高 6.6dB"是测错了：那个时间窗里是他接着说话的声音。）
局限：相减法只"听"得到没被人声盖住的音效。音效按目标压在人声底下以后，这里只测得到一小半，
所以这里只判两件事：一个都测不到 = 没出声（v9/v10 那种事故）；测到的音效比人声还响 = 偏响。
逐个音效的响度和数量看 render_final.py 汇总里的 sfx_levels 结果（纯音效音轨，SKILL 第 9 步），那个才准。
用法: python3 check_audio.py <工程目录> <成片.mp4> [--json out.json]
退出码 1 = 音效没出声（一个都检测不到）。"""
import json, subprocess, sys
from pathlib import Path
import numpy as np

SR = 44100


def load(src, dur=None):
    cmd = ["ffmpeg", "-v", "error", "-i", str(src)] + (["-t", f"{dur:.3f}"] if dur else []) + ["-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.int16).astype(np.float64) / 32768


def bands(x, n=1024, hop=256):
    win = np.hanning(n)
    fr = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * win
    M = np.abs(np.fft.rfft(fr, axis=1)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR)
    out = [10 * np.log10(M[:, (f >= lo) & (f < hi)].sum(1) + 1e-10) for lo, hi in [(150, 1000), (1000, 4000), (4000, 8000), (8000, 12000), (12000, 16000)]]
    return np.array(out), hop / SR


def main():
    root, mp4 = Path(sys.argv[1]), Path(sys.argv[2])
    plan = json.load(open(root / "src/plan.json"))
    cuts = sorted((c["from"], c["to"]) for c in plan["meta"].get("cuts", []))
    def uw(t):  # 剪过口误时换成成片时间（见 render_final.py）
        sh = 0.0
        for a0, b0 in cuts:
            if t >= b0: sh += b0 - a0
            elif t > a0: return a0 - sh
        return t - sh
    dur = uw(plan["meta"]["duration"])
    a = load(mp4, dur)
    b = load(root / "public" / plan["meta"]["footage"], dur)
    n = min(len(a), len(b)); a, b = a[:n], b[:n]
    seg = min(n, SR * 20)
    A = np.fft.rfft(a[:seg], 2 * seg); B = np.fft.rfft(b[:seg], 2 * seg)
    c = np.fft.irfft(A * np.conj(B)); lag = int(np.argmax(np.r_[c[-SR // 2:], c[:SR // 2]])) - SR // 2
    a2, b2 = (a[lag:], b[:n - lag]) if lag >= 0 else (a[:n + lag], b[-lag:])
    g = float(np.dot(a2, b2) / np.dot(b2, b2)); v = g * b2; r = a2 - v
    Bv, dt = bands(v); Br, _ = bands(r)
    V = 10 * np.log10(10 ** (Bv[0] / 10) + 10 ** (Bv[1] / 10))
    Tv = 10 * np.log10(sum(10 ** (Bv[k] / 10) for k in range(5)))
    Tr = 10 * np.log10(sum(10 ** (Br[k] / 10) for k in range(5)))
    HFr = 10 * np.log10(10 ** (Br[3] / 10) + 10 ** (Br[4] / 10)); HFv = 10 * np.log10(10 ** (Bv[3] / 10) + 10 ** (Bv[4] / 10))
    speech = V > np.percentile(V, 60)
    vmed = float(np.median(Tv[speech]))
    # 编码误差会跟着人声走（实测无音效成片：残差比同帧人声中位低 24dB，最极端千分之一也低 4.8dB）。
    # 所以音效帧要同时满足：比人声中位低不超过 12dB，且比同一帧的人声低不超过 3dB。
    ok = (Tr > vmed - 12) & (Tr - Tv > -3)
    pk = [i for i in range(1, len(Tr) - 1) if ok[i] and Tr[i] >= Tr[i - 1] and Tr[i] >= Tr[i + 1]]
    sel = []
    for i in pk:
        if not sel or (i - sel[-1]) * dt > 0.09:
            sel.append(i)
        elif Tr[i] > Tr[sel[-1]]:
            sel[-1] = i
    t = np.array(sel) * dt + lag / SR
    peaks = Tr[sel] if sel else np.array([-99.0])
    rel = float(np.median(peaks) - vmed)
    hf = float(np.median(HFr[sel]) - np.median(HFv[speech])) if sel else -99
    B = [(uw(s["start"]), uw(s["end"])) for s in plan["segments"] if s["world"] == "B"]
    bdur = sum(e - s for s, e in B) or 1
    nb = int(sum(((t >= s) & (t < e)).sum() for s, e in B))
    rep = dict(lag_ms=round(lag / SR * 1000, 1), voice_gain=round(g, 3), sfx_count=len(sel), sfx_per_s_B=round(nb / bdur, 2),
               sfx_peak_vs_voice_db=round(rel, 1), sfx_hf_vs_voice_db=round(hf, 1))
    print(f"对齐延迟 {rep['lag_ms']}ms，原声增益 {g:.2f}")
    print(f"没被人声盖住、测得到的音效 {len(sel)} 个（图形段每秒 {rep['sfx_per_s_B']} 个；被盖住的这里测不到，全部数量和响度看 sfx_levels.py）")
    print(f"测得到的音效峰值 比人声中位 {rel:+.1f} dB（不能超过 0）")
    print(f"音效 8–16kHz 比人声 {hf:+.1f} dB（只作参考：对标的音效偏亮）")
    bad = len(sel) == 0
    if bad:
        print("【不合格】一个音效都测不到，多半没出声：先确认 src/sfx-palette.json 不是空的，再用 sfx_levels.py 看纯音效音轨。")
    elif rel > 0:
        print("【偏响】音效盖过人声了，听着像污染：调低 meta.sfxVolume，再用 sfx_levels.py 逐个复核。")
    if "--json" in sys.argv:
        json.dump(dict(rep, times=[round(x, 3) for x in t.tolist()]), open(sys.argv[sys.argv.index("--json") + 1], "w"))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
