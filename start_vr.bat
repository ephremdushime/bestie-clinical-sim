@echo off
title Bestie Clinical Sim - Virtual Teaching Hospital VR Launcher
cls
echo ====================================================================
echo   BESTIE CLINICAL SIM - ADVANCED 3D VIRTUAL TEACHING HOSPITAL
echo   Meta Quest 2 / 3 / 3S / Pro WebXR Launch Station
echo ====================================================================
echo.
echo 1. Starting Clinical Simulation Backend (FastAPI on Port 8000)...
start "Bestie Backend" cmd /k "cd /d \"%~dp0backend\" && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo 2. Starting Vite WebXR HTTPS Server (Port 5173)...
start "Bestie WebXR Frontend" cmd /k "cd /d \"%~dp0\" && npm.cmd run dev"

echo.
echo ====================================================================
echo   SERVERS ARE RUNNING!
echo ====================================================================
echo.
echo HOW TO CONNECT FROM YOUR META QUEST HEADSET:
echo.
echo  Step 1: Put on your Meta Quest and grab your controllers.
echo  Step 2: Make sure your Quest is connected to your local Wi-Fi.
echo  Step 3: Open the built-in "Meta Quest Browser" app.
echo  Step 4: In the address bar at the top, type:
echo.
echo             https://172.17.26.22:5173
echo.
echo  Step 5: When you see "Your connection isn't private" (due to local self-signed SSL):
echo          Click "Advanced" -> then click "Proceed to 172.17.26.22 (unsafe)".
echo.
echo  Step 6: The Bestie 3D Hospital will load.
echo          Click the blue "Enter Immersive VR" button!
echo.
echo  Step 7: Look around Resus Bay 04. Use your controller triggers to interact
echo          with the patient, stethoscope, crash cart defibrillator, and monitor!
echo.
echo ====================================================================
echo Press any key to close this launcher window (servers will keep running in background).
pause > nul

