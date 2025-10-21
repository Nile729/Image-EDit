import React from 'react'
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react'
import { Layer } from './Canvas'

interface LayerPanelProps {
  layers: Layer[]
  activeLayer: string | null
  onAddLayer: () => void
  onDeleteLayer: (id: string) => void
  onSetActiveLayer: (id: string) => void
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void
  onMoveLayer: (id: string, direction: 'up' | 'down') => void
}

export function LayerPanel({ 
  layers, 
  activeLayer, 
  onAddLayer, 
  onDeleteLayer, 
  onSetActiveLayer,
  onUpdateLayer,
  onMoveLayer
}: LayerPanelProps) {
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Layers</h3>
        <button
          onClick={onAddLayer}
          className="glass-button p-2 rounded-lg"
          title="Add Layer"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`glass p-3 rounded-lg cursor-pointer transition-all ${
              activeLayer === layer.id 
                ? 'ring-2 ring-blue-400/50 bg-blue-500/10' 
                : 'hover:bg-white/10'
            }`}
            onClick={() => onSetActiveLayer(layer.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm truncate">{layer.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdateLayer(layer.id, { visible: !layer.visible })
                  }}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteLayer(layer.id)
                  }}
                  className="p-1 hover:bg-red-500/20 rounded text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="mb-2">
              <label className="text-xs text-white/70 block mb-1">
                Opacity: {Math.round(layer.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={layer.opacity}
                onChange={(e) => {
                  onUpdateLayer(layer.id, { opacity: parseFloat(e.target.value) })
                }}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none slider"
              />
            </div>

            {/* Blend Mode */}
            <select 
              value={layer.blendMode}
              onChange={(e) => {
                onUpdateLayer(layer.id, { blendMode: e.target.value })
              }}
              className="w-full glass-input px-2 py-1 text-xs rounded"
            >
              <option value="normal">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
              <option value="soft-light">Soft Light</option>
              <option value="hard-light">Hard Light</option>
              <option value="color-dodge">Color Dodge</option>
              <option value="color-burn">Color Burn</option>
            </select>

            {/* Layer reorder buttons */}
            <div className="flex justify-center gap-1 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveLayer(layer.id, 'up')
                }}
                disabled={index === 0}
                className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveLayer(layer.id, 'down')
                }}
                disabled={index === layers.length - 1}
                className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
              >
                <ChevronDown size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}