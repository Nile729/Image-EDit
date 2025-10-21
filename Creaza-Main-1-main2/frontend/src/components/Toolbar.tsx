import React from 'react'
import { 
  Move, 
  Crop, 
  Paintbrush, 
  Eraser, 
  Type, 
  RotateCw,
  Maximize2,
  MousePointer, 
  ZoomIn, 
  Hand,
  Undo,
  Redo
} from 'lucide-react'

export type Tool = 'move' | 'crop' | 'brush' | 'eraser' | 'text' | 'rotate' | 'resize' | 'select' | 'zoom' | 'pan'

interface ToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

const tools = [
  { id: 'move' as Tool, icon: Move, label: 'Move' },
  { id: 'crop' as Tool, icon: Crop, label: 'Crop' },
  { id: 'brush' as Tool, icon: Paintbrush, label: 'Brush' },
  { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
  { id: 'text' as Tool, icon: Type, label: 'Text' },
  { id: 'rotate' as Tool, icon: RotateCw, label: 'Rotate' },
  { id: 'resize' as Tool, icon: Maximize2, label: 'Resize' },
  { id: 'select' as Tool, icon: MousePointer, label: 'Select' },
  { id: 'zoom' as Tool, icon: ZoomIn, label: 'Zoom' },
  { id: 'pan' as Tool, icon: Hand, label: 'Pan' },
]

export function Toolbar({ activeTool, onToolChange, onUndo, onRedo, canUndo, canRedo }: ToolbarProps) {
  return (
    <div className="p-2 space-y-2">
      {/* Undo/Redo */}
      <div className="space-y-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
            canUndo 
              ? 'glass-button hover:bg-white/20' 
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
          title="Undo"
        >
          <Undo size={20} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
            canRedo 
              ? 'glass-button hover:bg-white/20' 
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
          title="Redo"
        >
          <Redo size={20} />
        </button>
      </div>

      <div className="h-px bg-white/10 my-3" />

      {/* Tools */}
      {tools.map((tool) => {
        const Icon = tool.icon
        const isActive = activeTool === tool.id
        
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
              isActive 
                ? 'bg-blue-500/30 border border-blue-400/50 shadow-lg shadow-blue-500/20' 
                : 'glass-button hover:bg-white/20'
            }`}
            title={tool.label}
          >
            <Icon size={20} className={isActive ? 'text-blue-300' : 'text-white'} />
          </button>
        )
      })}
    </div>
  )
}