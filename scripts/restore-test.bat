@echo off
rem S8.2 Restore test: load a backup into a scratch database, compare it with the live one,
rem and check that every item's quantity equals the sum of its stock movements.
rem Usage: restore-test.bat D:\backups\spmu\2026-12-01\spmu_ims.sql
rem Needs a login that can CREATE and DROP databases, in %CNF% (not the backup login).
setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage: restore-test.bat path\to\spmu_ims.sql
    exit /b 2
)
if not defined MYSQL set MYSQL=C:\xampp\mysql\bin
if not defined CNF   set CNF=C:\spmu-backup\restore.cnf
if not defined LIVE  set LIVE=spmu_ims
set SCRATCH=spmu_restore_test
set TMPOUT=%TEMP%\spmu_restore_value.txt

"%MYSQL%\mysql.exe" --defaults-extra-file="%CNF%" -e "DROP DATABASE IF EXISTS %SCRATCH%; CREATE DATABASE %SCRATCH% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" || goto :fail
"%MYSQL%\mysql.exe" --defaults-extra-file="%CNF%" %SCRATCH% < "%~1" || goto :fail
echo Restored %~1 into %SCRATCH%.
echo.
echo Table                 Live   Restored
for %%t in (users suppliers items stock_movements item_requests item_request_lines turnovers supplier_orders) do (
    call :value "SELECT COUNT(*) FROM %LIVE%.%%t" L
    call :value "SELECT COUNT(*) FROM %SCRATCH%.%%t" R
    set "NAME=%%t                      "
    echo !NAME:~0,20!  !L!   !R!
)

rem The ledger rule: items.quantity must equal the sum of that item's movements.
call :value "SELECT COUNT(*) FROM %SCRATCH%.items i WHERE i.quantity <> (SELECT COALESCE(SUM(m.quantity), 0) FROM %SCRATCH%.stock_movements m WHERE m.item_id = i.id)" BAD
echo.
if not "%BAD%"=="0" (
    echo FAIL: %BAD% item^(s^) in the backup do not match their stock movements.
    goto :fail
)
echo PASS: every item's quantity matches its stock movements.
echo Counts can differ from live only by work done since the backup was taken.

"%MYSQL%\mysql.exe" --defaults-extra-file="%CNF%" -e "DROP DATABASE %SCRATCH%;"
del "%TMPOUT%" 2>nul
exit /b 0

:fail
echo RESTORE TEST FAILED. The scratch database %SCRATCH% was kept for inspection.
exit /b 1

rem call :value "<query>" VAR  - runs one query and stores the single result in VAR ("?" on error).
:value
set "%~2=?"
"%MYSQL%\mysql.exe" --defaults-extra-file="%CNF%" -N -e %1 > "%TMPOUT%" 2>nul || exit /b 0
set /p "%~2=" < "%TMPOUT%"
exit /b 0
