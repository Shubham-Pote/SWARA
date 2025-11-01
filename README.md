# SWARA - AI Language Learning Platform

<div align="center">

![SWARA Logo](https://img.shields.io/badge/SWARA-Language%20Learning-blue?style=for-the-badge)

**Learn Spanish and Japanese through AI-powered 3D character conversations**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

[Live Demo](https://swara-lemon.vercel.app) · [Report Bug](https://github.com/Shubham-Pote/SWARA/issues) · [Request Feature](https://github.com/Shubham-Pote/SWARA/issues)

</div>

---

## 🌟 What is SWARA?

SWARA is an immersive AI-powered language learning platform that combines conversational AI with 3D animated characters to create an engaging, interactive experience for learning Spanish and Japanese. Chat with María González from Mexico City or Akira Tanaka from Tokyo, each with their own personality, teaching style, and realistic VRM-based 3D avatars.

### ✨ Key Features

- **🎭 AI-Powered 3D Characters**
  - María González - Warm Spanish teacher with Mexican cultural insights
  - Akira Tanaka - Respectful Japanese instructor with business language expertise
  - Realistic facial expressions and lip-sync animations using VRM models
  - Real-time emotion detection and response

- **💬 Real-Time Conversations**
  - WebSocket-based instant messaging with AI characters
  - Streaming responses for natural conversation flow
  - Multi-language support (English, Spanish, Japanese)
  - Automatic language detection and mixing

- **🎯 Structured Learning**
  - Progressive lesson system with vocabulary, grammar, and culture
  - AI-generated personalized content using Google Gemini
  - Interactive exercises and practice scenarios
  - Reading articles with comprehension tracking

- **🔊 Voice & Audio**
  - Text-to-speech using OpenAI and ElevenLabs
  - Character-specific voice profiles
  - Audio lessons and pronunciation guides
  - Lip-sync animation with phoneme mapping

- **📊 Progress Tracking**
  - XP and leveling system
  - Learning streaks and achievements
  - Session analytics and performance metrics
  - Personalized learning paths

- **🌍 Cultural Context**
  - Region-specific language variations
  - Cultural notes and explanations
  - Slang and informal expressions
  - Politeness levels and formality

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **MongoDB** database (local or MongoDB Atlas)
- **API Keys**:
  - Google Gemini API key
  - OpenAI API key
  - ElevenLabs API key (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Shubham-Pote/SWARA.git
   cd SWARA
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Configure your `.env` file:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/language-learning
   JWT_SECRET=your-secret-key
   GEMINI_API_KEY=your-gemini-api-key
   OPENAI_API_KEY=your-openai-api-key
   ELEVENLABS_API_KEY=your-elevenlabs-api-key
   CORS_ORIGIN=http://localhost:5173
   ```

3. **Frontend Setup**
   ```bash
   cd ../Frontend
   npm install
   
   # Create .env.development file
   echo "VITE_API_BASE_URL=http://localhost:5000" > .env.development
   echo "VITE_BACKEND_URL=http://localhost:5000" >> .env.development
   ```

4. **Start Development Servers**

   Terminal 1 (Backend):
   ```bash
   cd backend
   npm run dev
   ```

   Terminal 2 (Frontend):
   ```bash
   cd Frontend
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Usage Example

```typescript
// Chat with an AI character
import { characterSocketService } from '@/services/characterSocket.service';

// Connect to character
characterSocketService.startConversation('maria', userId);

// Send message
characterSocketService.sendMessage('Hola! ¿Cómo estás?');

// Listen for responses
characterSocketService.on('character_response', (data) => {
  console.log('Character says:', data.text);
  console.log('Emotion:', data.emotion);
  console.log('Animation:', data.animation);
});
```

---

## 🏗️ Project Structure

```
SWARA/
├── backend/                  # Node.js + Express backend
│   ├── api/                 # Vercel serverless functions
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   │   ├── characterAI.service.ts      # AI conversation logic
│   │   │   ├── vrmAnimation.service.ts     # 3D animation control
│   │   │   ├── gemini.service.ts           # Google Gemini integration
│   │   │   ├── emotionAnalysis.service.ts  # Emotion detection
│   │   │   └── translation.service.ts      # Multi-language support
│   │   ├── websocket/       # WebSocket handlers
│   │   └── utils/           # Helper functions
│   └── public/audio/        # Audio lesson files
│
├── Frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── VRMViewer.tsx          # 3D character renderer
│   │   │   ├── auth-fuse.tsx          # Authentication UI
│   │   │   └── ui/                    # Shadcn UI components
│   │   ├── pages/           # Page components
│   │   │   ├── CharacterChat.tsx      # AI chat interface
│   │   │   ├── Lessons.tsx            # Lesson browser
│   │   │   └── Dashboard.tsx          # User dashboard
│   │   ├── services/        # API clients
│   │   │   └── characterSocket.service.ts  # WebSocket client
│   │   ├── contexts/        # React contexts
│   │   └── lib/             # Utilities
│   └── public/models/       # VRM 3D models
│
└── README.md
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20.x with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO for WebSocket connections
- **AI/ML**:
  - Google Generative AI (Gemini 2.0)
  - Sentiment analysis for emotion detection
  - Franc for language detection
- **Authentication**: JWT with bcrypt
- **Voice**: OpenAI TTS, ElevenLabs (optional)

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **3D Graphics**: Three.js with @pixiv/three-vrm
- **UI Library**: Radix UI + Tailwind CSS
- **Animations**: Framer Motion, GSAP
- **State Management**: React Context + Tanstack Query
- **Routing**: React Router v7

### DevOps
- **Deployment**: Vercel (serverless functions)
- **Version Control**: Git + GitHub
- **Package Manager**: npm

---

## 📚 API Documentation

### REST Endpoints

#### Authentication
```typescript
POST /api/auth/register        # Create new user account
POST /api/auth/login           # User login
GET  /api/auth/profile         # Get user profile
PUT  /api/auth/profile         # Update profile
PUT  /api/auth/language        # Switch learning language
```

#### Lessons
```typescript
GET  /api/lessons/:language    # Get lessons by language
GET  /api/lessons/:id          # Get specific lesson
POST /api/lessons/:id/complete # Mark lesson complete
GET  /api/lessons/:id/progress # Get lesson progress
```

#### Notes & Reading
```typescript
GET  /api/notes                # Get user notes
POST /api/notes                # Create note
GET  /api/reading              # Get reading articles
POST /api/reading/generate     # AI-generate article
```

### WebSocket Events

#### Character Namespace (`/character`)
```typescript
// Client → Server
'start_conversation'     # Begin character session
'send_message'           # Send chat message
'end_conversation'       # End session

// Server → Client
'character_response'     # AI response text
'character_audio_chunk'  # Audio stream chunk
'vrm_animation'          # Animation commands
'typing_indicator'       # Character is typing
'connection_status'      # Connection state
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure code passes linting (`npm run lint`)

---

## 📖 Documentation

- **API Reference**: See inline code documentation
- **Character Development**: Check `backend/src/services/characterAI.service.ts`
- **VRM Integration**: See `Frontend/src/components/VRMViewer.tsx`
- **WebSocket Protocol**: Documented in `backend/src/websocket/`

---

## 🐛 Troubleshooting

### Common Issues

**WebSockets not connecting**
- Verify backend URL in frontend `.env`
- Check CORS settings in backend
- Ensure WebSocket ports are not blocked

**3D Models not loading**
- Check VRM model paths in `public/models/`
- Verify model file format (.vrm)
- Check browser console for WebGL errors

**API requests failing**
- Confirm MongoDB connection
- Verify API keys in backend `.env`
- Check network tab for error details

For more help, [open an issue](https://github.com/Shubham-Pote/SWARA/issues).

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Maintainers

- **Shubham Pote** - [@Shubham-Pote](https://github.com/Shubham-Pote)

---

## 🙏 Acknowledgments

- **Google Generative AI** for Gemini API
- **OpenAI** for GPT and TTS capabilities
- **Pixiv** for VRM SDK
- **Three.js** community
- **Shadcn UI** for component library
- All contributors and testers

---

## 📞 Support

- 📧 Email: [Create an issue](https://github.com/Shubham-Pote/SWARA/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Shubham-Pote/SWARA/discussions)
- 🐦 Twitter: Follow for updates

---

<div align="center">

**[⬆ Back to Top](#swara---ai-language-learning-platform)**

Made with ❤️ for language learners worldwide

</div>