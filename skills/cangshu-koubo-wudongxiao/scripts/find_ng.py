#!/usr/bin/env python3
"""找漏剪的口误：整段转写会把「所以我们所以我们」合成一遍，所以把 cut.mp4 按 ≥75ms 的安静处切成短语，每段单独听写，
比较相邻两段（中间夹一段不到 0.6 秒的「这个」「呃」时跨过去比）：后一段以前一段开头（所以我们 | 所以我们公司…），或前一段的尾巴等于后一段的开头（…团队,能把 | 能把兄弟们…），就是重复。
另外列：单独成段的语气词、逐字转写里每字超过 0.45 秒的拖长字（里面可能藏着别的音节）、语速明显偏慢的字幕行。这些都是线索，逐个用 energy.py 核。
用法: python find_ng.py <工程> [--from 3.6] [--to 秒]   读 cut.mp4（+ cut_transcript.json、captions.json 有就用），写 ng_候选.json"""
import argparse, glob, json, os, re, subprocess, tempfile
from pathlib import Path
import numpy as np

ap = argparse.ArgumentParser(); ap.add_argument("proj"); ap.add_argument("--from", dest="t0", type=float, default=None); ap.add_argument("--to", type=float, default=None)
a = ap.parse_args(); P = Path(a.proj); src = P / "cut.mp4"
pcs = json.loads((P / "cut_pieces.json").read_text()) if (P / "cut_pieces.json").exists() else []
INTRO = json.loads((P / "edl.json").read_text()).get("intro", True) if (P / "edl.json").exists() else True
t0 = a.t0 if a.t0 is not None else (pcs[1]["at"] if INTRO and len(pcs) > 1 else 0.0)  # 默认从响指那段开始，片头不查
SR = 16000; dt = 0.025
pcm = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout, np.int16).astype(np.float32) / 32768
hop = int(SR * dt); db = np.array([20 * np.log10(np.sqrt(np.mean(pcm[i * hop:(i + 1) * hop] ** 2)) + 1e-9) for i in range(len(pcm) // hop)])
t1 = a.to if a.to else len(db) * dt
sil = db < -36; phr, start, q = [], None, 0
for i in range(int(t0 / dt), int(t1 / dt)):
    if not sil[i]:
        if start is None: start = i
        q = 0
    else:
        q += 1
        if start is not None and q >= 3: phr.append((start * dt, (i - q + 1) * dt)); start = None
if start is not None: phr.append((start * dt, t1))
phr = [(x, y) for x, y in phr if y - x >= 0.2]  # 更短的是噪声，听写会冒出「请不吝点赞」这类幻觉

import mlx_whisper
cands = glob.glob(os.path.expanduser("~/.cache/huggingface/hub/models--mlx-community--whisper-large-v3-turbo/snapshots/*"))
model = cands[0] if cands else "mlx-community/whisper-large-v3-turbo"
norm = lambda s: re.sub(r"[\s，。、！？,.!?：:；;…\"'“”]", "", s)
texts = []
with tempfile.TemporaryDirectory() as td:
    for x, y in phr:
        f = f"{td}/p.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(x - 0.04, 0):.3f}", "-t", f"{y - x + 0.08:.3f}", "-i", str(src), "-ac", "1", "-ar", "16000", f])
        r = mlx_whisper.transcribe(f, path_or_hf_repo=model, language="zh", condition_on_previous_text=False, initial_prompt="以下是普通话口播的一小段。")
        texts.append("".join(s["text"] for s in r["segments"]).strip())
print(f"== 短语逐段听写（{len(phr)} 段）")
rep = []
FILL = ("这个", "那个", "嗯", "呃", "啊", "就是")
for (x, y), t in zip(phr, texts): print(f"  {x:7.2f}-{y:7.2f} {t}")
for k in range(len(phr) - 1):
    # 和下一段比；中间夹着一段不到 0.6 秒的短语（常是「这个」「呃」）时，也跨过去和再下一段比
    for j in [k + 1] + ([k + 2] if k + 2 < len(phr) and phr[k + 1][1] - phr[k + 1][0] < 0.6 else []):
        A, B = norm(texts[k]), norm(texts[j]); mid = "" if j == k + 1 else f" | {texts[k + 1]}"
        if len(A) >= 2 and B.startswith(A):
            rep.append({"type": "整段重说", "at": [phr[k][0], phr[k][1]], "next": phr[j][0], "text": f"{texts[k]}{mid} | {texts[j]}"}); break
        n = max((n for n in range(2, min(len(A), len(B)) + 1) if A[-n:] == B[:n]), default=0)
        if n: rep.append({"type": f"尾巴重说「{A[-n:]}」", "at": [phr[k][0], phr[k][1]], "next": phr[j][0], "text": f"{texts[k]}{mid} | {texts[j]}"}); break
print("== 疑似重复（相邻两段）")
for r in rep: print(f"  {r['at'][0]:7.2f}-{r['at'][1]:7.2f} → {r['next']:7.2f}  {r['type']}：{r['text']}")
slow = [{"type": "孤立语气词", "at": list(p), "text": t} for p, t in zip(phr, texts) if p[1] - p[0] < 0.6 and norm(t) in FILL]
if (P / "cut_transcript.json").exists():
    tr = json.loads((P / "cut_transcript.json").read_text())
    for w in (w for s in tr["segments"] for w in s.get("words", [])):
        ch = norm(w["word"]); d = w["end"] - w["start"]
        if ch and w["start"] >= t0 and d / len(ch) > 0.45: slow.append({"type": "拖长字", "at": [w["start"], w["end"]], "text": w["word"]})
if (P / "captions.json").exists():
    for c in json.loads((P / "captions.json").read_text()):
        n = len(re.sub(r"[\s$a-zA-Z0-9]", "", c["text"])) + len(re.findall(r"[a-zA-Z]+|\d+", c["text"])); d = c["end"] - c["start"]
        if c["start"] >= t0 and d > 0.9 and n / d < 4: slow.append({"type": f"慢句 {n / d:.1f}字/秒", "at": [c["start"], c["end"]], "text": c["text"]})
print("== 其他线索（逐个用 energy.py 核，正常停顿或听错的不剪）")
for s in slow: print(f"  {s['at'][0]:7.2f}-{s['at'][1]:7.2f} {s['type']}：{s['text']}")
(P / "ng_候选.json").write_text(json.dumps({"phrases": [{"at": list(p), "text": t} for p, t in zip(phr, texts)], "repeats": rep, "clues": slow}, ensure_ascii=False, indent=1))
