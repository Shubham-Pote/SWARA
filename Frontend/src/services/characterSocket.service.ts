import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  role: 'user' | 'character'
  content: string
  timestamp: Date
  emotion?: string
  animation?: string
  isError?: boolean
  fallback?: boolean
}

interface PerformanceMetrics {
  responseTime: number
  isSlowResponse: boolean
  timestamp: string
}

interface StreamWarning {
  message: string
  duration: number
}

class CharacterSocketService {
  private socket: Socket | null = null
  private isConnected = false
  private callbacks: { [key: string]: Function[] } = {}

  constructor() {
    this.connect()
  }

  private connect() {
    // Prevent multiple connections
    if (this.socket && this.socket.connected) {
      console.log('⚠️ WebSocket already connected, skipping...');
      return;
    }

    // Use the current URL's protocol and hostname for WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = window.location.hostname
    const port = '5000' // Backend port - always 5000 regardless of frontend port
    const BACKEND_URL = `http://${hostname}:${port}`
    
    console.log('🔌 Connecting to WebSocket:', `${BACKEND_URL}/character`)
    console.log('🌐 Frontend URL:', window.location.href)
    
    // Get authentication token
    const token = localStorage.getItem('token')
    console.log('🔑 Auth token exists:', !!token)
    
    this.socket = io(`${BACKEND_URL}/character`, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 2,  // Reduced to 2
      reconnectionDelay: 3000,  // Increased to 3 seconds
      reconnectionDelayMax: 10000,  // Max 10 seconds
      timeout: 10000,  // 10 second connection timeout
      forceNew: true,
      auth: {
        token: token
      }
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ Connected to character server')
      console.log('Socket ID:', this.socket?.id)
      this.isConnected = true
      this.emit('connection_status', { connected: true })
    })

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from character server')
      this.isConnected = false
      this.emit('connection_status', { connected: false })
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error)
      console.log('Error details:', error.message)
      this.emit('connection_error', error)
      
      // Try fallback to mock mode after 3 failed attempts
      setTimeout(() => {
        if (!this.isConnected) {
          console.warn('🔄 Switching to mock mode for development')
          this.enableMockMode()
        }
      }, 5000)
    })

    // Character response events
    this.socket.on('character_thinking', () => {
      this.emit('character_thinking', true)
    })

    this.socket.on('character_stream', (data: { text: string; isComplete: boolean }) => {
      this.emit('character_stream', data)
    })

    this.socket.on('character_response', (data: { 
      text: string; 
      emotion?: string; 
      isError?: boolean; 
      fallback?: boolean 
    }) => {
      this.emit('character_response', data)
    })

    // Character switch events
    this.socket.on('character_switched', (data: { 
      characterId: string; 
      language: string 
    }) => {
      this.emit('character_switched', data)
    })

    this.socket.on('language_switched', (data: { mode: string }) => {
      this.emit('language_switched', data)
    })

    // VRM animation events
    this.socket.on('vrm_animation', (data: { 
      emotion: string; 
      animation: string; 
      duration?: number 
    }) => {
      this.emit('vrm_animation', data)
    })

    // Voice synthesis events
    this.socket.on('voice_audio', (data: { 
      audioUrl: string; 
      text: string; 
      emotion: string 
    }) => {
      this.emit('voice_audio', data)
    })

    // Gemini real-time audio streaming
    this.socket.on('audio_chunk', (data: {
      characterId: string;
      chunk: {
        audio: string;
        timestamp: number;
        duration: number;
        isComplete: boolean;
      };
      chunkIndex: number;
      totalChunks: number;
      isMock?: boolean;
    }) => {
      this.emit('audio_chunk', data)
    })

    // Performance monitoring
    this.socket.on('performance_metrics', (data: PerformanceMetrics) => {
      this.emit('performance_metrics', data)
    })

    this.socket.on('stream_warning', (data: StreamWarning) => {
      this.emit('stream_warning', data)
    })

    // Error handling
    this.socket.on('error', (data: { message: string; type?: string }) => {
      this.emit('error', data)
    })

    // Health check
    this.socket.on('ping', () => {
      this.socket?.emit('pong')
    })
  }

  // Send user message to character
  sendMessage(text: string): void {
    console.log('📤 Sending message via WebSocket:', text)
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ Not connected, cannot send message')
      this.emit('error', { message: 'Not connected to server' })
      return
    }

    this.socket.emit('user_message', { text })
    console.log('✅ Message sent via WebSocket')
  }

  // Switch character
  switchCharacter(characterId: 'maria' | 'akira'): void {
    console.log('🔄 Switching to character:', characterId)
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ Not connected, cannot switch character')
      this.emit('error', { message: 'Not connected to server' })
      return
    }

    this.socket.emit('switch_character', { characterId })
    console.log('✅ Character switch request sent')
  }

  // Set language preference
  setLanguage(language: string): void {
    console.log('🌐 Setting language to:', language)
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ Not connected, cannot set language')
      this.emit('error', { message: 'Not connected to server' })
      return
    }

    this.socket.emit('switch_language', { language })
    console.log('✅ Language switch request sent')
  }

  // Request voice synthesis
  requestVoice(text: string, emotion: string = 'neutral'): void {
    if (!this.isConnected || !this.socket) {
      this.emit('error', { message: 'Not connected to server' })
      return
    }

    this.socket.emit('synthesize_voice', { text, emotion })
  }

  // Get conversation history
  getConversationHistory(): void {
    if (!this.isConnected || !this.socket) {
      this.emit('error', { message: 'Not connected to server' })
      return
    }

    this.socket.emit('get_conversation_history')
  }

  // Clear conversation
  clearConversation(): void {
    if (!this.isConnected || !this.socket) {
      this.emit('error', { message: 'Not connected to server' })
      return
    }

    this.socket.emit('clear_conversation')
  }

  // Event listener management
  on(event: string, callback: Function): void {
    if (!this.callbacks[event]) {
      this.callbacks[event] = []
    }
    this.callbacks[event].push(callback)
  }

  off(event: string, callback: Function): void {
    if (!this.callbacks[event]) return
    
    this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback)
  }

  private emit(event: string, data?: any): void {
    if (!this.callbacks[event]) return

    this.callbacks[event].forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in callback for event ${event}:`, error)
      }
    })
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected
  }

  // Enable mock mode for development when backend is not available
  private enableMockMode(): void {
    console.log('🎭 Enabling mock mode for character interactions')
    this.isConnected = true
    this.emit('connection_status', { connected: true })
    
    // Override sendMessage for mock responses
    const originalSendMessage = this.sendMessage
    this.sendMessage = (text: string) => {
      console.log('📤 Mock sending:', text)
      
      // Simulate thinking
      this.emit('character_thinking', true)
      
      // Simulate response after delay
      setTimeout(() => {
        const mockResponses = [
          "This is a mock response since the backend is not available.",
          "I'm running in demo mode. Please start the backend server for full functionality.",
          "Mock mode is active. Your message was: " + text
        ]
        
        const response = mockResponses[Math.floor(Math.random() * mockResponses.length)]
        
        this.emit('character_response', {
          text: response,
          emotion: 'neutral',
          isError: false,
          fallback: true
        })
        
        this.emit('character_thinking', false)
      }, 1000 + Math.random() * 2000)
    }
  }

  // Disconnect
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  // Reconnect
  reconnect(): void {
    this.disconnect()
    this.connect()
  }
}

// Export singleton instance
export const characterSocketService = new CharacterSocketService()
export default characterSocketService