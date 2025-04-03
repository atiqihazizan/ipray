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

REM Get commit message
echo.
set /p commit_msg="Enter your commit message: "
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
