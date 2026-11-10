#!/usr/bin/env python3
"""按 references/sfx-palette.json 构建工程音效：裁剪、淡入淡出、统一短时峰值响度、记录峰值位置（让峰值卡在画面动作上）。
统一响度：每个音效最响的那 20ms（近似 K 计权：滤掉 60Hz 以下、1.5kHz 以上抬 4dB）对齐到 --peak（默认 -18dBFS），
采样峰值不超过 -1dBFS。原来用 loudnorm 按整段平均响度，对 3 秒以下的短音不起作用：同样的 vol，"啵"和闷响比人声高 6–9dB、翻页低 7dB。
对齐以后 cue 的 vol 就是真实响度：vol 0.5 ≈ 比人声中位低 3dB（按口播 -21dB 左右算，换素材后用 sfx_levels.py 复核）。
默认保持素材原声，不提亮、不压缩、不加宽（--wide 才对单声道素材做温和加宽）。教训：为了"对齐对标响度"给音效提亮、压缩、人工加宽，听感会"AI 味太重、像污染"。
用法: python build_sfx.py <工程/public> [--palette <json>] [--library <音效库目录>] [--wide]
音效库位置：--library > 环境变量 KOUBO_SFX_LIB > 清单里的 library 字段。没有音效库就先征得用户同意，用 fetch_sfx_library.py 下载。
输出: public/sfx/<角色>_<序号>.wav，以及 {角色: [{file, peak, gain}]} 清单：写进 src/sfx-palette.json（sfx.tsx 读这份）并在 public/sfx/palette.json 留一份副本。
缺任何一个素材就报错退出：清单里的变体顺序有意义（cue 用 v 指定第几个），跳过会让后面的变体整体前移。"""
import argparse, array, json, math, os, subprocess, sys, wave, struct
from pathlib import Path
ap = argparse.ArgumentParser(); ap.add_argument("public"); ap.add_argument("--palette", default=str(Path(__file__).resolve().parent.parent / "references/sfx-palette.json")); ap.add_argument("--wide", action="store_true")  # 默认不加宽：人工加宽会发虚
ap.add_argument("--peak", type=float, default=-18.0)  # 最响 20ms 的目标响度（dBFS）
ap.add_argument("--library", help="音效库目录（里面是 音效库/mixkit_常用30 等），默认看环境变量 KOUBO_SFX_LIB，再看清单的 library 字段")
a = ap.parse_args()
spec = json.load(open(a.palette)); _lib = a.library or os.environ.get("KOUBO_SFX_LIB") or spec.get("library")
if not _lib: sys.exit("没指定音效库：先 fetch_sfx_library.py <目录> 下载，再加 --library <目录> 或设环境变量 KOUBO_SFX_LIB")
lib = Path(os.path.expanduser(_lib))
out = Path(a.public) / "sfx"; out.mkdir(parents=True, exist_ok=True)


def peak_loudness(f):
    """最响 20ms 的近似 K 计权响度（dBFS）和采样峰值（dBFS）"""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", "48000", "-af", "highpass=f=60,highshelf=f=1500:g=4", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    x = array.array("h"); x.frombytes(raw)
    hop, best = 960, 0.0
    for i in range(0, max(1, len(x) - hop), hop):
        e = sum(v * v for v in x[i:i + hop]) / hop
        best = max(best, e)
    with wave.open(str(f)) as w:
        y = array.array("h"); y.frombytes(w.readframes(w.getnframes()))
    pk = max((abs(v) for v in y), default=1)
    return 10 * math.log10(best / 32768 ** 2 + 1e-12), 20 * math.log10(pk / 32768 + 1e-9)


def d_total(f):
    with wave.open(str(f)) as w:
        return w.getnframes() / w.getframerate()

result, missing = {}, [str(lib / it["src"]) for items in spec["roles"].values() for it in items if not (lib / it["src"]).exists()]
if missing:
    sys.exit(f"音效库 {lib} 里缺素材，没有构建（变体顺序有意义，不能跳过）：\n  " + "\n  ".join(missing)
             + f"\n音效库不在这台机器上的话：征得用户同意后跑 python3 {Path(__file__).resolve().parent}/fetch_sfx_library.py <目录> 下载，再加 --library <目录>")
for role, items in spec["roles"].items():
    result[role] = []
    for k, it in enumerate(items):
        src = lib / it["src"]
        s, e = it["trim"]; d = e - s
        dst = out / f"{role}_{k}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(s), "-t", str(d), "-i", str(src), "-ac", "2", "-ar", "48000",
                        "-af", f"afade=t=in:d=0.004,afade=t=out:st={max(0, d - 0.04):.3f}:d=0.04",  # 保持素材原声：不提亮、不压缩（提亮+压缩+人工加宽后"AI 味太重、像污染"）
                        str(dst)], check=True)
        lk, sp = peak_loudness(dst)
        g = min(a.peak - lk, -1.0 - sp)  # 对齐短时峰值响度，但采样峰值不过 -1dBFS
        tmp = dst.with_suffix(".tmp.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(dst), "-af", f"volume={g:.2f}dB", str(tmp)], check=True)
        os.replace(tmp, dst)
        # 峰值位置
        with wave.open(str(dst)) as w:
            n = w.getnframes(); sr = w.getframerate(); raw = w.readframes(n)
        vals = struct.unpack(f"<{n * 2}h", raw)
        if a.wide:
            L, R = vals[0::2], vals[1::2]
            sd = sum(abs(x - y) for x, y in zip(L[::8], R[::8])); md = sum(abs(x + y) for x, y in zip(L[::8], R[::8])) + 1
            same = sd / md < 0.16  # 侧/中 < 约 -16dB 就算单声道
            if same:  # 单声道 → 温和加宽：中间主声不动，两侧加一点延迟 11ms、滤掉低频的副本（侧/中约 -10dB）
                tmp = dst.with_suffix(".tmp.wav")
                sg = 1 if (k + len(result)) % 2 == 0 else -1
                flt = (f"[0:a]asplit=2[x][y];[y]adelay=11|11,highpass=f=900,volume={0.32 * sg:.2f}[d];"
                       f"[x][d]amerge=inputs=2,pan=stereo|c0=c0+c2|c1=c1-c3[o]")
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(dst), "-filter_complex", flt, "-map", "[o]", "-t", f"{d_total(dst):.3f}", str(tmp)], check=True)
                os.replace(tmp, dst)
                with wave.open(str(dst)) as w:
                    n = w.getnframes(); sr = w.getframerate(); raw = w.readframes(n)
                vals = struct.unpack(f"<{n * 2}h", raw)
        win = int(sr * 0.01); best, bi = 0, 0
        for i in range(0, n - win, win):
            v = sum(abs(vals[2 * j]) for j in range(i, i + win, 8))
            if v > best: best, bi = v, i
        result[role].append({"file": f"sfx/{dst.name}", "peak": round(bi / sr, 3), "gain": it.get("gain", 1.0)})
json.dump(result, open(out / "palette.json", "w"), ensure_ascii=False, indent=1)
src = Path(a.public).resolve().parent / "src"
if src.is_dir(): json.dump(result, open(src / "sfx-palette.json", "w"), ensure_ascii=False, indent=1)
print("音效角色:", {k: len(v) for k, v in result.items()})

