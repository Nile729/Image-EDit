# Modern Image Editor - Project Structure

## 📁 Directory Overview

```
gen/
├── 📄 README.md                    # Main documentation
├── 📄 PROJECT_STRUCTURE.md         # This file
├── 🚀 start.bat                    # Windows startup script
├── 🚀 start.sh                     # Linux/macOS startup script
│
├── 🖥️ backend/                     # Node.js + Express backend
│   ├── 📄 package.json
│   ├── 📄 server.js                # Main server file
│   └── 📁 downloads/               # Saved images directory
│
├── 🌐 frontend/                    # React + TypeScript frontend
│   ├── 📄 package.json
│   ├── 📄 vite.config.js
│   ├── 📄 tailwind.config.js
│   ├── 📄 tsconfig.json
│   ├── 📄 index.html
│   └── 📁 src/
│       ├── 📄 main.tsx             # React entry point
│       ├── 📄 App.tsx              # Main app component
│       ├── 📄 index.css            # Glassmorphism styles
│       ├── 📁 components/
│       │   ├── 📄 Canvas.tsx       # WebGL canvas component
│       │   ├── 📄 Toolbar.tsx      # Tool selection
│       │   ├── 📄 LayerPanel.tsx   # Layer management
│       │   ├── 📄 FilterPanel.tsx  # Real-time filters
│       │   └── 📄 AIPanel.tsx      # AI features
│       ├── 📁 hooks/
│       │   └── 📄 useImageEditor.ts # Main state management
│       ├── 📁 utils/
│       │   └── 📄 wasmLoader.ts    # WebAssembly integration
│       └── 📁 webgl/
│           └── 📄 WebGLRenderer.ts # GPU-accelerated rendering
│
├── ⚡ wasm/                        # WebAssembly (Rust)
│   ├── 📄 Cargo.toml
│   └── 📁 src/
│       └── 📄 lib.rs               # Pixel manipulation functions
│
└── 🤖 ai-service/                  # Python AI service
    ├── 📄 requirements.txt
    └── 📄 main.py                  # FastAPI service
```

## 🎨 Design System

### Glassmorphism Theme
- **Background**: Gradient from purple-900 → blue-900 → indigo-900
- **Glass Elements**: `backdrop-blur-md bg-white/10 border border-white/20`
- **Interactive Elements**: Hover effects with `bg-white/20`
- **Accent Colors**: Blue-400, Purple-400, Pink-400 for highlights

### Component Styling
- **Panels**: Glass containers with rounded corners
- **Buttons**: Glass buttons with hover animations
- **Inputs**: Glass inputs with focus states
- **Sliders**: Custom styled range inputs

## 🔧 Core Features

### Canvas & Rendering
- **WebGL Renderer**: GPU-accelerated layer compositing
- **Real-time Filters**: Shader-based image processing
- **Layer System**: Multiple layers with blend modes
- **Tool System**: Brush, eraser, selection, etc.

### Performance Optimizations
- **WebAssembly**: Heavy pixel operations in Rust
- **WebGL Shaders**: GPU-accelerated filters
- **Layer Caching**: Efficient texture management
- **History Management**: Undo/redo with state snapshots

### AI Integration
- **Text-to-Image**: Black Forest Labs FLUX.1-schnell via Hugging Face API
- **Background Removal**: Edge-based segmentation
- **Style Transfer**: OpenCV-based artistic filters
- **Image Enhancement**: Noise reduction, sharpening

## 🚀 Getting Started

### Quick Start (Windows)
```bash
# Run the startup script
start.bat
```

### Quick Start (Linux/macOS)
```bash
# Make script executable and run
chmod +x start.sh
./start.sh
```

### Manual Setup
```bash
# Backend
cd backend && npm install && npm start

# Frontend (new terminal)
cd frontend && npm install && npm run dev

# AI Service (new terminal, optional)
cd ai-service && pip install -r requirements.txt && python main.py

# WebAssembly (optional)
cd wasm && wasm-pack build --target web
```

## 🌐 Service Endpoints

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **AI Service**: http://localhost:8000

## 📱 Responsive Design

- **Desktop**: Full feature set with multi-panel layout
- **Tablet**: Collapsible sidebars
- **Mobile**: Touch-optimized tools and gestures

## 🔒 Privacy & Security

- **Core Features**: 100% local processing
- **AI Features**: Uses Hugging Face API (requires internet)
- **No Database**: File-based storage only
- **No Telemetry**: Zero data collection

## 🎯 Performance Targets

- **Canvas Rendering**: 60 FPS at 1080p
- **Filter Application**: Real-time preview
- **File Operations**: < 2s for typical images
- **Memory Usage**: < 500MB for large projects