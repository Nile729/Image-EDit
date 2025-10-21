@echo off
echo 🚀 Starting Modern Image Editor...
echo.

echo 📦 Installing dependencies...
cd backend
call npm install
cd ..\frontend
call npm install
cd ..

echo.
echo 🔧 Building WebAssembly module...
cd wasm
if exist "Cargo.toml" (
    cargo build --target wasm32-unknown-unknown --release
    wasm-pack build --target web
) else (
    echo WebAssembly build skipped - Rust not available
)
cd ..

echo.
echo 🤖 Starting AI Service (optional)...
cd ai-service
start "AI Service" cmd /k "python main.py"
cd ..

echo.
echo 🖥️ Starting Backend...
cd backend
start "Backend" cmd /k "npm start"
cd ..

echo.
echo 🌐 Starting Frontend...
cd frontend
start "Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ✅ All services started!
echo 📍 Open http://localhost:3000 in your browser
echo.
echo Services running:
echo   - Frontend: http://localhost:3000
echo   - Backend: http://localhost:3001
echo   - AI Service: http://localhost:8000 (optional)
echo.
pause