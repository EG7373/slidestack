@echo off
title SlideStack
cd /d "%~dp0"

echo.
echo  ========================================
echo   SlideStack - スライドワークスペース
echo  ========================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo  初回セットアップ中... パッケージをインストールしています
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  [エラー] npm install に失敗しました
        echo  Node.js がインストールされているか確認してください
        pause
        exit /b 1
    )
    echo.
)

echo  サーバーを起動しています...
echo.
echo  ブラウザで以下のURLを開いてください:
echo.
echo    ローカル:   http://localhost:5173
echo    LAN共有:    下記に表示されるNetwork URLを共有してください
echo.
echo  終了するには Ctrl+C を押してください
echo  ========================================
echo.

call npx vite --host
pause
