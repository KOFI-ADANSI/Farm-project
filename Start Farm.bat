@echo off
setlocal
cd /d "%~dp0"
call npm run dev
if errorlevel 1 (
  echo.
  echo The Farm development server stopped with an error.
  pause
)
