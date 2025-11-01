
import { useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"

interface Character {
  id: 'maria' | 'akira'
  name: string
  language: string
  description: string
  flag: string
  image: string
}

const characters: Character[] = [
  {
    id: 'akira',
    name: 'AKIRA TANAKA',
    language: 'Japanese',
    description: 'Konnichiwa! I\'m Akira Tanaka, your Japanese tutor from Tokyo. I specialize in teaching formal Japanese, business language, and cultural etiquette. Whether you\'re a beginner or intermediate learner, I\'ll guide you through the beautiful complexity of Japanese language and culture.',
    flag: '🇯🇵',
    image: '/src/assets/images/Akira.png' // Updated path
  },
  {
    id: 'maria',
    name: 'MARÍA GONZÁLEZ',
    language: 'Spanish',
    description: '¡Hola! I\'m María González, your Spanish teacher from Mexico City! I\'m here to help you learn Spanish through fun conversations about Mexican culture, food, and daily life. Feel free to ask me anything in English or Spanish - let\'s make learning enjoyable!',
    flag: '🇲🇽',
    image: '/src/assets/images/Maria.png' // Updated path
  }
]

const Character = () => {
  const navigate = useNavigate()

  const handleSeeCharacter = (characterId: string) => {
    navigate(`/character/${characterId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Header */}
      <div className="text-center py-12 relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-4">
          Select Your Character To start learning
        </h1>
      </div>

      {/* Character Selection */}
      <div className="max-w-7xl mx-auto px-6 space-y-16">
        {characters.map((character, index) => (
          <div 
            key={character.id}
            className={`flex items-center ${
              index % 2 === 1 ? 'flex-row-reverse' : ''
            }`}
          >
            {/* Character Image */}
            <div className="flex-shrink-0">
              <img 
                src={character.image} 
                alt={character.name}
                className="w-80 h-96 object-cover rounded-2xl shadow-2xl"
                onError={(e) => {
                  // Fallback to emoji if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              {/* Fallback emoji (hidden by default) */}
              <div className="w-80 h-96 rounded-2xl shadow-2xl bg-gradient-to-br from-purple-200 to-pink-300 text-8xl opacity-80 hidden">
                <div className="flex items-center justify-center h-full">
                  {character.id === 'akira' ? '👨‍🏫' : '👩‍🏫'}
                </div>
              </div>
            </div>

            {/* Character Info with Speech Bubble Container */}
            <div className="flex-1 space-y-6">
              {/* Character Name Header */}
              <h2 className={`text-3xl font-bold tracking-wider ${
                character.id === 'akira' 
                  ? 'bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent text-right' 
                  : 'bg-gradient-to-r from-pink-300 to-purple-400 bg-clip-text text-transparent'
              }`}>
                {character.name}
              </h2>
              
              {/* Speech Bubble Container */}
              <div className="relative">
                {/* Rectangular container touching the image */}
                <div className={`p-8 border-2 bg-gradient-to-br ${
                  character.id === 'akira'
                    ? 'border-yellow-300/40 from-yellow-500/5 to-orange-500/5'
                    : 'border-pink-300/40 from-pink-500/5 to-purple-500/5'
                } backdrop-blur-sm shadow-2xl ${
                  index % 2 === 1 
                    ? 'rounded-l-3xl rounded-r-none' 
                    : 'rounded-r-3xl rounded-l-none'
                }`}>
                  
                  {/* Description Text */}
                  <p className="text-gray-300 text-lg leading-relaxed">
                    {character.description}
                  </p>

                  {/* See Character Button inside container */}
                  <div className="mt-6">
                    <button
                      onClick={() => handleSeeCharacter(character.id)}
                      className={`inline-flex items-center gap-3 text-lg font-medium transition-all duration-300 group px-6 py-3 rounded-full border-2 ${
                        character.id === 'akira'
                          ? 'text-yellow-300 border-yellow-300/50 bg-yellow-300/10 hover:border-yellow-300 hover:bg-yellow-300/20 hover:shadow-lg hover:shadow-yellow-300/25'
                          : 'text-pink-300 border-pink-300/50 bg-pink-300/10 hover:border-pink-300 hover:bg-pink-300/20 hover:shadow-lg hover:shadow-pink-300/25'
                      }`}
                    >
                      See This Character
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom spacing */}
      <div className="h-20"></div>
    </div>
  )
}

export default Character