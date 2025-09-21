import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Lessons from "./pages/Lessons";
import LessonView from "./pages/LessonView";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import Quiz from "./pages/Quiz";
import SpeechRecognition from "./pages/SpeechRecognition";
import AIChat from "./pages/AIChat";
import Reading from "./pages/Reading";
import Notes from "./pages/Notes";
import WordOfDay from "./pages/WordOfDay";
import Goals from "./pages/Goals";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import StudyHub from './pages/StudyHub';
import CharacterSelection from './pages/CharacterSelection';
import CharacterChat from './pages/CharacterChat';


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            
            {/* Protected Routes */}
            <Route
              element={<Layout />}
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/lessons" element={<Lessons />} />
              <Route path="/lesson/:id" element={<LessonView />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/speech" element={<SpeechRecognition />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/reading" element={<Reading />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/word-of-day" element={<WordOfDay />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/study-hub" element={<StudyHub />} />
              <Route path="/characters" element={<CharacterSelection />} />
              <Route path="/character-chat/:characterId" element={<CharacterChat />} />
            </Route>
            
            {/* Catch-all Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;