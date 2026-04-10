@echo off
title SlideStack - 本番ビルド
cd /d "%~dp0"

echo.
echo  ========================================
echo   SlideStack - 本番ビルド + 共有サーバー
echo  ========================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo  パッケージをインストールしています...
    call npm install
    echo.
)

echo  本番ビルドを作成中...
echo.
call npx vite build
if errorlevel 1 (
    echo.
    echo  [エラー] ビルドに失敗しました
    pause
    exit /b 1
)

echo.
echo  ========================================
echo  ビルド完了！ 共有サーバーを起動します
echo.
echo  同じネットワーク上の人に Network URL を
echo  共有すれば、誰でもアクセスできます
echo  ========================================
echo.

call npx vite preview --host
pause
