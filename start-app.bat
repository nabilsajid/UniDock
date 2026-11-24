@echo off
cd /d "%~dp0"
echo Starting UniDock at http://localhost:3000 ...
echo Keep this window open while you use the app. Close it to stop the app.
if not exist .next\BUILD_ID call npm run build
call npm start
pause
