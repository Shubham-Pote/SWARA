  import { useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { useAuth } from '../contexts/AuthContext';
  import GooeyNav from '../components/GooeyNav';
  import Hyperspeed from '../components/Hyperspeed';
  import {
    BookOpen,
    MessageCircle,
    Brain,
    Users,
    Trophy,
    Globe,
    Zap,
    Target,
    Sparkles,
    Heart,
    Mic,
  } from "lucide-react"

  // Magic Bento Style Card Component
  const MagicBentoCard = ({ 
    title, 
    description, 
    color, 
    icon: Icon 
  }: { 
    title: string; 
    description: string; 
    color: string; 
    icon: any;
  }) => (
    <div 
      className={`group relative overflow-hidden rounded-2xl p-6 text-center cursor-pointer transition-all duration-500 hover:scale-105 backdrop-blur-sm border border-white/10`}
      style={{
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
      }}
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{
          background: `radial-gradient(circle at center, ${color}40, transparent 70%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        <div 
          className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}80)`,
          }}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="font-bold text-lg mb-2 text-white">{title}</h3>
        <p className="text-sm opacity-90 text-gray-300">{description}</p>
      </div>
      
      {/* Spotlight effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
        style={{
          background: `conic-gradient(from 0deg at 50% 50%, transparent, ${color}60, transparent)`,
        }}
      />
    </div>
  );

  const Index = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (user) {
        navigate('/dashboard');
      }
    }, [user, navigate]);

    // Smooth scroll function
    const scrollToSection = (sectionId: string) => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Scroll to CTA section function
    const scrollToCTA = () => {
      const element = document.getElementById('cta-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    };

    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Hyperspeed Background */}
        <div className="fixed inset-0 z-0">
          <Hyperspeed />
        </div>

        {/* Navigation with GooeyNav - Fixed to right side */}
        <nav className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-4">
            <GooeyNav 
              items={[
                { label: 'Home', href: '#hero' },
                { label: 'About', href: '#about' }
              ]}
              colors={[1, 2]}
            />
            <button 
              onClick={scrollToCTA}
              className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold hover:bg-white/30 transition-all duration-200 border border-white/30 shadow-lg"
            >
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section id="hero" className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-4xl">
            <div className="mb-8">
              <div className="inline-flex items-center bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-4 py-2 text-sm font-bold rounded-full backdrop-blur-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                The fun way to learn languages
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
              Turn Conversations Into 
              <br />
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">Confidence</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto font-medium">
              Practice conversations with AI tutors, play interactive games, and master any language through personalized
              learning that adapts to you.
            </p>
          </div>
        </section>

        {/* About/Why AI Learn Section */}
        <section id="about" className="relative z-10 py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Why SWARA works</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Our AI-powered approach makes language learning effective, engaging, and fun
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center group backdrop-blur-sm bg-white/5 p-8 rounded-3xl border border-white/10">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">AI Conversations</h3>
                <p className="text-gray-300 text-lg">
                  Chat with AI tutors who listen, respond, and correct like a real teacher.
                </p>
              </div>

              <div className="text-center group backdrop-blur-sm bg-white/5 p-8 rounded-3xl border border-white/10">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Interactive Characters</h3>
                <p className="text-gray-300 text-lg">
                  Meet diverse AI personalities and practice real-world conversations in different scenarios
                </p>
              </div>

              <div className="text-center group backdrop-blur-sm bg-white/5 p-8 rounded-3xl border border-white/10">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Personalized Learning</h3>
                <p className="text-gray-300 text-lg">
                  AI adapts to your pace and learning style, creating custom lessons that keep you motivated
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Study Tools Section with Magic Bento Style Cards */}
        <section className="relative z-10 py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Your complete study toolkit</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Everything you need to master languages, all in one place
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MagicBentoCard
                title="Reading"
                description="Interactive stories"
                color="#3b82f6"
                icon={BookOpen}
              />

              <MagicBentoCard
                title="Notes"
                description="Study materials"
                color="#10b981"
                icon={BookOpen}
              />

              <MagicBentoCard
                title="AI Chat"
                description="Personal tutor"
                color="#8b5cf6"
                icon={MessageCircle}
              />

              <MagicBentoCard
                title="Quiz"
                description="Test knowledge"
                color="#f97316"
                icon={Brain}
              />

              <MagicBentoCard
                title="Progress"
                description="Track achievements"
                color="#eab308"
                icon={Trophy}
              />

              <MagicBentoCard
                title="Speech"
                description="Practice pronunciation"
                color="#14b8a6"
                icon={Mic}
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="relative z-10 py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">How it works</h2>
              <p className="text-xl text-gray-300">Start speaking a new language in minutes</p>
            </div>

            <div className="space-y-12">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 text-center md:text-left">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6 mx-auto md:mx-0 shadow-lg">
                    <span className="text-2xl font-black text-white">1</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Choose your language</h3>
                  <p className="text-lg text-gray-300">
                    Pick from dozens of languages and tell us your goals. Our AI will create a personalized learning path
                    just for you.
                  </p>
                </div>
                <div className="flex-1">
                  <div className="w-full h-64 backdrop-blur-sm bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center shadow-lg border border-white/10">
                    <Globe className="w-24 h-24 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row-reverse items-center gap-8">
                <div className="flex-1 text-center md:text-left">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-6 mx-auto md:mx-0 shadow-lg">
                    <span className="text-2xl font-black text-white">2</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Meet your AI tutor</h3>
                  <p className="text-lg text-gray-300">
                    Start conversations with AI characters who adapt to your level and interests. Practice real scenarios
                    you'll actually use.
                  </p>
                </div>
                <div className="flex-1">
                  <div className="w-full h-64 backdrop-blur-sm bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center shadow-lg border border-white/10">
                    <MessageCircle className="w-24 h-24 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 text-center md:text-left">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mb-6 mx-auto md:mx-0 shadow-lg">
                    <span className="text-2xl font-black text-white">3</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Track your progress</h3>
                  <p className="text-lg text-gray-300">
                    Watch your skills grow with detailed progress tracking, achievements, and personalized feedback from
                    your AI tutor.
                  </p>
                </div>
                <div className="flex-1">
                  <div className="w-full h-64 backdrop-blur-sm bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center shadow-lg border border-white/10">
                    <Trophy className="w-24 h-24 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="cta-section" className="relative z-10 py-20 px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Start your language journey today</h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Join millions of learners who are already speaking new languages with confidence. It's free, fun, and
              effective.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-white to-gray-100 text-black hover:from-gray-100 hover:to-white font-bold px-12 py-4 text-lg rounded-full shadow-xl transform hover:scale-105 transition-all duration-200 inline-flex items-center"
            >
              <Zap className="w-6 h-6 mr-3" />
              GET STARTED FOR FREE
            </button>
          </div>
        </section>

        {/* Contact/Footer Section */}
        <footer id="contact" className="relative z-10 py-12 px-4 backdrop-blur-sm bg-white/5 border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-bold text-white mb-4">Learn</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>
                    <button onClick={() => navigate('/lessons')} className="hover:text-green-400 transition-colors">
                      Languages
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/character')} className="hover:text-green-400 transition-colors">
                      AI Characters
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/dashboard')} className="hover:text-green-400 transition-colors">
                      Study Hub
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4">Company</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>
                    <button onClick={() => scrollToSection('about')} className="hover:text-green-400 transition-colors">
                      About
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/articles')} className="hover:text-green-400 transition-colors">
                      Blog
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/profile')} className="hover:text-green-400 transition-colors">
                      Careers
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4">Support</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>
                    <a href="mailto:support@ailearner.com" className="hover:text-green-400 transition-colors">
                      Help Center
                    </a>
                  </li>
                  <li>
                    <button onClick={() => scrollToSection('contact')} className="hover:text-green-400 transition-colors">
                      Privacy
                    </button>
                  </li>
                  <li>
                    <button onClick={() => scrollToSection('contact')} className="hover:text-green-400 transition-colors">
                      Terms
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400">
              <p>
                &copy; 2025 SWARA. Made with <Heart className="w-4 h-4 inline text-red-500" /> for language learners.
              </p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  export default Index