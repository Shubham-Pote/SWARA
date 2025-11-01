import { useEffect, useRef, useState } from 'react';

interface ModelViewerProps {
  characterId: 'maria' | 'akira';
  className?: string;
}

export default function ModelViewer({ characterId, className }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        // Check if VRM file exists
        const modelPath = `/models/${characterId}/${characterId}.vrm`;
        console.log(`🎭 Attempting to load VRM model: ${modelPath}`);
        
        const response = await fetch(modelPath, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`VRM file not found: ${modelPath}`);
        }

        console.log(`✅ VRM file exists, attempting to load...`);
        
        // For now, we'll show this as successful but without actual 3D rendering
        // You would integrate with three.js and VRM loader here
        setModelLoaded(true);
        setLoadError(null);
        
        console.log(`🎉 Model loading simulated for ${characterId}`);
        
      } catch (error) {
        console.error(`❌ Failed to load VRM model:`, error);
        setLoadError(error instanceof Error ? error.message : 'Unknown error');
        setModelLoaded(false);
      }
    };

    loadModel();
  }, [characterId]);

  if (loadError) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">
            {characterId === 'akira' ? '🇯🇵' : '🇪🇸'}
          </div>
          <p className="text-sm text-gray-400">3D model not available</p>
          <p className="text-xs text-gray-500 mt-1">
            Place VRM file in: public/models/{characterId}/{characterId}.vrm
          </p>
        </div>
      </div>
    );
  }

  if (!modelLoaded) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2">🔄</div>
          <p className="text-sm text-gray-400">Loading 3D model...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`} ref={containerRef}>
      {/* Placeholder for actual 3D model rendering */}
      <div className="text-center">
        <div className="text-6xl mb-2">
          {characterId === 'akira' ? '🇯🇵' : '🇪🇸'}
        </div>
        <p className="text-sm text-gray-400">3D Model Ready</p>
        <p className="text-xs text-gray-500">
          (Three.js VRM loader integration needed)
        </p>
      </div>
    </div>
  );
}