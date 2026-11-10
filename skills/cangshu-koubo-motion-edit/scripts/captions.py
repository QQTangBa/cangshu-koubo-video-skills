#!/usr/bin/env python3
"""用户没给字幕时，按逐字时间断出基座的字幕源初稿：每行不超过 N 字，优先在标点和停顿处断，去掉标点，「钱」换成 $。
用法: python captions.py <工程>/基座/cut_transcript.json <工程>/基座/字幕源.txt [--max 14]
输出只是初稿：ASR 错字、专名、重点词 [ ]、其余敏感词按 cangshu-koubo-wudongxiao 的 references/captions.md 逐条改；对时间用基座的 captions.py。"""
import argparse, json, re
from pathlib import Path

ap = argparse.ArgumentParser(); ap.add_argument("transcript"); ap.add_argument("out"); ap.add_argument("--max", type=int, default=14)
a = ap.parse_args()
tr = json.loads(Path(a.transcript).read_text())
ws = []
for seg in tr["segments"]:
    w_ = seg.get("words", [])
    for k, w in enumerate(w_): ws.append({"w": w["word"].strip(), "start": w["start"], "end": w["end"], "br": k == len(w_) - 1})
PUN = "，。！？、,.!?；;：:"
lines, cur = [], []
def flush():
    if not cur: return
    text = re.sub(f"[{PUN}]", " ", "".join(w["w"] for w in cur)).strip()
    if text: lines.append(re.sub(r"\s+", " ", text))
    cur.clear()
def L(xs): return len("".join(x["w"] for x in xs))
for w in ws:
    if cur and w["start"] - cur[-1]["end"] > 0.25: flush()
    cur.append(w)
    if L(cur) > a.max:  # 超长：回退到后 2/3 里停顿最长的位置断
        cand = [k for k in range(1, len(cur)) if L(cur[:k]) >= L(cur) / 3 and L(cur[:k]) <= a.max]
        k = max(cand, key=lambda k: cur[k]["start"] - cur[k - 1]["end"]) if cand else len(cur) - 1
        rest = cur[k:]; del cur[k:]; flush(); cur.extend(rest)
    if w["br"] or (w["w"] and w["w"][-1] in PUN): flush()
flush()
_N = r"[\d,]+|[一二两三四五六七八九十百千万几大]+"
lines = [re.sub(rf"({_N})块钱", r"$\1", re.sub(rf"({_N})到({_N})块钱", r"$\1到\2", x)).replace("钱", "$") for x in lines]
Path(a.out).write_text("# 字幕源初稿：改错字、专名，加 [重点词]，敏感词按基座的表替换\n" + "\n".join(lines) + "\n", encoding="utf-8")
print(f"{len(lines)} 行 → {a.out}")
