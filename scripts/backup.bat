@echo off
rem S8.2 Daily backup of E-Supply ZPPSU: database dump, item photos and .env.
rem Run once a day from Windows Task Scheduler. See docs/DEPLOYMENT.md section 9.
rem The MariaDB login is read from %CNF% (an option file), never typed on the command line.
setlocal

if not defined MYSQL set MYSQL=C:\xampp\mysql\bin
if not defined APP   set APP=C:\xampp\htdocs\spmu
if not defined DEST  set DEST=D:\backups\spmu
if not defined CNF   set CNF=C:\spmu-backup\backup.cnf
if not defined KEEP_DAYS set KEEP_DAYS=7

for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%d
set OUT=%DEST%\%TODAY%
if not exist "%OUT%" mkdir "%OUT%" || goto :fail

"%MYSQL%\mysqldump.exe" --defaults-extra-file="%CNF%" --single-transaction --routines spmu_ims --result-file="%OUT%\spmu_ims.sql" || goto :fail

rem robocopy exit codes 0-7 mean success.
robocopy "%APP%\storage\app\public" "%OUT%\photos" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto :fail

copy /Y "%APP%\.env" "%OUT%\env.txt" >nul || goto :fail

rem Delete backup folders older than KEEP_DAYS.
forfiles /P "%DEST%" /D -%KEEP_DAYS% /C "cmd /c if @isdir==TRUE rd /S /Q @path" >nul 2>nul

echo Backup OK: %OUT%
exit /b 0

:fail
echo BACKUP FAILED. Check %CNF%, the paths at the top of this file, and free space on %DEST%.
exit /b 1
