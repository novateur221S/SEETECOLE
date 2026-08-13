@echo off
setlocal
cd /d "%~dp0"
echo Demarrage de SETALMA ECOLE...
echo.
echo Si une fenetre de navigateur ne s'ouvre pas automatiquement,
echo ouvrez cette adresse : http://localhost:8000
echo.
start "" "http://localhost:8000"
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8000
  exit /b
)
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8000
  exit /b
)
echo Python n'est pas installe sur cette machine.
echo Vous pouvez quand meme ouvrir index.html, mais la geolocalisation marche mieux via localhost.
pause
