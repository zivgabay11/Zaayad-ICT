@echo off
cd /d "%~dp0"
echo Starting Horus prototype dev server...
echo A browser window will open automatically once it's ready.
call npm run dev
pause
