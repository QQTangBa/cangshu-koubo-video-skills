#!/usr/bin/env python3
"""本地 mlx-whisper 转写，带逐词时间戳。
用法: python transcribe.py <视频> <输出.json> [--prompt "领域提示词"]"""
import argparse, glob, json, os

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("out")
ap.add_argument("--prompt", default="以下是普通话口播。")
a = ap.parse_args()
import mlx_whisper
cands = glob.glob(os.path.expanduser("~/.cache/huggingface/hub/models--mlx-community--whisper-large-v3-turbo/snapshots/*"))
model = cands[0] if cands else "mlx-community/whisper-large-v3-turbo"
r = mlx_whisper.transcribe(a.video, path_or_hf_repo=model, language="zh", word_timestamps=True,
                           condition_on_previous_text=False, initial_prompt=a.prompt)
json.dump(r, open(a.out, "w"), ensure_ascii=False)
for s in r["segments"]:
    print(f"{s['start']:7.2f}-{s['end']:7.2f} {s['text']}")
