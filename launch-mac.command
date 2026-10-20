#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1 &&
     "$candidate" -c 'import sys; assert sys.version_info >= (3,8)' >/dev/null 2>&1; then
    "$candidate" scripts/local_check.py start --open
    result=$?
    if [ "$result" -ne 0 ]; then read -r -p "启动失败，请将错误交给 AI 助手。按回车关闭。"; fi
    exit "$result"
  fi
done
printf '%s\n' '未找到 Python 3.8+。请让 AI 助手使用此 Skill，并查找其自带的 Python 环境。'
read -r -p "按回车关闭。"
exit 1
