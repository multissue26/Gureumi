@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "PYTHON_CMD="
where py.exe >nul 2>&1
if not errorlevel 1 set "PYTHON_CMD=py"
if defined PYTHON_CMD goto FIND_PORT

where python.exe >nul 2>&1
if not errorlevel 1 set "PYTHON_CMD=python"
if defined PYTHON_CMD goto FIND_PORT

echo.
echo [ERROR] Python was not found.
echo Install Python 3, or run the site from GitHub Pages.
echo.
pause
exit /b 1

:FIND_PORT
set "PORT="
for /L %%P in (8088,1,8099) do (
  if not defined PORT (
    netstat -ano -p tcp 2>nul | findstr /R /C:":%%P .*LISTENING" >nul
    if errorlevel 1 set "PORT=%%P"
  )
)
if not defined PORT set "PORT=8188"

if not "%PORT%"=="8088" (
  echo.
  echo [INFO] Port 8088 is already in use.
  echo        An older Dding DB server may still be running.
  echo        v0.4.0 will use port %PORT% instead.
)

echo.
echo ===============================================
echo  Dding Personal DB v0.4.0
echo ===============================================
echo URL: http://127.0.0.1:%PORT%/?v=0.4.0
echo Keep this window open while using the site.
echo.
start "" "http://127.0.0.1:%PORT%/?v=0.4.0"
%PYTHON_CMD% -m http.server %PORT% --bind 127.0.0.1

if errorlevel 1 (
  echo.
  echo [ERROR] The local web server stopped with an error.
  pause
)
endlocal
