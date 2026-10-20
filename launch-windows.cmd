@echo off
setlocal
cd /d "%~dp0"
py -3 -c "import sys; assert sys.version_info >= (3,8)" >nul 2>&1
if not errorlevel 1 (
  py -3 scripts\local_check.py start --open
  if errorlevel 1 pause
  exit /b
)
python -c "import sys; assert sys.version_info >= (3,8)" >nul 2>&1
if not errorlevel 1 (
  python scripts\local_check.py start --open
  if errorlevel 1 pause
  exit /b
)
echo Python 3.8+ is required. Ask your local AI assistant to locate its bundled Python.
pause
exit /b 1
