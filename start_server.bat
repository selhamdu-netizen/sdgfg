@echo off
chcp 65001 > nul
title شركة بصمة كلين للخدمات والنظافة العامة - موريتانيا

echo =====================================================================
echo        شركة بصمة كلين للخدمات والنظافة العامة - موريتانيا 🇲🇷
echo       BASSMA CLEAN - Services de Proprete & Hygiene - Mauritanie
echo =====================================================================
echo.
echo جاري فتح الموقع تلقائياً في متصفحك الافتراضي...
echo الرابط: http://localhost:8080
echo.
echo 👤 المشرف (Admin): admin@bassmaclean.mr / كلمة المرور: admin123
echo 👤 العميل (Client): client@mauritel.mr / كلمة المرور: client123
echo.
echo =====================================================================

:: فتح المتصفح تلقائياً بعد ثانية واحدة
start "" http://localhost:8080

:: تشغيل خادم بايثون
"C:\Users\Al Fatoute\AppData\Local\Programs\Python\Python314\python.exe" server.py
if errorlevel 1 (
    echo.
    echo جاري المحاولة بأمر python العام...
    python server.py
)
pause
