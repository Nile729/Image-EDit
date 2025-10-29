import { useState, useCallback, useRef } from 'react'
import { Layer } from '../components/Canvas'
import { Tool } from '../components/Toolbar'
import { WebGLRenderer } from '../webgl/WebGLRenderer'

interface HistoryState {
  layers: Layer[]
  activeLayer: string | null
}

// Global filter state outside component
let currentFilters: Record<string, number> = {}

export function useImageEditor() {
  const [layers, setLayers] = useState<Layer[]>([])
  const [activeLayer, setActiveLayer] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('move')
  const [filterUpdate, setFilterUpdate] = useState(0)
  
  // History management
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const saveToHistory = useCallback(() => {
    const newState: HistoryState = { layers: [...layers], activeLayer }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    } else {
      setHistoryIndex(prev => prev + 1)
    }
    
    setHistory(newHistory)
  }, [layers, activeLayer, history, historyIndex])

  const addLayer = useCallback(() => {
    // Create a blank white canvas for the new layer
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 500
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      opacity: 1,
      imageData,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }
    }
    
    setLayers(prev => [...prev, newLayer])
    setActiveLayer(newLayer.id)
    // Don't save to history on initial layer creation
  }, [layers.length])

  const deleteLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id))
    if (activeLayer === id) {
      setActiveLayer(layers.length > 1 ? layers[0].id : null)
    }
    saveToHistory()
  }, [activeLayer, layers, saveToHistory])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setLayers(prevState.layers)
      setActiveLayer(prevState.activeLayer)
      setHistoryIndex(prev => prev - 1)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setLayers(nextState.layers)
      setActiveLayer(nextState.activeLayer)
      setHistoryIndex(prev => prev + 1)
    }
  }, [history, historyIndex])

  const openImage = useCallback(() => {
    if (!fileInputRef.current) {
      // Create hidden file input
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.style.display = 'none'
      document.body.appendChild(input)
      fileInputRef.current = input
    }

    fileInputRef.current.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('image', file)

      try {
        const response = await fetch('/api/open-image', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const result = await response.json()
          
          // Create image element to get ImageData
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 800
            canvas.height = 500
            const ctx = canvas.getContext('2d')!
            
            // Fill with white background
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            
            // Scale image to fit canvas while maintaining aspect ratio
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
            const scaledWidth = img.width * scale
            const scaledHeight = img.height * scale
            const x = (canvas.width - scaledWidth) / 2
            const y = (canvas.height - scaledHeight) / 2
            
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            
            // Always create new layer
            const newLayer: Layer = {
              id: `layer-${Date.now()}`,
              name: file.name,
              visible: true,
              opacity: 1,
              imageData,
              transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }
            }
            
            setLayers(prev => [...prev, newLayer])
            setActiveLayer(newLayer.id)
            saveToHistory()
          }
          img.src = result.data
        }
      } catch (error) {
        console.error('Failed to open image:', error)
      }
    }

    fileInputRef.current.click()
  }, [saveToHistory])

  const saveImage = useCallback(async () => {
    if (layers.length === 0) return

    // Create composite canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Find canvas dimensions from layers
    let maxWidth = 0, maxHeight = 0
    layers.forEach(layer => {
      if (layer.imageData) {
        maxWidth = Math.max(maxWidth, layer.imageData.width)
        maxHeight = Math.max(maxHeight, layer.imageData.height)
      }
    })
    
    canvas.width = maxWidth
    canvas.height = maxHeight
    
    // Composite all visible layers
    layers.forEach(layer => {
      if (layer.visible && layer.imageData) {
        ctx.globalAlpha = layer.opacity
        
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = layer.imageData.width
        tempCanvas.height = layer.imageData.height
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.putImageData(layer.imageData, 0, 0)
        
        ctx.drawImage(tempCanvas, 0, 0)
      }
    })

    // Convert to blob and save
    canvas.toBlob(async (blob) => {
      if (!blob) return

      const reader = new FileReader()
      reader.onload = async () => {
        const imageData = reader.result as string
        
        try {
          const response = await fetch('/api/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData,
              filename: `edited-image-${Date.now()}.png`,
              format: 'png'
            })
          })

          if (response.ok) {
            const result = await response.json()
            console.log('Image saved:', result.message)
          }
        } catch (error) {
          console.error('Failed to save image:', error)
        }
      }
      reader.readAsDataURL(blob)
    }, 'image/png')
  }, [layers])

  const updateLayer = useCallback((layerId: string, imageData: ImageData, transform?: any) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, imageData, ...(transform && { transform }) } : layer
    ))
    saveToHistory()
  }, [saveToHistory])

  const updateLayerProps = useCallback((layerId: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ))
    saveToHistory()
  }, [saveToHistory])

  const handleAIProcess = useCallback(async (type: string, file?: File, prompt?: string, size?: string) => {
    try {
      let response
      
      if (type === 'text-to-image') {
        if (!prompt) return
        
        const [width, height] = (size || '512x512').split('x').map(Number)
        
        response = await fetch('http://localhost:8002/text-to-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            width,
            height,
            num_inference_steps: 50,
            guidance_scale: 12.0
          })
        })
      } else if (type === 'generate-caption') {
        if (!file) return
        
        const formData = new FormData()
        formData.append('file', file)
        
        response = await fetch('http://localhost:8002/generate-caption', {
          method: 'POST',
          body: formData
        })
        
        if (response?.ok) {
          const result = await response.json()
          if (result.success && result.caption) {
            alert(`Generated Caption: ${result.caption}`)
            
            // Display the uploaded image on canvas if available
            if (result.image) {
              const img = new Image()
              img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = 800
                canvas.height = 500
                const ctx = canvas.getContext('2d')!
                
                // Fill with white background
                ctx.fillStyle = 'white'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                
                // Scale image to fit canvas while maintaining aspect ratio
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
                const scaledWidth = img.width * scale
                const scaledHeight = img.height * scale
                const x = (canvas.width - scaledWidth) / 2
                const y = (canvas.height - scaledHeight) / 2
                
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                
                const newLayer: Layer = {
                  id: `layer-${Date.now()}`,
                  name: `Captioned: ${file.name}`,
                  visible: true,
                  opacity: 1,
                  imageData,
                  transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }
                }
                
                setLayers(prev => [...prev, newLayer])
                setActiveLayer(newLayer.id)
                saveToHistory()
              }
              img.src = result.image
            }
          }
        }
        return
      } else {
        const formData = new FormData()
        
        if (file) {
          formData.append('file', file)
        } else if (activeLayer) {
          // Convert active layer to blob and use it
          const activeLayerData = layers.find(l => l.id === activeLayer)
          if (!activeLayerData?.imageData) return
          
          const canvas = document.createElement('canvas')
          canvas.width = activeLayerData.imageData.width
          canvas.height = activeLayerData.imageData.height
          const ctx = canvas.getContext('2d')!
          ctx.putImageData(activeLayerData.imageData, 0, 0)
          
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/png')
          })
          
          formData.append('file', blob, 'canvas-image.png')
        } else {
          return
        }
        
        const endpoints = {
          'remove-background': '/remove-background',
          'blur-background': '/blur-background',
          'custom-background': '/custom-background',
          'custom-background-image': '/custom-background-image',
          'style-transfer': '/style-transfer',
          'enhance-image': '/enhance-image'
        }
        

        
        if (type === 'custom-background' && prompt) {
          formData.append('color', prompt)
        } else if (type === 'custom-background-image' && prompt) {
          // prompt contains the background image file for this case
          formData.append('background', prompt as any)
        }
        
        response = await fetch(`http://localhost:8002${endpoints[type as keyof typeof endpoints]}`, {
          method: 'POST',
          body: formData
        })
      }
      
      if (response?.ok) {
        const result = await response.json()
        
        if (result.success && result.image) {
          // Create new layer with AI-processed image
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 800
            canvas.height = 500
            const ctx = canvas.getContext('2d')!
            
            // Fill with white background
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            
            // Scale image to fit canvas while maintaining aspect ratio
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
            const scaledWidth = img.width * scale
            const scaledHeight = img.height * scale
            const x = (canvas.width - scaledWidth) / 2
            const y = (canvas.height - scaledHeight) / 2
            
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            
            let layerName = `AI ${type}`
            if (type === 'text-to-image' && prompt) {
              // Count existing layers with same prompt
              const existingCount = layers.filter(l => l.name.startsWith(prompt)).length
              layerName = existingCount > 0 ? `${prompt}_${existingCount + 1}` : prompt
            } else if (type === 'remove-background' && activeLayer) {
              const activeLayerData = layers.find(l => l.id === activeLayer)
              if (activeLayerData?.name) {
                const nameWithoutExt = activeLayerData.name.replace(/\.[^/.]+$/, '')
                layerName = `${nameWithoutExt}_remove_bg`
              }
            } else if (type === 'blur-background' && activeLayer) {
              const activeLayerData = layers.find(l => l.id === activeLayer)
              if (activeLayerData?.name) {
                const nameWithoutExt = activeLayerData.name.replace(/\.[^/.]+$/, '')
                layerName = `${nameWithoutExt}_blur_bg`
              }
            } else if (type === 'custom-background' && activeLayer) {
              const activeLayerData = layers.find(l => l.id === activeLayer)
              if (activeLayerData?.name) {
                const nameWithoutExt = activeLayerData.name.replace(/\.[^/.]+$/, '')
                layerName = `${nameWithoutExt}_custom_bg`
              }
            } else if (type === 'custom-background-image' && activeLayer) {
              const activeLayerData = layers.find(l => l.id === activeLayer)
              if (activeLayerData?.name) {
                const nameWithoutExt = activeLayerData.name.replace(/\.[^/.]+$/, '')
                layerName = `${nameWithoutExt}_custom_bg_img`
              }
            } else if (type === 'enhance-image' && activeLayer) {
              const activeLayerData = layers.find(l => l.id === activeLayer)
              if (activeLayerData?.name) {
                const nameWithoutExt = activeLayerData.name.replace(/\.[^/.]+$/, '')
                layerName = `${nameWithoutExt}_enhanced`
              }
            }
            
            const newLayer: Layer = {
              id: `layer-${Date.now()}`,
              name: layerName,
              visible: true,
              opacity: 1,
              imageData,
              transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }
            }
            
            setLayers(prev => [...prev, newLayer])
            setActiveLayer(newLayer.id)
            saveToHistory()
          }
          img.src = result.image
        }
      }
    } catch (error) {
      console.error('AI processing failed:', error)
    }
  }, [saveToHistory])

  const handleImageUpload = useCallback((file: File) => {
    const img = new Image()
    const reader = new FileReader()
    
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 500
        const ctx = canvas.getContext('2d')!
        
        // Fill with white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const x = (canvas.width - scaledWidth) / 2
        const y = (canvas.height - scaledHeight) / 2
        
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        const newLayer: Layer = {
          id: `layer-${Date.now()}`,
          name: file.name,
          visible: true,
          opacity: 1,
          imageData,
          transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }
        }
        
        setLayers(prev => [...prev, newLayer])
        setActiveLayer(newLayer.id)
        saveToHistory()
      }
      img.src = e.target?.result as string
    }
    
    reader.readAsDataURL(file)
  }, [saveToHistory])

  const moveLayer = useCallback((layerId: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const index = prev.findIndex(layer => layer.id === layerId)
      if (index === -1) return prev
      
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev
      
      const newLayers = [...prev]
      const [movedLayer] = newLayers.splice(index, 1)
      newLayers.splice(newIndex, 0, movedLayer)
      return newLayers
    })
    saveToHistory()
  }, [saveToHistory])

  const applyFilter = useCallback((filter: string, value: number) => {
    if (!activeLayer) return
    
    currentFilters[filter] = value
    setFilterUpdate(prev => prev + 1)
    
    setLayers(prev => prev.map(layer => {
      if (layer.id === activeLayer && layer.imageData) {
        if (!layer.originalImageData) {
          layer.originalImageData = layer.imageData
        }
        
        try {
          const canvas = document.createElement('canvas')
          canvas.width = layer.originalImageData.width
          canvas.height = layer.originalImageData.height
          
          const renderer = new WebGLRenderer(canvas)
          const filteredImageData = renderer.applyFilters(layer.originalImageData, currentFilters)
          
          // Preserve existing transform state
          return { ...layer, imageData: filteredImageData }
        } catch (error) {
          console.warn('WebGL filter failed, using original:', error)
          return { ...layer, imageData: layer.originalImageData }
        }
      }
      return layer
    }))
  }, [activeLayer])

  const resetFilters = useCallback(() => {
    if (!activeLayer) return
    
    currentFilters = {}
    setFilterUpdate(prev => prev + 1)
    setLayers(prev => prev.map(layer => {
      if (layer.id === activeLayer && layer.originalImageData) {
        // Preserve existing transform state
        return { ...layer, imageData: layer.originalImageData }
      }
      return layer
    }))
  }, [activeLayer])

  return {
    layers,
    activeLayer,
    tool,
    setTool,
    addLayer,
    deleteLayer,
    setActiveLayer,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    openImage,
    saveImage,
    applyFilter,
    resetFilters,
    updateLayer,
    updateLayerProps,
    moveLayer,
    setLayers,
    handleAIProcess,
    handleImageUpload,
    currentFilters
  }
}