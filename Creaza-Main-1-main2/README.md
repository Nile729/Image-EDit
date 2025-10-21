# Modern Image Editor with Glassmorphism

A GPU-accelerated image editor with WebGL rendering, modern glassmorphism UI, and local AI features.

## Features

- **GPU-Accelerated Rendering**: WebGL-powered canvas for smooth performance
- **Core Tools**: Move, crop, brush, eraser, text, fill, selection, zoom, pan
- **Layer System**: Multiple layers with reordering, opacity, blend modes
- **Filters**: Brightness, contrast, grayscale, blur, hue, saturation (WebGL shaders)
- **Undo/Redo**: Complete history management
- **Modern UI**: React + TailwindCSS with glassmorphism design
- **WebAssembly**: Rust-powered pixel manipulation for heavy operations
- **AI Features**: Background removal, style transfer, and text-to-image generation via Hugging Face API
- **AI Chat Assistant**: Real-time editing guidance using Google Gemini via OpenRouter API

## Setup Instructions

### Prerequisites
- Node.js 18+
- Rust (for WebAssembly compilation)
- Python 3.8+ (for AI features)

### Installation

1. **Backend Setup**
```bash
cd backend
npm install
```

2. **Frontend Setup**
```bash
cd frontend
npm install
```

3. **WebAssembly Module**
```bash
cd wasm
cargo build --target wasm32-unknown-unknown --release
wasm-pack build --target web
```

4. **AI Service (Optional)**
```bash
cd ai-service
pip install -r requirements.txt
```

### Running the Application

1. **Start Backend**
```bash
cd backend
npm start
```

2. **Start Frontend**
```bash
cd frontend
npm run dev
```

3. **Start AI Service (Optional)**
```bash
cd ai-service
python main.py
```

4. **Open Browser**
Navigate to `http://localhost:3000`

## Architecture

- **Frontend**: React + TypeScript + TailwindCSS + WebGL
- **Backend**: Node.js + Express (file operations only)
- **WebAssembly**: Rust for pixel manipulation
- **AI Service**: Python + FastAPI + Hugging Face API integration
- **Storage**: Local filesystem only - no database or cloud

## Performance

- All core editing operations run client-side
- WebGL shaders for real-time filters
- WebAssembly for heavy pixel operations
- Optimized layer rendering with GPU acceleration

## Privacy

- Core editing operations run offline
- AI features use Hugging Face API (requires internet)
- No telemetry or tracking
- Images processed locally except for AI generation