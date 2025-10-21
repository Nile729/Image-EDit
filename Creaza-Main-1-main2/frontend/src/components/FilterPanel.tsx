import React, { useState } from 'react'
import { Sliders, Palette, Circle, Sun, Contrast } from 'lucide-react'

interface FilterPanelProps {
  onApplyFilter: (filter: string, value: number) => void
  onResetFilters?: () => void
  currentFilters?: Record<string, number>
}

export function FilterPanel({ onApplyFilter, currentFilters = {} }: FilterPanelProps) {
  const filters = {
    brightness: currentFilters.brightness || 0,
    contrast: currentFilters.contrast || 0,
    saturation: currentFilters.saturation || 0,
    hue: currentFilters.hue || 0,
    blur: currentFilters.blur || 0,
    grayscale: currentFilters.grayscale || 0
  }

  const handleFilterChange = (filter: string, value: number) => {
    onApplyFilter(filter, value)
  }

  const resetFilters = () => {
    const resetValues = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      blur: 0,
      grayscale: 0
    }
    Object.entries(resetValues).forEach(([filter, value]) => {
      onApplyFilter(filter, value)
    })
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sliders size={20} />
          Filters
        </h3>
        <button
          onClick={resetFilters}
          className="glass-button px-3 py-1 rounded text-xs"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto">
        {/* Brightness */}
        <div className="glass p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sun size={16} className="text-yellow-400" />
            <label className="text-sm font-medium">Brightness</label>
            <span className="text-xs text-white/70 ml-auto">
              {filters.brightness > 0 ? '+' : ''}{filters.brightness}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={filters.brightness}
            onChange={(e) => handleFilterChange('brightness', parseInt(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
          />
        </div>

        {/* Contrast */}
        <div className="glass p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Contrast size={16} className="text-blue-400" />
            <label className="text-sm font-medium">Contrast</label>
            <span className="text-xs text-white/70 ml-auto">
              {filters.contrast > 0 ? '+' : ''}{filters.contrast}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={filters.contrast}
            onChange={(e) => handleFilterChange('contrast', parseInt(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
          />
        </div>

        {/* Saturation */}
        <div className="glass p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Palette size={16} className="text-pink-400" />
            <label className="text-sm font-medium">Saturation</label>
            <span className="text-xs text-white/70 ml-auto">
              {filters.saturation > 0 ? '+' : ''}{filters.saturation}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={filters.saturation}
            onChange={(e) => handleFilterChange('saturation', parseInt(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
          />
        </div>

        {/* Hue */}
        <div className="glass p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400"></div>
            <label className="text-sm font-medium">Hue</label>
            <span className="text-xs text-white/70 ml-auto">
              {filters.hue}°
            </span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={filters.hue}
            onChange={(e) => handleFilterChange('hue', parseInt(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
          />
        </div>

        {/* Blur */}
        <div className="glass p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Circle size={16} className="text-gray-400" />
            <label className="text-sm font-medium">Blur</label>
            <span className="text-xs text-white/70 ml-auto">
              {filters.blur}px
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            value={filters.blur}
            onChange={(e) => handleFilterChange('blur', parseInt(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
          />
        </div>

        {/* Grayscale */}
        <div className="glass p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-black to-white"></div>
            <label className="text-sm font-medium">Grayscale</label>
            <span className="text-xs text-white/70 ml-auto">
              {filters.grayscale}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.grayscale}
            onChange={(e) => handleFilterChange('grayscale', parseInt(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
          />
        </div>
      </div>
    </div>
  )
}