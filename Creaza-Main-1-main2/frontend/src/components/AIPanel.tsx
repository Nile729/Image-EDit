import React, { useState } from 'react'
import { Bot, Scissors, Palette, Sparkles, Upload, Wand2, MessageSquare, X } from 'lucide-react'

interface AIPanelProps {
  onAIProcess: (type: string, file?: File, prompt?: string, size?: string) => void
  onImageUpload?: (file: File) => void
  activeLayer?: string | null
  layers?: any[]
}

export function AIPanel({ onAIProcess, onImageUpload, activeLayer, layers }: AIPanelProps) {
  
  // Check if active layer has actual image content (not just white background)
  const hasImageContent = () => {
    if (!activeLayer || !layers) return false
    const layer = layers.find(l => l.id === activeLayer)
    if (!layer?.imageData) return false
    
    const data = layer.imageData.data
    // Check if there are non-white pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (!(r === 255 && g === 255 && b === 255)) {
        return true
      }
    }
    return false
  }
  const [isProcessing, setIsProcessing] = useState(false)

  const [textPrompt, setTextPrompt] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [imageSize, setImageSize] = useState('512x512')
  const [captionFile, setCaptionFile] = useState<File | null>(null)
  const [captionImage, setCaptionImage] = useState<string | null>(null)
  const [generatedCaption, setGeneratedCaption] = useState<string>('')
  const [captionProcessing, setCaptionProcessing] = useState(false)
  const [customBgColor, setCustomBgColor] = useState('#FFFFFF')
  const [customBgImage, setCustomBgImage] = useState<File | null>(null)
  const [customBgPreview, setCustomBgPreview] = useState<string | null>(null)




  const handleCaptionFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCaptionFile(file)
      // Display image preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setCaptionImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setGeneratedCaption('') // Clear previous caption
    }
  }

  const handleGenerateCaption = async () => {
    if (!captionFile) return
    
    setCaptionProcessing(true)
    setGeneratedCaption('')
    
    try {
      const formData = new FormData()
      formData.append('file', captionFile)
      
      const response = await fetch('http://localhost:8002/generate-caption', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.caption) {
          setGeneratedCaption(result.caption)
        } else {
          setGeneratedCaption('Failed to generate caption')
        }
      } else {
        setGeneratedCaption('Error generating caption')
      }
    } catch (error) {
      console.error('Caption generation error:', error)
      setGeneratedCaption('Error generating caption')
    } finally {
      setCaptionProcessing(false)
    }
  }

  const handleAIProcess = async (type: string, uploadFile?: File, customParam?: string) => {
    if (type === 'text-to-image' && !textPrompt.trim()) return
    if (type === 'enhance-image' && !uploadFile && !hasImageContent()) return
    if (type !== 'text-to-image' && type !== 'enhance-image' && !hasImageContent()) return
    
    setIsProcessing(true)
    setProgress(0)
    
    try {
      if (type === 'text-to-image') {
        setProgressMessage('Loading AI model...')
        setProgress(20)
        
        // Simulate progress for text-to-image
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev < 80) return prev + 5
            return prev
          })
        }, 500)
        
        await onAIProcess(type, uploadFile, textPrompt, imageSize)
        
        clearInterval(progressInterval)
        setProgress(100)
        setProgressMessage('Image generated successfully!')
        
        setTimeout(() => {
          setProgress(0)
          setProgressMessage('')
        }, 2000)
      } else {
        setProgressMessage('Processing image...')
        setProgress(50)
        if (type === 'custom-background-image') {
          await onAIProcess(type, uploadFile, customParam, undefined)
        } else {
          await onAIProcess(type, uploadFile, customParam || textPrompt, undefined)
        }
        setProgress(100)
        setProgressMessage('Processing complete!')
        
        setTimeout(() => {
          setProgress(0)
          setProgressMessage('')
        }, 1000)
      }
    } catch (error) {
      setProgressMessage('Processing failed')
      console.error('AI processing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="text-purple-400" size={20} />
        <h3 className="text-lg font-semibold">AI Features</h3>
      </div>





      {/* Text to Image Generation */}
      <div className="glass p-4 rounded-lg border border-purple-400/20">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="text-purple-400" size={18} />
          <label className="block text-sm font-medium">
            Black Forest Labs Text to Image
          </label>
        </div>
        <textarea
          value={textPrompt}
          onChange={(e) => setTextPrompt(e.target.value)}
          placeholder="Describe the image you want to generate... (e.g., 'a beautiful sunset over mountains, digital art')" 
          className="w-full glass-input px-3 py-2 rounded text-sm h-20 resize-none mb-3"
        />
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1">Image Size</label>
          <select 
            value={imageSize} 
            onChange={(e) => setImageSize(e.target.value)}
            className="w-full text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.3)',
              border: '1px solid rgba(139, 92, 246, 0.5)'
            }}
          >
            <option value="512x512" style={{backgroundColor: '#374151', color: 'white'}}>512x512 (Square)</option>
            <option value="768x512" style={{backgroundColor: '#374151', color: 'white'}}>768x512 (Landscape)</option>
            <option value="512x768" style={{backgroundColor: '#374151', color: 'white'}}>512x768 (Portrait)</option>
            <option value="1024x512" style={{backgroundColor: '#374151', color: 'white'}}>1024x512 (Wide)</option>
            <option value="512x1024" style={{backgroundColor: '#374151', color: 'white'}}>512x1024 (Tall)</option>
          </select>
        </div>
        <button
          onClick={() => handleAIProcess('text-to-image')}
          disabled={!textPrompt.trim() || isProcessing}
          className={`w-full glass-button p-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            !textPrompt.trim() || isProcessing 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-purple-500/20 border-purple-400/30'
          }`}
        >
          <Wand2 size={16} />
          <span className="font-medium">
            {isProcessing ? 'Generating...' : 'Generate Image'}
          </span>
        </button>
      </div>

      {/* Image Caption Section */}
      <div className="glass p-4 rounded-lg border border-green-400/20">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="text-green-400" size={18} />
          <label className="block text-sm font-medium">
            Image Captioning
          </label>
        </div>
        
        {/* Upload Image for Caption Button */}
        <button className="w-full mb-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleCaptionFileSelect}
            className="hidden"
            id="caption-file-input"
          />
          <label
            htmlFor="caption-file-input"
            className="w-full p-3 rounded-lg cursor-pointer flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-green-400/50 transition-all font-medium text-white"
          >
            <Upload size={16} />
            Upload Image
          </label>
        </button>
        
        {/* Generate Caption Button */}
        <button
          onClick={handleGenerateCaption}
          disabled={!captionFile || captionProcessing}
          className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium mb-3 ${
            !captionFile || captionProcessing 
              ? 'opacity-50 cursor-not-allowed bg-gray-500/20 border border-gray-500/30 text-gray-400' 
              : 'bg-green-500/20 hover:bg-green-500/30 border border-green-400/50 hover:border-green-400 text-white'
          }`}
        >
          <MessageSquare size={16} />
          <span>
            {captionProcessing ? 'Generating...' : 'Generate Caption'}
          </span>
        </button>
        
        {/* Image Preview */}
        {captionImage && (
          <div className="glass p-3 rounded-lg border border-green-400/30 mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-green-400">Uploaded Image:</div>
              <button
                onClick={() => {
                  setCaptionImage(null);
                  setCaptionFile(null);
                  setGeneratedCaption('');
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
            <div className="text-xs text-white/70 mb-2">{captionFile?.name}</div>
            <img 
              src={captionImage} 
              alt="Caption preview" 
              className="w-full max-w-xs mx-auto rounded-lg border border-white/20"
              style={{ maxHeight: '200px', objectFit: 'contain' }}
            />
          </div>
        )}
        
        {/* Generated Caption Display */}
        {generatedCaption && (
          <div className="glass p-3 rounded-lg border border-green-400/30">
            <div className="text-xs text-green-400 mb-1">Generated Caption</div>
            <div className="text-sm text-white">{generatedCaption}</div>
          </div>
        )}
      </div>

      {/* AI Tools */}
      <div className="space-y-3">
        <button
          onClick={() => handleAIProcess('remove-background')}
          disabled={!hasImageContent() || isProcessing}
          className={`w-full glass-button p-3 rounded-lg flex items-center gap-3 transition-all ${
            !hasImageContent() || isProcessing 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-white/20'
          }`}
        >
          <Scissors className="text-blue-400" size={16} />
          <div className="text-left">
            <div className="font-medium">AI Background Remover</div>
            <div className="text-xs text-white/70">
              {hasImageContent() ? 'Current Image' : ''}
            </div>
          </div>
        </button>

        <button
          onClick={() => handleAIProcess('blur-background')}
          disabled={!hasImageContent() || isProcessing}
          className={`w-full glass-button p-3 rounded-lg flex items-center gap-3 transition-all ${
            !hasImageContent() || isProcessing 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-white/20'
          }`}
        >
          <Palette className="text-green-400" size={16} />
          <div className="text-left">
            <div className="font-medium">AI Background Blur</div>
            <div className="text-xs text-white/70">
              {hasImageContent() ? 'Current Image' : ''}
            </div>
          </div>
        </button>

        <div className="glass p-3 rounded-lg border border-orange-400/20">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="text-orange-400" size={16} />
            <span className="font-medium">Custom Background Color</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="color"
              value={customBgColor}
              onChange={(e) => setCustomBgColor(e.target.value)}
              className="w-12 h-8 rounded border border-white/20 cursor-pointer"
              title="Select background color"
            />
            <input
              type="text"
              value={customBgColor}
              onChange={(e) => setCustomBgColor(e.target.value)}
              placeholder="#FFFFFF"
              className="flex-1 glass-input px-3 py-1 rounded text-sm"
            />
          </div>
          <button
            onClick={() => handleAIProcess('custom-background', undefined, customBgColor)}
            disabled={!hasImageContent() || isProcessing}
            className={`w-full glass-button p-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              !hasImageContent() || isProcessing 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-white/20'
            }`}
          >
            <Palette className="text-orange-400" size={14} />
            <span className="text-sm font-medium">
              {hasImageContent() ? 'Apply Background' : 'No image loaded'}
            </span>
          </button>
        </div>

        <div className="glass p-3 rounded-lg border border-cyan-400/20">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="text-cyan-400" size={16} />
            <span className="font-medium">Custom Background Image</span>
          </div>
          <button className="w-full mb-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setCustomBgImage(file)
                  const reader = new FileReader()
                  reader.onload = (e) => setCustomBgPreview(e.target?.result as string)
                  reader.readAsDataURL(file)
                }
                // Reset input value to allow same file to be selected again
                e.target.value = ''
              }}
              className="hidden"
              id="bg-image-input"
            />
            <label
              htmlFor="bg-image-input"
              className="w-full p-2 rounded-lg cursor-pointer flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-cyan-400/50 transition-all font-medium text-white"
            >
              <Upload size={14} />
              Upload Background
            </label>
          </button>
          {customBgPreview && (
            <div className="glass p-3 rounded-lg border border-cyan-400/30 mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-cyan-400">Background Preview:</div>
                <button
                  onClick={() => {
                    setCustomBgImage(null)
                    setCustomBgPreview(null)
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Remove background"
                >
                  <X size={14} />
                </button>
              </div>
              <img 
                src={customBgPreview} 
                alt="Background preview" 
                className="w-full max-h-24 object-cover rounded border border-white/20"
              />
            </div>
          )}
          <button
            onClick={() => handleAIProcess('custom-background-image', undefined, customBgImage)}
            disabled={!hasImageContent() || !customBgImage || isProcessing}
            className={`w-full glass-button p-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              !hasImageContent() || !customBgImage || isProcessing 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-white/20'
            }`}
          >
            <Upload className="text-cyan-400" size={14} />
            <span className="text-sm font-medium">
              {!hasImageContent() ? 'No image loaded' : !customBgImage ? 'Apply Background' : 'Apply Background'}
            </span>
          </button>
        </div>



        <button
          onClick={() => handleAIProcess('enhance-image')}
          disabled={!hasImageContent() || isProcessing}
          className={`w-full glass-button p-3 rounded-lg flex items-center gap-3 transition-all ${
            !hasImageContent() || isProcessing 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-white/20'
          }`}
        >
          <Sparkles className="text-yellow-400" size={16} />
          <div className="text-left">
            <div className="font-medium">Enhance Image</div>
            <div className="text-xs text-white/70">
              {hasImageContent() ? '4x Super-Resolution' : 'No image loaded'}
            </div>
          </div>
        </button>


      </div>



      {/* Processing Status */}
      {isProcessing && (
        <div className="glass p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <span className="text-sm">{progressMessage || 'Processing with AI...'}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="text-xs text-white/70 mt-1 text-center">
            {progress}%
          </div>
        </div>
      )}

      {/* AI Service Status */}
      <div className="glass p-3 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm">AI Service</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">Connected</span>
          </div>
        </div>
      </div>
    </div>
  )
}