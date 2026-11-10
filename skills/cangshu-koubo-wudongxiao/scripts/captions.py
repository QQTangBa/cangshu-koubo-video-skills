#!/usr/bin/env python3
"""字幕对时间：读 <工程>/字幕源.txt（一行一条，[ ] 标重点词，# 开头是注释），按 cut_transcript.json 的逐字时间对齐，
写 <工程>/captions.json 和 <工程>/字幕.srt（不带标记，给平台导入用）。字幕的样式和动画在 render.py 里。
间隔 <0.6 秒的相邻两条首尾相接不闪空。字幕里漏换的「钱」兜底换成 --money（默认 $）；其余敏感词在字幕源里手写好。
用法: python captions.py <工程> [--words cut_transcript.json] [--money $]"""
import argparse, difflib, json, re
from pathlib import Path

ap = argparse.ArgumentParser(); ap.add_argument("proj")
ap.add_argument("--words", default="cut_transcript.json"); ap.add_argument("--money", default="$")
a = ap.parse_args(); P = Path(a.proj)
PUN = re.compile(r"[\s，。、！？,.!?：:；;“”\"'（）()…—\-%·/]")
_NUM = r"[\d,]+|[一二两三四五六七八九十百千万几大]+"

def money(x):
    x = re.sub(rf"({_NUM})到({_NUM})块钱", rf"{a.money}\1到\2", x)
    x = re.sub(rf"({_NUM})块钱", rf"{a.money}\1", x)
    return x.replace("钱", a.money)

j = json.loads((P / a.words).read_text())
words = [{"w": w["word"].strip(), "start": w["start"], "end": w["end"]} for s in j["segments"] for w in s.get("words", [])] if isinstance(j, dict) else j
wc, wt = [], []
for w in words:
    t = PUN.sub("", w["w"]); n = max(len(t), 1)
    for i, ch in enumerate(t):
        wc.append(ch.lower()); wt.append((w["start"] + (w["end"] - w["start"]) * i / n, w["start"] + (w["end"] - w["start"]) * (i + 1) / n))
caps, sc, owner = [], [], []
for l in (P / "字幕源.txt").read_text(encoding="utf-8").splitlines():
    l = l.strip()
    if not l or l.startswith("#"): continue
    caps.append({"text": money(l.replace("[", "").replace("]", "")), "hl": [money(h) for h in re.findall(r"\[(.+?)\]", l)]})
    for ch in PUN.sub("", caps[-1]["text"]):
        sc.append(ch.lower()); owner.append(len(caps) - 1)
m = {}
for x, y, n in difflib.SequenceMatcher(None, sc, wc, autojunk=False).get_matching_blocks():
    for k in range(n): m[x + k] = y + k
first, last = {}, {}
for i, li in enumerate(owner):
    if i in m: first.setdefault(li, m[i]); last[li] = m[i]
for li, c in enumerate(caps):
    if li in first: c["start"], c["end"] = wt[first[li]][0], wt[last[li]][1]
for li, c in enumerate(caps):
    if "start" not in c:
        p = caps[li - 1]["end"] if li else 0.0
        q = next((x["start"] for x in caps[li + 1:] if "start" in x), p + 1.0)
        c["start"], c["end"] = p, q
        print("没对上，按前后插值:", c["text"])
for x, y in zip(caps, caps[1:]):
    if y["start"] - x["end"] < 0.6: x["end"] = y["start"]
out = [{"start": round(c["start"], 2), "end": round(c["end"], 2), "text": c["text"], **({"hl": c["hl"]} if c["hl"] else {})} for c in caps]
(P / "captions.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
def ts(t): return f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round(t % 1 * 1000)) % 1000:03d}"
(P / "字幕.srt").write_text("".join(f"{i + 1}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n\n" for i, c in enumerate(out)), encoding="utf-8")
print(f"{len(out)} 条 → captions.json、字幕.srt")
short = [(c["text"], round(c["end"] - c["start"], 2)) for c in out if c["end"] - c["start"] < 0.35]
if short: print("过短（合并到相邻行）:", short)
long_ = [c["text"] for c in out if len(c["text"]) > 14]
if long_: print("超过 14 字:", long_)
