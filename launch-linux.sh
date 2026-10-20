#!/bin/sh
cd -- "$(dirname -- "$0")" || exit 1
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1 &&
     "$candidate" -c 'import sys; assert sys.version_info >= (3,8)' >/dev/null 2>&1; then
    exec "$candidate" scripts/local_check.py start --open
  fi
done
printf '%s\n' 'Python 3.8+ is required. Ask your local AI assistant to locate its bundled Python.'
exit 1
