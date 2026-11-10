#!/usr/bin/env python3
"""用户给了字幕文件（剪映 SRT）时，把它变成基座的字幕源初稿：一行一条，用户的字照用。
用法: python3 srt_captions.py <字幕.srt> <工程>/基座/字幕源.txt
之后人工改这个文件（规则见 cangshu-koubo-wudongxiao 的 references/captions.md）：断在词中间的行重新断句、单行 ≤14 字、
专名统一写法、给重点词加 [ ]、敏感词按基座的表替换（钱 → $ 等）。只改断句、标记和敏感词，不改用户的字（错字、专名除外）。
对时间用基座的 captions.py，不在这里做。"""
import re, sys
from pathlib import Path

srt, out = sys.argv[1:3]
txt = Path(srt).read_text(encoding="utf-8-sig")
lines = []
for block in re.split(r"\n\s*\n", txt.strip()):
    rows = [r for r in block.splitlines() if r.strip()]
    if len(rows) >= 3 and "-->" in rows[1]:
        lines.append("".join(rows[2:]).strip())
Path(out).write_text("# 字幕源：一行一条。只改断句、加 [重点词]、按基座替换敏感词，不改用户的字\n" + "\n".join(lines) + "\n", encoding="utf-8")
print(f"{len(lines)} 行 → {out}")
