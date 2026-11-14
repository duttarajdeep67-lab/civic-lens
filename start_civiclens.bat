@echo off
title CivicLens Starter
echo ===========================================
echo Starting CivicLens Platform Services...
echo ===========================================

cd /d "d:\CLAUDE"
powershell.exe -ExecutionPolicy Bypass -File "d:\CLAUDE\run_civiclens.ps1"

pause
