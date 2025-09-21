import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import VRMViewer from '@/components/VRMViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { characterSocketService } from '@/services/characterSocket.service';
import type { Character, Message } from '@/types/character';
import { toast } from '@/hooks/use-toast';
import { Mic, MicOff, Settings, MessageCircle } from 'lucide-react';
import * as wanakana from 'wanakana';

export default function CharacterChat() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Set language based on character
    const language = characterId === 'akira' ? 'ja-JP' : 'es-ES';
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    return recognition;
  };

  // Debug authentication
  console.log('CharacterChat - User:', user, 'Character ID:', characterId);
  console.log('CharacterChat - Token exists:', !!localStorage.getItem('token'));
  console.log('CharacterChat - User authenticated:', !!user);

  // Redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      console.log('❌ No authentication found, redirecting to login...');
      navigate('/auth/signin');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    const initializeCharacter = () => {
      try {
        console.log('Initializing character:', characterId);
        console.log('Authentication status - User:', !!user, 'Token:', !!localStorage.getItem('token'));
        
        // Create character data locally (since we only have María and Akira)
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
            backstory: 'A warm and enthusiastic Spanish teacher who loves sharing Mexican culture and language.',
            interests: ['culture', 'food', 'music'],
            specialties: ['mexican-spanish', 'slang', 'culture'],
            difficultyLevel: 'beginner' as const,
            teachingStyle: 'Interactive and cultural immersion',
            vocabularyFocus: ['daily-life', 'culture', 'expressions'],
            avatar: '/avatars/maria.jpg',
            modelPath: '/models/maria/maria.vrm',  // ← ADD VRM MODEL PATH
            voiceSettings: {
              openaiVoice: 'nova' as const,
              defaultSpeed: 1.0,
              emotionMapping: { happy: 1.2, sad: 0.8, excited: 1.4, neutral: 1.0 }
            },
            isLocked: false,
            unlockRequirement: { type: 'level' as const, value: 0 },
            isActive: true
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
            backstory: 'A patient Japanese tutor who specializes in making complex concepts easy to understand.',
            interests: ['literature', 'history', 'language'],
            specialties: ['formal-japanese', 'keigo', 'culture'],
            difficultyLevel: 'intermediate' as const,
            teachingStyle: 'Structured and respectful approach',
            vocabularyFocus: ['formal-language', 'business', 'culture'],
            avatar: '/avatars/akira.jpg',
            modelPath: '/models/akira/akira.vrm',  // ← ADD VRM MODEL PATH
            voiceSettings: {
              openaiVoice: 'echo' as const,
              defaultSpeed: 0.9,
              emotionMapping: { happy: 1.1, sad: 0.9, excited: 1.2, neutral: 1.0 }
            },
            isLocked: false,
            unlockRequirement: { type: 'level' as const, value: 5 },
            isActive: true
          }
        };

        const selectedCharacter = characterData[characterId as 'maria' | 'akira'];
        if (selectedCharacter) {
          setCharacter(selectedCharacter);
          console.log('Character loaded:', selectedCharacter);
          
          // Initialize audio element for voice playback
          if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.crossOrigin = 'anonymous';
            audioRef.current.preload = 'metadata';
            
            // Add event listeners for audio debugging
            audioRef.current.addEventListener('loadstart', () => console.log('Audio: Load started'));
            audioRef.current.addEventListener('loadedmetadata', () => console.log('Audio: Metadata loaded'));
            audioRef.current.addEventListener('canplay', () => console.log('Audio: Can play'));
            audioRef.current.addEventListener('error', (e) => console.error('Audio error:', e));
          }
          
          // Switch character in WebSocket service
          characterSocketService.switchCharacter(characterId as 'maria' | 'akira');
          
          // Set language based on character
          const language = characterId === 'akira' ? 'ja' : 'es';
          characterSocketService.setLanguage(language);
          
          // Update connection status based on WebSocket
          setConnectionStatus(characterSocketService.getConnectionStatus() ? 'connected' : 'connecting');
        } else {
          throw new Error('Character not found');
        }
        
      } catch (error) {
        console.error('Failed to initialize character:', error);
        setConnectionStatus('disconnected');
        toast({
          title: 'Error',
          description: 'Failed to load character details',
          variant: 'destructive',
        });
      }
    };

    if (characterId) {
      initializeCharacter();
    }
  }, [characterId]);

  // WebSocket event listeners
  useEffect(() => {
    const handleConnectionStatus = (data: { connected: boolean }) => {
      setConnectionStatus(data.connected ? 'connected' : 'disconnected');
    };

    const handleConnectionError = (error: any) => {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('disconnected');
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to character service',
        variant: 'destructive',
      });
    };

    const handleCharacterThinking = (thinking: boolean) => {
      setIsThinking(thinking);
      if (thinking) {
        setStreamingText('');
        setIsStreaming(false);
      }
    };

    const handleCharacterStream = (data: { text: string; isComplete: boolean }) => {
      if (!data.isComplete) {
        setIsStreaming(true);
        setStreamingText(prev => prev + data.text);
      } else {
        setIsStreaming(false);
      }
    };

    const handleCharacterResponse = (data: { 
      text: string; 
      emotion?: string; 
      isError?: boolean; 
      fallback?: boolean 
    }) => {
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingText('');

      if (data.emotion) {
        setCurrentEmotion(data.emotion);
      }

      // Add character message to chat
      const characterMessage: Message = {
        _id: 'char-' + Date.now(),
        conversationId: sessionId || 'temp-session',
        sender: 'character',
        content: data.text,
        createdAt: new Date().toISOString(),
        characterEmotion: data.emotion
      };

      setMessages(prev => [...prev, characterMessage]);

      if (data.isError) {
        toast({
          title: 'Character Error',
          description: data.text,
          variant: 'destructive',
        });
      }

      if (data.fallback) {
        toast({
          title: 'Mock Mode',
          description: 'Running in demo mode. Start backend for full features.',
        });
      }
    };

    const handleVrmAnimation = (data: { 
      emotion: string; 
      animation: string; 
      duration?: number 
    }) => {
      setCurrentEmotion(data.emotion);
    };

    const handleVoiceAudio = async (data: { 
      audioUrl: string; 
      text: string; 
      emotion: string 
    }) => {
      try {
        console.log('Received voice audio data:', data);
        
        // Validate audio URL
        if (!data.audioUrl) {
          console.warn('No audio URL provided');
          return;
        }

        // Create audio element if it doesn't exist
        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.crossOrigin = 'anonymous';
          audioRef.current.preload = 'metadata';
        }

        // Test if audio URL is accessible
        try {
          const response = await fetch(data.audioUrl, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`Audio URL not accessible: ${response.status}`);
          }
          
          console.log('Audio URL is accessible:', data.audioUrl);
          console.log('Content-Type:', response.headers.get('content-type'));
        } catch (fetchError) {
          console.error('Audio URL fetch failed:', fetchError);
          return;
        }

        // Set audio source and play
        audioRef.current.src = data.audioUrl;
        audioRef.current.currentTime = 0;
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('Audio playing successfully');
        }
      } catch (error) {
        console.error('Error playing voice audio:', error);
        console.error('Audio URL:', data.audioUrl);
        console.error('Audio element state:', {
          src: audioRef.current?.src,
          readyState: audioRef.current?.readyState,
          networkState: audioRef.current?.networkState,
          error: audioRef.current?.error
        });
      }
    };

    const handleError = (data: { message: string; type?: string }) => {
      toast({
        title: 'Character Service Error',
        description: data.message,
        variant: 'destructive',
      });
    };

    // Subscribe to WebSocket events
    characterSocketService.on('connection_status', handleConnectionStatus);
    characterSocketService.on('connection_error', handleConnectionError);
    characterSocketService.on('character_thinking', handleCharacterThinking);
    characterSocketService.on('character_stream', handleCharacterStream);
    characterSocketService.on('character_response', handleCharacterResponse);
    characterSocketService.on('vrm_animation', handleVrmAnimation);
    characterSocketService.on('voice_audio', handleVoiceAudio);
    characterSocketService.on('error', handleError);

    return () => {
      // Cleanup event listeners
      characterSocketService.off('connection_status', handleConnectionStatus);
      characterSocketService.off('connection_error', handleConnectionError);
      characterSocketService.off('character_thinking', handleCharacterThinking);
      characterSocketService.off('character_stream', handleCharacterStream);
      characterSocketService.off('character_response', handleCharacterResponse);
      characterSocketService.off('vrm_animation', handleVrmAnimation);
      characterSocketService.off('voice_audio', handleVoiceAudio);
      characterSocketService.off('error', handleError);
    };
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted, connectionStatus:', connectionStatus, 'input:', input.trim());
    
    if (!input.trim()) {
      console.log('Validation failed - no input text');
      return;
    }

    if (!characterSocketService.getConnectionStatus()) {
      toast({
        title: 'Connection Error',
        description: 'Not connected to character service',
        variant: 'destructive',
      });
      return;
    }

    const userMessage = input.trim();
    setInput('');

    // Add user message immediately to UI
    const tempUserMessage: Message = {
      _id: 'temp-user-' + Date.now(),
      conversationId: sessionId || 'temp-session',
      sender: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      console.log('Sending message via WebSocket:', userMessage);
      // Send message through WebSocket for real-time streaming response
      characterSocketService.sendMessage(userMessage);
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m._id !== tempUserMessage._id));
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const startRecording = async () => {
    try {
      // Initialize speech recognition
      const recognition = initializeSpeechRecognition();
      if (!recognition) {
        toast({
          title: 'Not Supported',
          description: 'Speech recognition not available in this browser',
          variant: 'destructive',
        });
        return;
      }

      speechRecognitionRef.current = recognition;
      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update input with interim results for visual feedback
        if (interimTranscript) {
          let displayText = finalTranscript + interimTranscript;
          
          // For Japanese interim results, convert to romaji for better UX
          if (characterId === 'akira' && interimTranscript) {
            if (wanakana.isJapanese(interimTranscript)) {
              const romajiText = wanakana.toRomaji(interimTranscript);
              displayText = finalTranscript + romajiText;
            }
          }
          
          setInput(displayText);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        
        if (finalTranscript.trim()) {
          let displayText = finalTranscript.trim();
          
          // Convert Japanese text to romaji for language learning
          if (characterId === 'akira' && wanakana.isJapanese(finalTranscript.trim())) {
            displayText = wanakana.toRomaji(finalTranscript.trim());
            console.log('Converted Japanese to romaji:', {
              original: finalTranscript.trim(),
              romaji: displayText
            });
          }
          
          // Send the transcribed message (using converted romaji for Japanese)
          const userMessage: Message = {
            _id: 'voice-user-' + Date.now(),
            conversationId: 'temp-session',
            sender: 'user',
            content: displayText,
            createdAt: new Date().toISOString()
          };
          setMessages(prev => [...prev, userMessage]);
          characterSocketService.sendMessage(displayText);
          setInput('');
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast({
          title: 'Recognition Error',
          description: `Speech recognition failed: ${event.error}`,
          variant: 'destructive',
        });
      };

      recognition.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to start voice recording',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current && isRecording) {
      speechRecognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  if (!character) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
              <div className="w-px h-6 bg-gray-300" />
              <Button variant="ghost" size="icon">
                <MessageCircle className="h-5 w-5" />
              </Button>
              <span className="text-sm text-gray-500">Conversation Log</span>
            </div>
            <Button variant="outline" className="bg-black text-white">
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Left Side - Chat Messages */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-lg h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-purple-600">
                      {character?.language === 'spanish' ? '🇪🇸' : character?.language === 'japanese' ? '🇯🇵' : '👤'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {character?.name || 'Loading...'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {isThinking ? 'Thinking...' : connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-sm">
                    <p className="text-sm text-gray-900">what is neural network</p>
                  </div>
                </div>

                {/* Character Response */}
                <div className="flex justify-start">
                  <div className="bg-black text-white rounded-2xl px-4 py-3 max-w-lg">
                    <h4 className="font-medium text-white mb-2">CHARACTER</h4>
                    <p className="text-sm leading-relaxed">
                      A neural network is a type of machine learning model that's inspired by the way our brains work, 
                      it's basically a computer program that can learn and improve at recognizing patterns in data, 
                      like images or speech!
                    </p>
                  </div>
                </div>

                {/* Dynamic Messages */}
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-lg ${
                        message.sender === 'user'
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-black text-white'
                      }`}
                    >
                      {message.sender === 'character' && (
                        <h4 className="font-medium text-white mb-2">CHARACTER</h4>
                      )}
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {/* Audio playback */}
                      {(message.audioUrl || message.characterAudioUrl || message.userAudioUrl) && (
                        <audio controls className="mt-2 w-full">
                          <source src={message.audioUrl || message.characterAudioUrl || message.userAudioUrl} type="audio/mpeg" />
                        </audio>
                      )}
                      
                      {/* Grammar corrections */}
                      {message.sender === 'character' && message.grammarCorrections && message.grammarCorrections.length > 0 && (
                        <div className="mt-2 p-2 bg-yellow-500/20 rounded text-xs">
                          <strong>Grammar tip:</strong> {message.grammarCorrections[0].explanation}
                        </div>
                      )}
                      
                      {/* Vocabulary highlights */}
                      {message.sender === 'character' && message.vocabularyHighlights && message.vocabularyHighlights.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-500/20 rounded text-xs">
                          <strong>Vocabulary:</strong> {message.vocabularyHighlights[0].word} - {message.vocabularyHighlights[0].definition}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Streaming response display */}
                {isStreaming && streamingText && (
                  <div className="flex justify-start">
                    <div className="bg-black text-white rounded-2xl px-4 py-3 max-w-lg">
                      <h4 className="font-medium text-white mb-2">CHARACTER</h4>
                      <p className="text-sm leading-relaxed">
                        {streamingText}
                        <span className="animate-pulse">|</span>
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Thinking indicator */}
                {isThinking && !isStreaming && (
                  <div className="flex justify-start">
                    <div className="bg-black text-white rounded-2xl px-4 py-3 max-w-lg">
                      <h4 className="font-medium text-white mb-2">CHARACTER</h4>
                      <p className="text-sm leading-relaxed">
                        <span className="animate-pulse">Thinking...</span>
                      </p>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Hidden audio element for voice playback */}
              <audio ref={audioRef} className="hidden" />

              {/* Input Area */}
              <div className="px-6 py-4 border-t">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`shrink-0 ${isRecording ? 'text-red-500' : 'text-purple-600'}`}
                  >
                    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message"
                    className="flex-1 border-0 bg-gray-50 rounded-full px-4"
                    disabled={isThinking}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="bg-purple-600 hover:bg-purple-700 rounded-full shrink-0"
                    disabled={isThinking || (!input.trim() && !isRecording)}
                  >
                    <span className="text-white">→</span>
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Side - Character Model */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative">
              {character && (
                <VRMViewer
                  characterId={characterId as 'maria' | 'akira'}
                  emotion={isThinking ? 'thoughtful' : currentEmotion}
                  isThinking={isThinking}
                  className="w-full h-[600px]"
                />
              )}
              
              {/* Character Info Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-4">
                <h2 className="font-bold text-lg text-gray-900 mb-1">
                  {character?.name || 'Loading...'}
                </h2>
                <p className="text-sm text-gray-600 mb-2">
                  {character?.occupation} • {character?.location}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {character?.backstory}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Attribution */}
      <div className="text-center py-4 text-xs text-gray-500">
        powered by <span className="font-medium">OpenRouter</span>, <span className="font-medium">ElevenLabs</span>, <span className="font-medium">VRoid</span>
      </div>
    </div>
  );
}