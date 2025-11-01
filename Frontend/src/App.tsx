import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Lessons from "./pages/Lessons";
import LessonView from "./pages/LessonView";
import Articles from "./pages/Articles";
import Notes from "./pages/Notes";
import Character from "./pages/Character";
import CharacterChat from "./pages/CharacterChat";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/signin" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        
        {/* Protected Routes with Layout */}
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lessons" element={<Lessons />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/character" element={<Character />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        
        {/* Lesson View - Full Screen Route (no layout) */}
        <Route path="/lesson/:id" element={
          <ProtectedRoute>
            <LessonView />
          </ProtectedRoute>
        } />
        
        {/* Character Chat - Full Screen Route (no layout) */}
        <Route path="/character/:characterId" element={
          <ProtectedRoute>
            <CharacterChat />
          </ProtectedRoute>
        } />
        
        {/* Catch-all Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
