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
  private pendingActions: Array<() => void> = []

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
      transports: ['polling', 'websocket'],  // Try polling first, then upgrade to websocket
      upgrade: true,
      rememberUpgrade: false,  // Don't remember upgrade to allow fallback
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,  // Increased back to 3
      reconnectionDelay: 2000,  // Start with 2 seconds
      reconnectionDelayMax: 8000,  // Max 8 seconds
      timeout: 15000,  // Increased timeout to 15 seconds
      forceNew: false,  // Allow connection reuse
      auth: {
        token: token  // Properly pass token in auth object
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
      
      // Process any pending actions
      if (this.pendingActions.length > 0) {
        console.log('🔄 Processing', this.pendingActions.length, 'pending actions')
        this.pendingActions.forEach(action => action())
        this.pendingActions = []
      }
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
      
      // Try fallback to mock mode after failed attempts
      setTimeout(() => {
        if (!this.isConnected) {
          console.warn('🔄 Switching to mock mode for development')
          this.enableMockMode()
        }
      }, 10000)  // Increased from 2000ms to 10000ms to allow proper connection attempts
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
      console.log('⏳ Not connected yet, queuing character switch for when connected')
      this.pendingActions.push(() => this.switchCharacter(characterId))
      return
    }

    this.socket.emit('switch_character', { characterId })
    console.log('✅ Character switch request sent')
  }

  // Set language preference
  setLanguage(language: string): void {
    console.log('🌐 Setting language to:', language)
    if (!this.isConnected || !this.socket) {
      console.log('⏳ Not connected yet, queuing language setting for when connected')
      this.pendingActions.push(() => this.setLanguage(language))
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
    
    // Process any pending actions in mock mode
    if (this.pendingActions.length > 0) {
      console.log('🔄 Processing', this.pendingActions.length, 'pending actions in mock mode')
      this.pendingActions.forEach(action => {
        try {
          action()
        } catch (error) {
          console.log('Mock action executed (no actual WebSocket):', error)
        }
      })
      this.pendingActions = []
    }
    
    // Override sendMessage for mock responses
    const originalSendMessage = this.sendMessage
    this.sendMessage = (text: string) => {
      console.log('📤 Mock sending:', text)
      
      // Simulate thinking
      this.emit('character_thinking', true)
      
      // Simulate response after delay
      setTimeout(() => {
        const mockResponses = [
          "¡Hola! I'm María, your Spanish teacher. I'm running in demo mode right now.",
          "Hello! This is Akira. The backend server needs to be connected for full functionality.",
          "Great question! In demo mode, I can still show animations but not real AI responses.",
          `You said: "${text}". I'd love to give you a proper response when connected!`
        ]
        
        const response = mockResponses[Math.floor(Math.random() * mockResponses.length)]
        const emotions = ['happy', 'thoughtful', 'encouraging', 'neutral']
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)]
        
        // Emit VRM animation for the response
        this.emit('vrm_animation', {
          emotion: randomEmotion,
          animation: 'talking',
          duration: 3000
        })
        
        this.emit('character_response', {
          text: response,
          emotion: randomEmotion,
          isError: false,
          fallback: true
        })
        
        this.emit('character_thinking', false)
        
        // Add a small delay then reset to neutral emotion
        setTimeout(() => {
          this.emit('vrm_animation', {
            emotion: 'neutral',
            animation: 'idle',
            duration: 1000
          })
        }, 4000)
        
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