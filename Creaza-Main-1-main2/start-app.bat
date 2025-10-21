@echo off
echo Starting Image Editor with AI Chat...

echo Starting backend server...
start /B cmd /c "cd backend && npm start"

echo Starting AI service...
start /B cmd /c "cd ai-service && python main.py"

timeout /t 5 /nobreak >nul

echo Starting frontend...
cd frontend
npm run dev

pause