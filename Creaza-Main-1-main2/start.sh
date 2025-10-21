#!/bin/bash

echo "🚀 Starting Modern Image Editor..."
echo

echo "📦 Installing dependencies..."
cd backend && npm install
cd ../frontend && npm install
cd ..

echo
echo "🔧 Building WebAssembly module..."
cd wasm
if [ -f "Cargo.toml" ]; then
    cargo build --target wasm32-unknown-unknown --release
    wasm-pack build --target web
else
    echo "WebAssembly build skipped - Rust not available"
fi
cd ..

echo
echo "🤖 Starting AI Service (optional)..."
cd ai-service
gnome-terminal -- bash -c "python main.py; exec bash" 2>/dev/null || \
xterm -e "python main.py" 2>/dev/null || \
echo "Could not start AI service in new terminal"
cd ..

echo
echo "🖥️ Starting Backend..."
cd backend
gnome-terminal -- bash -c "npm start; exec bash" 2>/dev/null || \
xterm -e "npm start" 2>/dev/null || \
echo "Could not start backend in new terminal"
cd ..

echo
echo "🌐 Starting Frontend..."
cd frontend
gnome-terminal -- bash -c "npm run dev; exec bash" 2>/dev/null || \
xterm -e "npm run dev" 2>/dev/null || \
npm run dev
cd ..

echo
echo "✅ All services started!"
echo "📍 Open http://localhost:3000 in your browser"
echo
echo "Services running:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend: http://localhost:3001"
echo "  - AI Service: http://localhost:8000 (optional)"
echo