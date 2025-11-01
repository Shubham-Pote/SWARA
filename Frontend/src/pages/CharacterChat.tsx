import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AIInput } from '@/components/ui/ai-input';
import { ToastContainer } from '@/components/ui/toast-notification';
import VRMViewer from '../components/VRMViewer';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { characterSocketService } from '@/services/characterSocket.service';
import type { Character, Message } from '@/types/character';

interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export default function CharacterChat() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastCharacterReply, setLastCharacterReply] = useState<string>('');
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Toast function
  const toast = ({ title, description, variant = 'default' }: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, description, variant }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Character data
  const characterData = {
    maria: {
      _id: 'maria',
      name: 'María González',
      age: 28,
      language: 'spanish' as const,
      occupation: 'Spanish Teacher',
      location: 'Mexico City, Mexico',
      nationality: 'Mexican',
      personality: ['warm', 'enthusiastic', 'cultural'],
      conversationStyle: 'friendly' as const,
      backstory: '¡Hola! I\'m María González, your Spanish teacher from Mexico City!',
      interests: ['culture', 'food', 'music'],
      specialties: ['mexican-spanish', 'slang', 'culture'],
      difficultyLevel: 'beginner' as const,
      teachingStyle: 'Interactive and cultural immersion',
      vocabularyFocus: ['daily-life', 'culture', 'expressions'],
      avatar: '/images/Maria.png',
      modelPath: '/models/maria/maria.vrm',
      voiceSettings: {
        openaiVoice: 'nova' as const,
        defaultSpeed: 1.0,
        emotionMapping: { happy: 1.2, sad: 0.8, excited: 1.4, neutral: 1.0 }
      },
      isLocked: false,
      unlockRequirement: { type: 'level' as const, value: 0 },
      isActive: true,
      flag: '🇪🇸'
    },
    akira: {
      _id: 'akira',
      name: 'Akira Tanaka',
      age: 32,
      language: 'japanese' as const,
      occupation: 'Japanese Teacher',
      location: 'Tokyo, Japan',
      nationality: 'Japanese',
      personality: ['patient', 'respectful', 'formal'],
      conversationStyle: 'formal' as const,
      backstory: 'Konnichiwa! I\'m Akira Tanaka, your Japanese tutor from Tokyo.',
      interests: ['literature', 'history', 'language'],
      specialties: ['formal-japanese', 'keigo', 'culture'],
      difficultyLevel: 'intermediate' as const,
      teachingStyle: 'Structured and respectful approach',
      vocabularyFocus: ['formal-language', 'business', 'culture'],
      avatar: '/images/Akira.png',
      modelPath: '/models/akira/akira.vrm',
      voiceSettings: {
        openaiVoice: 'echo' as const,
        defaultSpeed: 0.9,
        emotionMapping: { happy: 1.1, sad: 0.9, excited: 1.2, neutral: 1.0 }
      },
      isLocked: false,
      unlockRequirement: { type: 'level' as const, value: 5 },
      isActive: true,
      flag: '🇯🇵'
    }
  };

  // Initialize character
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      navigate('/auth/signin');
      return;
    }

    if (characterId && characterData[characterId as keyof typeof characterData]) {
      const selectedCharacter = characterData[characterId as keyof typeof characterData];
      setCharacter(selectedCharacter);
      
      console.log('🎭 Initializing character:', characterId);
      
      // Add welcome message
      setTimeout(() => {
        const welcomeMessage: Message = {
          _id: 'welcome-' + Date.now(),
          conversationId: 'temp-session',
          sender: 'character',
          content: selectedCharacter.backstory,
          createdAt: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
      }, 1000);
      
      // Initialize WebSocket connection
      try {
        characterSocketService.switchCharacter(characterId as 'maria' | 'akira');
        const language = characterId === 'akira' ? 'ja' : 'es';
        characterSocketService.setLanguage(language);
        console.log('✅ Character and language set successfully');
      } catch (error) {
        console.error('❌ Error initializing character socket:', error);
        // Don't prevent UI from loading, socket service will handle fallback
      }
    } else {
      console.error('❌ Invalid character ID:', characterId);
      navigate('/character');
    }
  }, [characterId, user, navigate]);

  // WebSocket event handlers
  useEffect(() => {
    const handleConnectionStatus = () => {
      // Connection status handled internally by socket service
    };

    const handleCharacterThinking = (thinking: boolean) => {
      setIsThinking(thinking);
      if (thinking) {
        // When starting to think, clear streaming but keep last reply visible
        setStreamingText('');
        setIsStreaming(false);
      }
    };

    const handleCharacterStream = (data: { text: string; isComplete: boolean }) => {
      console.log('📝 Character streaming:', data);
      
      if (!data.isComplete) {
        setIsStreaming(true);
        setIsThinking(false);
        // Add streaming text immediately for better UX
        setStreamingText(prev => prev + data.text);
      } else {
        // Streaming complete, but keep the text visible
        setIsStreaming(false);
        setLastCharacterReply(streamingText + data.text);
        console.log('✅ Streaming completed');
      }
    };

    const handleCharacterResponse = (data: { 
      text: string; 
      emotion?: string; 
      isError?: boolean; 
      fallback?: boolean 
    }) => {
      console.log('📨 Received character response:', data);
      console.log('📊 Current state before update:', { 
        isThinking, 
        isStreaming, 
        streamingText, 
        lastCharacterReply 
      });
      
      setIsThinking(false);
      setIsStreaming(false);
      
      // Set the last reply to show in overlay
      setLastCharacterReply(data.text);
      console.log('💾 Setting lastCharacterReply to:', data.text);
      
      // Save the final response message
      const characterMessage: Message = {
        _id: 'char-' + Date.now(),
        conversationId: 'temp-session',
        sender: 'character',
        content: data.text,
        createdAt: new Date().toISOString(),
        characterEmotion: data.emotion
      };

      setMessages(prev => [...prev, characterMessage]);
      
      // Clear streaming text after saving message
      setStreamingText('');
      setCurrentEmotion(data.emotion || 'neutral');

      if (data.fallback) {
        setIsDemoMode(true);
        toast({
          title: 'Demo Mode Active',
          description: 'Using mock responses. Start backend server for full AI features.',
        });
      } else {
        setIsDemoMode(false);
      }
    };

    const handleVoiceAudio = (data: { audioUrl: string; text: string; emotion: string }) => {
      if (audioRef.current && data.audioUrl) {
        const fullUrl = data.audioUrl.startsWith('http') ? data.audioUrl : `http://localhost:5000${data.audioUrl}`;
        audioRef.current.src = fullUrl;
        audioRef.current.volume = 0.8;
        audioRef.current.play().catch(error => console.error('Audio playback error:', error));
      }
    };

    const handleError = (data: { message: string }) => {
      toast({
        title: 'Error',
        description: data.message,
        variant: 'destructive',
      });
    };

    // Subscribe to events
    characterSocketService.on('connection_status', handleConnectionStatus);
    characterSocketService.on('character_thinking', handleCharacterThinking);
    characterSocketService.on('character_stream', handleCharacterStream);
    characterSocketService.on('character_response', handleCharacterResponse);
    characterSocketService.on('voice_audio', handleVoiceAudio);
    characterSocketService.on('error', handleError);

    return () => {
      characterSocketService.off('connection_status', handleConnectionStatus);
      characterSocketService.off('character_thinking', handleCharacterThinking);
      characterSocketService.off('character_stream', handleCharacterStream);
      characterSocketService.off('character_response', handleCharacterResponse);
      characterSocketService.off('voice_audio', handleVoiceAudio);
      characterSocketService.off('error', handleError);
    };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleMicClick = () => {
    toast({
      title: 'Voice Input',
      description: 'Voice input feature coming soon!',
    });
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    console.log('💬 User sending message:', text);
    console.log('🔄 Clearing lastCharacterReply (was:', lastCharacterReply, ')');

    // Clear the last character reply when user sends a new message
    setLastCharacterReply('');

    const userMessage: Message = {
      _id: 'user-' + Date.now(),
      conversationId: 'temp-session',
      sender: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Always try to send message - socket service handles connection status and fallback to mock mode
    try {
      characterSocketService.sendMessage(text);
      console.log('✅ Message sent to character socket service');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast({
        title: 'Message Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleBackToCharacters = () => {
    navigate('/character');
  };

  if (!character) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Top Bar - Conversation Log */}
      <div className="absolute top-0 left-0 z-20 p-4 flex items-center gap-4">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm font-medium">Conversation Log</span>
        </button>
        
        {/* Demo Mode Indicator */}
        {isDemoMode && (
          <div className="flex items-center gap-2 bg-yellow-600/20 border border-yellow-500/30 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-yellow-300">Demo Mode</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-screen pb-24">
        {/* Character Display */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="w-full h-full max-w-4xl mx-auto">
            <VRMViewer
              characterId={characterId as 'maria' | 'akira'}
              emotion={currentEmotion}
              isThinking={isThinking}
              className="w-full h-full"
            />
          </div>

          {/* Character Response Overlay - Always show last reply or current activity */}
          {(isStreaming || streamingText || isThinking || lastCharacterReply) && (() => {
            console.log('🎨 Rendering overlay with:', { 
              isStreaming, 
              streamingText: streamingText.slice(0, 50), 
              isThinking, 
              lastCharacterReply: lastCharacterReply.slice(0, 50) 
            });
            return (
            <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 max-w-3xl w-full mx-4 z-10">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {character?.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                      {character?.name}
                    </div>
                    <div className="text-white/90">
                      {isThinking && !streamingText && !lastCharacterReply ? (
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-white/60 text-sm">Thinking...</span>
                        </div>
                      ) : (
                        <p className="text-base leading-relaxed">
                          {streamingText || lastCharacterReply}
                          {isStreaming && <span className="animate-pulse text-purple-300">|</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}
        </div>

        {/* Input Section - Fixed positioning */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent backdrop-blur-sm z-20">
          <div className="max-w-4xl mx-auto">
            <AIInput
              placeholder={`Message ${character?.name}...`}
              onSubmit={handleSendMessage}
              onMicClick={handleMicClick}
              disabled={isThinking}
            />
          </div>
        </div>
      </div>

      {/* Sidebar Overlay with smooth animations */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop with fade animation */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-out"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* Sidebar with slide animation */}
          <div className="relative w-80 bg-gray-900/95 backdrop-blur-xl h-full overflow-hidden flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-left border-r border-gray-700/50">
            {/* Sidebar Header with Back Button */}
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between bg-gradient-to-r from-purple-600/10 to-blue-600/10">
              <button
                onClick={handleBackToCharacters}
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors duration-200 group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <span className="font-medium">Back to Characters</span>
              </button>
            </div>

            {/* Character Info Section */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {character?.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{character?.name}</h3>
                  <p className="text-sm text-gray-400">{character?.specialties.join(', ') || 'Language Tutor'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                      {character?.language === 'spanish' ? '🇪🇸 Spanish' : '🇯🇵 Japanese'}
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                      {character?.difficultyLevel || 'Intermediate'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Conversation Stats */}
              <div className="mt-4 p-3 bg-gray-800/30 rounded-xl">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">{messages.filter(m => m.sender === 'user').length}</div>
                    <div className="text-xs text-gray-400">Messages</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-300">{messages.filter(m => m.sender === 'character').length}</div>
                    <div className="text-xs text-gray-400">Replies</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-300">{Math.round(messages.length / 2)}</div>
                    <div className="text-xs text-gray-400">Exchanges</div>
                  </div>
                </div>
              </div>
              
              {/* Character Actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    setMessages([]);
                    setLastCharacterReply('');
                    toast({ title: 'Conversation Cleared', description: 'Started fresh conversation!' });
                  }}
                  className="px-3 py-2 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  Clear Chat
                </button>
                <button 
                  onClick={() => toast({ title: 'Voice Feature', description: 'Voice synthesis coming soon!' })}
                  className="px-3 py-2 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  Voice Mode
                </button>
              </div>
            </div>

            {/* Messages List with Enhanced Styling */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                Conversation History
              </h3>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-sm">Start a conversation with {character?.name}!</div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message._id}
                      className={`p-4 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 ml-6 text-white'
                          : 'bg-gradient-to-r from-gray-700 to-gray-800 mr-6 text-white border border-gray-600/50'
                      }`}
                    >
                      <div className="text-xs text-white/70 mb-2 font-medium">
                        {message.sender === 'user' ? 'You' : character?.name}
                      </div>
                      <div className="text-sm leading-relaxed">
                        {message.content}
                      </div>
                      <div className="text-xs text-white/50 mt-2">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
                
                {/* Streaming message with enhanced styling */}
                {streamingText && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-700 to-gray-800 mr-6 text-white border border-gray-600/50 shadow-md">
                    <div className="text-xs text-white/70 mb-2 font-medium flex items-center gap-2">
                      {character?.name}
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                    <div className="text-sm leading-relaxed">
                      {streamingText}
                      <span className="animate-pulse text-purple-400">|</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Element */}
      <audio ref={audioRef} className="hidden" />
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}