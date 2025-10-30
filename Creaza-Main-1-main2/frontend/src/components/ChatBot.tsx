import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react'
import axios from 'axios'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

interface ChatModel {
  id: string
  name: string
  description: string
}

interface ChatBotProps {
  isOpen: boolean
  onClose: () => void
}

const AI_SERVICE_URL = 'http://localhost:8002'

export const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m your image editing assistant. Ask me about tools, techniques, or creative ideas!',
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('llama-4-maverick')
  const [availableModels, setAvailableModels] = useState<ChatModel[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Load available models on component mount
    const loadModels = async () => {
      try {
        const response = await axios.get(`${AI_SERVICE_URL}/chat/models`)
        setAvailableModels(response.data.models)
      } catch (error) {
        console.error('Failed to load models:', error)
      }
    }
    if (isOpen) {
      loadModels()
    }
  }, [isOpen])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      console.log('Sending message:', input, 'with model:', selectedModel)
      
      // Build conversation history (exclude system message)
      const history = []
      for (let i = 1; i < messages.length - 1; i += 2) {
        if (i + 1 < messages.length) {
          history.push({
            user: messages[i].text,
            assistant: messages[i + 1].text
          })
        }
      }
      
      const response = await axios.post(
        `${AI_SERVICE_URL}/chat`,
        { message: input, model: selectedModel, history: history },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('Received response:', response.data)
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.message || 'No response received',
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error: any) {
      console.error('Chat error:', error)
      let errorText = 'Sorry, I encountered an error. Please try again.'
      
      if (error.code === 'ERR_NETWORK') {
        errorText = 'Cannot connect to AI service. Make sure it\'s running on port 8002.'
      } else if (error.response) {
        errorText = `Server error: ${error.response.status} - ${error.response.data?.detail || 'Unknown error'}`
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 glass-dark border border-white/20 rounded-lg shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-white">AI Guiding Assistant</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        {/* Model Selector */}
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white appearance-none focus:outline-none focus:border-blue-400 cursor-pointer"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id} className="bg-gray-800 text-white">
                {model.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-2 rounded-lg text-sm ${
                message.isUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-gray-200'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-gray-200 p-2 rounded-lg text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about editing techniques..."
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        {/* Model indicator */}
        <div className="mt-1 text-xs text-gray-400">
          Using: {availableModels.find(m => m.id === selectedModel)?.name || selectedModel}
        </div>
      </div>
    </div>
  )
}