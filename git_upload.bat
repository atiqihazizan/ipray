@echo off
echo ===================================
echo Git Upload Helper for iPray Project
echo ===================================

REM Check if git is initialized
if not exist .git (
    echo Initializing git repository...
    git init
)

REM Add all files
echo.
echo Adding files to git...
git add .

REM Get current date and time
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set CURRENT_DATE=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%
set CURRENT_TIME=%datetime:~8,2%:%datetime:~10,2%

REM Set default commit message
set commit_msg=[%CURRENT_DATE% %CURRENT_TIME%] Update
echo.
echo Committing with message: "%commit_msg%"
git commit -m "%commit_msg%"

REM Check if remote exists
git remote -v | findstr "origin" > nul
if errorlevel 1 (
    echo.
    echo No remote repository found.
    set /p repo_url="Enter your GitHub repository URL: "
    git remote add origin %repo_url%
    git branch -M main
)

REM Push to remote
echo.
echo Pushing to remote repository...
git push -u origin main

echo.
echo ===================================
echo Process completed!
echo ===================================
pause
