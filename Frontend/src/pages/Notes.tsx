import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { notesAPI, lessonsAPI } from "@/lib/api";
import { 
  StickyNote, 
  Plus, 
  Search, 
  Brain,
  Tag,
  Trash2,
  Star,
  StarOff,
  Loader2,
  X,
  RefreshCw,
  Sparkles,
  Clock,
  Hash,
  FileText,
  Copy,
  Check
} from "lucide-react";

interface Note {
  _id: string;
  title: string;
  content: string;
  topic: string;
  tags: string[];
  aiGenerated?: boolean;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  language?: string;
}

interface Lesson {
  _id: string;
  id?: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  description?: string;
  hasNotes?: boolean;
}

const Notes = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State management
  const [notes, setNotes] = useState<Note[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [showLessons, setShowLessons] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [copied, setCopied] = useState(false);

  const currentLanguage = user?.currentLanguage || "spanish";

  // Form state
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    language: currentLanguage,
    topic: "",
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState("");

  const topics = ["Grammar", "Vocabulary", "Culture", "Pronunciation", "Beginner", "Intermediate", "Advanced"];
  const sections = [
    { value: "all", label: "All Notes" },
    { value: "my-notes", label: "My Notes" },
    { value: "ai-generated", label: "AI Generated" },
    { value: "starred", label: "Starred" }
  ];

  const commonTags = [
    "vocabulary", "grammar", "phrases", "pronunciation", "culture",
    "beginner", "intermediate", "advanced", "important", "review",
    "practice", "conversation", "writing", "reading", "listening"
  ];

  // API functions
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const params: any = { language: currentLanguage };
      if (searchTerm) params.search = searchTerm;
      if (selectedTopic !== "all") params.topic = selectedTopic;

      const data = await notesAPI.getNotes(params);
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      const data = await lessonsAPI.getLessonsByLanguage(currentLanguage);
      setLessons(data.lessons || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load lessons",
        variant: "destructive",
      });
    }
  };

  const createNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const noteData = {
        ...newNote,
        language: currentLanguage,
      };

      const response = await notesAPI.createNote(noteData);
      
      if (response && (response.note || response.data || response._id)) {
        const createdNote = response.note || response.data || response;
        
        setNotes(prev => [createdNote, ...prev]);
        setSelectedNote(createdNote);
        setIsCreatingNote(false);
        
        toast({
          title: "Success",
          description: "Note created successfully!",
        });
        
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create note:', error);
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    }
  };

  const generateNotes = async (lessonId: string) => {
    setGeneratingId(lessonId);
    try {
      const data = await notesAPI.generateNotes({
        lessonId,
        language: currentLanguage
      });

      if (data.alreadyExists) {
        toast({
          title: "Info",
          description: "Notes already exist for this lesson",
        });
      } else {
        toast({
          title: "Success",
          description: "AI study notes generated successfully!",
        });
      }
      
      fetchNotes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate notes",
        variant: "destructive",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const toggleStar = async (noteId: string) => {
    try {
      await notesAPI.toggleStar(noteId);
      
      setNotes(prev => prev.map(note => 
        note._id === noteId ? { ...note, starred: !note.starred } : note
      ));
      
      if (selectedNote?._id === noteId) {
        setSelectedNote(prev => prev ? { ...prev, starred: !prev.starred } : null);
      }
      
      const note = notes.find(n => n._id === noteId);
      toast({
        title: "Success",
        description: note?.starred ? "Note unstarred" : "Note starred",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await notesAPI.deleteNote(noteId);
      setNotes(prev => prev.filter(note => note._id !== noteId));
      if (selectedNote?._id === noteId) {
        setSelectedNote(null);
      }
      
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Note content copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !newNote.tags.includes(tag.trim()) && newNote.tags.length < 10) {
      setNewNote({
        ...newNote,
        tags: [...newNote.tags, tag.trim()]
      });
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setNewNote({
      ...newNote,
      tags: newNote.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const resetForm = () => {
    setNewNote({
      title: "",
      content: "",
      language: currentLanguage,
      topic: "",
      tags: []
    });
    setTagInput("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Filter and search logic
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchTerm || 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTopic = selectedTopic === "all" || 
      (selectedTopic === "starred" && note.starred) ||
      (selectedTopic === "ai-generated" && note.aiGenerated) ||
      (selectedTopic === "my-notes" && !note.aiGenerated) ||
      note.topic === selectedTopic;
    
    return matchesSearch && matchesTopic;
  });

  useEffect(() => {
    if (user?.currentLanguage) {
      setNewNote(prev => ({
        ...prev,
        language: user.currentLanguage
      }));
    }
  }, [user?.currentLanguage]);

  useEffect(() => {
    fetchNotes();
  }, [searchTerm, selectedTopic, currentLanguage]);

  useEffect(() => {
    if (showLessons) {
      fetchLessons();
    }
  }, [showLessons, currentLanguage]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-3 text-muted-foreground">Loading user data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Sidebar - Notes List */}
        <div className="w-1/3 bg-gray-900/50 backdrop-blur-sm border-r border-gray-700 flex flex-col">
          {/* Top Section - Action Buttons */}
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex gap-3 mb-4">
              <Button
                onClick={() => {
                  setIsCreatingNote(true);
                  setSelectedNote(null);
                }}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Note
              </Button>
              <Button
                onClick={() => setShowLessons(!showLessons)}
                className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Notes
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {sections.map((section) => (
                <button
                  key={section.value}
                  onClick={() => setSelectedTopic(section.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTopic === section.value
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/50 hover:text-gray-300'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>

            {/* Topic Filters */}
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTopic === topic
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                      : 'bg-gray-800/30 text-gray-400 border border-gray-600/30 hover:bg-gray-700/30 hover:text-gray-300'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
            
            {/* Refresh Button */}
            <Button
              onClick={() => {
                console.log('Manual refresh triggered');
                fetchNotes();
              }}
              variant="outline"
              size="sm"
              className="w-full mt-3 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Notes
            </Button>

            {/* AI Notes Generation Section */}
            {showLessons && (
              <div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Generate AI Notes
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lessons.map((lesson) => (
                    <div key={lesson._id} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{lesson.title}</p>
                        <p className="text-xs text-gray-400">{lesson.difficulty} • {lesson.estimatedMinutes}m</p>
                      </div>
                      <Button
                        onClick={() => generateNotes(lesson._id)}
                        disabled={generatingId === lesson._id}
                        size="sm"
                        className="ml-2 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {generatingId === lesson._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                  {lessons.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">No lessons available</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-6 text-center">
                <StickyNote className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No notes found</p>
                <p className="text-gray-500 text-xs mt-1">
                  {searchTerm ? "Try adjusting your search" : "Create your first note"}
                </p>
              </div>
            ) : (
              <div className="p-4">
                {/* Today Notes */}
                {filteredNotes.filter(note => formatDate(note.updatedAt) === 'Today').length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Today</h3>
                    {filteredNotes
                      .filter(note => formatDate(note.updatedAt) === 'Today')
                      .map((note) => (
                        <div
                          key={note._id}
                          onClick={() => setSelectedNote(note)}
                          className={`mb-3 p-4 rounded-lg border border-gray-600/50 bg-gray-800/50 hover:bg-gray-700/50 cursor-pointer transition-all ${
                            selectedNote?._id === note._id ? 'ring-2 ring-purple-500/50 bg-gray-700/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-200 mb-1 truncate">{note.title}</h4>
                              <p className="text-sm text-gray-400 mb-2 line-clamp-2">{note.content}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {formatDate(note.updatedAt)}
                              </div>
                            </div>
                            {note.starred && (
                              <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            )}
                          </div>
                          {note.topic && (
                            <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                              {note.topic}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {/* Other Notes */}
                {filteredNotes.filter(note => formatDate(note.updatedAt) !== 'Today').length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Earlier</h3>
                    {filteredNotes
                      .filter(note => formatDate(note.updatedAt) !== 'Today')
                      .map((note) => (
                        <div
                          key={note._id}
                          onClick={() => setSelectedNote(note)}
                          className={`mb-3 p-4 rounded-lg border border-gray-600/50 bg-gray-800/50 hover:bg-gray-700/50 cursor-pointer transition-all ${
                            selectedNote?._id === note._id ? 'ring-2 ring-purple-500/50 bg-gray-700/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-200 mb-1 truncate">{note.title}</h4>
                              <p className="text-sm text-gray-400 mb-2 line-clamp-2">{note.content}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {formatDate(note.updatedAt)}
                              </div>
                            </div>
                            {note.starred && (
                              <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            )}
                          </div>
                          {note.topic && (
                            <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                              {note.topic}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Note Detail/Editor */}
        <div className="flex-1 bg-gray-900/30 backdrop-blur-sm flex flex-col">
          {isCreatingNote ? (
            /* Create Note Form */
            <>
              <div className="p-6 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">Create New Note</h1>
                      <p className="text-gray-400">Capture your learning insights and organize them with tags</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setIsCreatingNote(false);
                      resetForm();
                    }}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6 max-w-4xl">
                  <div>
                    <label className="text-sm font-semibold text-gray-300 mb-2 block">Topic (Optional)</label>
                    <Select value={newNote.topic} onValueChange={(value) => setNewNote({...newNote, topic: value})}>
                      <SelectTrigger className="h-12 bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Select a topic (optional)..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {topics.map(topic => (
                          <SelectItem key={topic} value={topic} className="text-white hover:bg-gray-700 focus:bg-gray-700">
                            {topic}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-300 mb-2 block">Title</label>
                    <Input 
                      placeholder="Give your note a meaningful title..."
                      value={newNote.title}
                      onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                      className="h-12 text-base bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-300 mb-2 block">Content</label>
                    <Textarea 
                      placeholder="Write your note content here. Be detailed and include examples, explanations, or anything that will help you remember..."
                      rows={12}
                      value={newNote.content}
                      onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                      className="resize-none text-base leading-relaxed bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Use markdown formatting if needed</span>
                      <span>{newNote.content.length} characters</span>
                    </div>
                  </div>
                  
                  {/* Tags Section */}
                  <div>
                    <label className="text-sm font-semibold text-gray-300 mb-2 block">
                      Tags ({newNote.tags.length}/10)
                    </label>
                    
                    {newNote.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                        {newNote.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-700 text-gray-200">
                            <Hash className="w-3 h-3" />
                            {tag}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-1 hover:bg-red-100"
                              onClick={() => removeTag(tag)}
                            >
                              <X className="w-3 h-3 text-red-400" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          placeholder="Add a custom tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTag(tagInput);
                            }
                          }}
                          className="pl-10 h-12 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                          disabled={newNote.tags.length >= 10}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => addTag(tagInput)}
                        disabled={!tagInput.trim() || newNote.tags.length >= 10}
                        className="h-12 px-6 border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-400 mb-3">Quick select popular tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {commonTags.map(tag => (
                          <Button
                            key={tag}
                            type="button"
                            variant="outline"
                            size="sm"
                            className={`text-xs transition-all border-gray-600 ${
                              newNote.tags.includes(tag) 
                                ? 'bg-blue-600/20 text-blue-300 border-blue-500' 
                                : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                            }`}
                            onClick={() => addTag(tag)}
                            disabled={newNote.tags.includes(tag) || newNote.tags.length >= 10}
                          >
                            <Hash className="w-3 h-3 mr-1" />
                            {tag}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-700">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreatingNote(false);
                        resetForm();
                      }}
                      className="px-6 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={createNote} 
                      disabled={!newNote.title.trim() || !newNote.content.trim()}
                      className="px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Note
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : selectedNote ? (
            <>
              {/* Note Header */}
              <div className="p-6 border-b border-gray-700/50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white mb-2">{selectedNote.title}</h1>
                    <div className="flex items-center gap-3">
                      {selectedNote.topic && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/50">
                          {selectedNote.topic}
                        </Badge>
                      )}
                      {selectedNote.aiGenerated && (
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50">
                          <Brain className="w-3 h-3 mr-1" />
                          AI Generated
                        </Badge>
                      )}
                      <div className="text-sm text-gray-400">
                        Created {new Date(selectedNote.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => toggleStar(selectedNote._id)}
                      variant="outline"
                      size="sm"
                      className={`border-gray-600 hover:bg-gray-700 ${
                        selectedNote.starred 
                          ? 'text-yellow-400 hover:text-yellow-300' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      {selectedNote.starred ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={() => deleteNote(selectedNote._id)}
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => copyToClipboard(selectedNote.content)}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Note Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-invert max-w-none">
                  <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {selectedNote.content}
                  </div>
                </div>

                {/* Tags */}
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-700/50">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedNote.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="bg-gray-800/50 text-gray-300 border-gray-600">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Empty State
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-3">Select a note to view</h2>
                <p className="text-gray-400 mb-6">Choose a note from the sidebar to see its details</p>
                <Button 
                  onClick={() => setIsCreatingNote(true)}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default Notes;
