import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface VRMViewerProps {
  characterId: 'maria' | 'akira'
  emotion: string
  isThinking: boolean
  className?: string
}

const VRMViewer = ({ characterId, emotion, isThinking, className }: VRMViewerProps) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const vrmRef = useRef<any>(null)
  const clockRef = useRef<THREE.Clock>(new THREE.Clock())
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const animationIdRef = useRef<number | null>(null)
  const [isGreeting, setIsGreeting] = useState(false)
  const greetingStartTimeRef = useRef<number | null>(null)

  // Character configurations with better positioning  
  const characterConfig = {
    maria: {
      modelPath: '/models/maria/maria.vrm',
      position: [0, -1.0, -2.0],  // Move back (negative Z) and lower
      scale: 2.0,  // Reduce scale slightly for better framing
      flag: '🇪🇸'
    },
    akira: {
      modelPath: '/models/akira/akira.vrm', 
      position: [0, -1.0, -2.0],  // Move back (negative Z) and lower
      scale: 2.0,  // Reduce scale slightly for better framing
      flag: '🇯🇵'
    }
  }

  // Handle character switching - reload model when character changes
  useEffect(() => {
    if (sceneRef.current && vrmRef.current) {
      // Remove old character
      sceneRef.current.remove(vrmRef.current.scene);
      vrmRef.current = null;
      
      // Load new character
      loadVRMModel();
    }
  }, [characterId]);

  // Handle emotion changes
  useEffect(() => {
    if (vrmRef.current && vrmRef.current.expressionManager) {
      // updateVRMEmotion(emotion);
      console.log('Emotion changed to:', emotion);
    }
  }, [emotion]);

  // Handle thinking state animation
  useEffect(() => {
    if (vrmRef.current) {
      if (isThinking) {
        // Add subtle animation when thinking
        setIsGreeting(false);
      }
    }
  }, [isThinking]);

  useEffect(() => {
    if (!mountRef.current) return

    // Initialize Three.js scene
    const scene = new THREE.Scene()
    scene.background = null  // Transparent background
    
    const camera = new THREE.PerspectiveCamera(
      45,  // Wider FOV to see more of the character
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.01,  // Much closer near plane
      50     // Increased far plane
    )
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance" 
    })

    // Ensure minimum size to prevent WebGL errors
    const width = Math.max(mountRef.current.clientWidth, 300)
    const height = Math.max(mountRef.current.clientHeight, 300)
    
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    
    mountRef.current.appendChild(renderer.domElement)

    // Store refs
    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    // Set up lighting
    setupLighting(scene)

    // Position camera for better framing - moved higher to show character better
    camera.position.set(0, 1.5, 2.0)  // Position in front of character
    camera.lookAt(0, 0.5, -2.0)  // Look at character's position
    console.log(`📷 Camera positioned at:`, camera.position)
    console.log(`👀 Camera looking at: (0, 0.5, -2.0)`)

    // Load VRM model
    loadVRMModel()

    // Start render loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      
      const deltaTime = clockRef.current.getDelta()
      
      // Update VRM animations
      if (vrmRef.current) {
        updateVRMAnimations(deltaTime)
      }
      
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return
      
      const width = Math.max(mountRef.current.clientWidth, 300)
      const height = Math.max(mountRef.current.clientHeight, 300)
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [characterId])

  // Debug emotion changes
  useEffect(() => {
    console.log(`🎭 Emotion changed to: ${emotion}, isThinking: ${isThinking}`)
  }, [emotion, isThinking])

  const setupLighting = (scene: THREE.Scene) => {
    // Brighter ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    // Main directional light from front
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight.position.set(1, 2, 3)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // Fill light from left
    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.5)
    fillLight.position.set(-2, 1, 2)
    scene.add(fillLight)
    
    // Back light for rim lighting
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4)
    rimLight.position.set(0, 1, -2)
    scene.add(rimLight)
  }

  const loadVRMModel = async () => {
    try {
      setIsLoading(true)
      setHasError(false)

      const config = characterConfig[characterId]
      console.log(`🎭 Loading VRM model for ${characterId}:`, config.modelPath)
      
      // Check if VRM file exists
      const response = await fetch(config.modelPath, { method: 'HEAD' })
      if (!response.ok) {
        console.warn(`❌ VRM file not found: ${config.modelPath}`)
        throw new Error('VRM file not found')
      }

      console.log(`✅ VRM file exists, loading model...`)

      // Import VRM loader
      const { VRMLoaderPlugin, VRMHumanBoneName } = await import('@pixiv/three-vrm')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

      const loader = new GLTFLoader()
      loader.register((parser) => new VRMLoaderPlugin(parser))

      const gltf = await loader.loadAsync(config.modelPath)
      const vrm = gltf.userData.vrm

      if (!vrm) {
        console.error(`❌ Invalid VRM file - no VRM data found`)
        throw new Error('Invalid VRM file')
      }

      console.log(`✅ VRM model loaded successfully:`, {
        hasHumanoid: !!vrm.humanoid,
        hasExpressionManager: !!vrm.expressionManager,
        bones: vrm.humanoid ? Object.keys(vrm.humanoid.normalizedHumanBones || {}).length : 0
      })

      // Position and scale the model
      console.log(`🎯 Setting VRM position to:`, config.position)
      vrm.scene.position.set(...config.position)
      console.log(`📍 VRM actual position after setting:`, vrm.scene.position)
      vrm.scene.scale.setScalar(config.scale)
      console.log(`📏 VRM scale set to:`, config.scale)
      
      // Add a visible test cube to verify scene is working
      const testGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
      const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
      const testCube = new THREE.Mesh(testGeometry, testMaterial)
      testCube.position.set(1, 1, 0) // Position next to character
      if (sceneRef.current) {
        sceneRef.current.add(testCube)
        console.log(`🔴 Added red test cube at position (1, 1, 0)`)
      }
      
      // Check if model needs rotation (some VRMs face backwards by default)
      vrm.scene.rotation.y = 0  // Try no rotation first
      
      // Set up natural idle pose
      if (vrm.humanoid) {
        console.log(`🎭 Setting up natural pose for ${characterId}`)
        setupNaturalPose(vrm, VRMHumanBoneName)
      } else {
        console.warn(`⚠️ No humanoid system found in VRM model`)
      }

      // Initialize expressions
      if (vrm.expressionManager) {
        console.log(`😊 Expression manager found, initializing expressions`)
        // Reset all expressions
        const expressions = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'relaxed', 'blink']
        expressions.forEach(expr => {
          try {
            vrm.expressionManager.setValue(expr, 0)
          } catch {}
        })
      } else {
        console.warn(`⚠️ No expression manager found in VRM model`)
      }

      // Add to scene
      if (sceneRef.current) {
        // Remove previous model if exists
        if (vrmRef.current) {
          sceneRef.current.remove(vrmRef.current.scene)
        }
        
        sceneRef.current.add(vrm.scene)
        vrmRef.current = vrm
        
        // Store VRMHumanBoneName for animations
        vrmRef.current.VRMHumanBoneName = VRMHumanBoneName
      }

      setIsLoading(false)
      console.log(`🎉 VRM model ${characterId} loaded and ready for animations!`)
    } catch (error) {
      console.error('❌ VRM loading failed:', error)
      setHasError(true)
      setIsLoading(false)
    }
  }

  const setupNaturalPose = (vrm: any, VRMHumanBoneName: any) => {
    try {
      // Reset all bones first
      Object.values(VRMHumanBoneName).forEach((boneName: any) => {
        const bone = vrm.humanoid.getNormalizedBoneNode(boneName)
        if (bone) {
          bone.rotation.set(0, 0, 0)
        }
      })

      // Get arm and hand bones
      const leftUpperArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
      const rightUpperArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const leftLowerArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm)
      const rightLowerArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
      const leftHand = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftHand)
      const rightHand = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightHand)
      
      // Natural pose with hands at waist level (proper values for 180° rotation)
      if (leftUpperArm) {
        leftUpperArm.rotation.z = Math.PI * 0.35   // More down angle to lower arms
        leftUpperArm.rotation.x = 0.4   // Forward bend for waist position
        leftUpperArm.rotation.y = 0.5   // Inward rotation for hands on waist
      }
      if (rightUpperArm) {
        rightUpperArm.rotation.z = -Math.PI * 0.35  // More down angle to lower arms
        rightUpperArm.rotation.x = 0.4
        rightUpperArm.rotation.y = -0.5  // Inward rotation for hands on waist
      }
      
      // Elbow bend to bring hands to waist level (proper values)
      if (leftLowerArm) {
        leftLowerArm.rotation.y = -0.6   // Bring closer to body
        leftLowerArm.rotation.x = 0.0    // No forward angle
        leftLowerArm.rotation.z = 0.5    // Inward rotation to bring closer
      }
      if (rightLowerArm) {
        rightLowerArm.rotation.y = 0.6    // Bring closer to body
        rightLowerArm.rotation.x = 0.0    // No forward angle
        rightLowerArm.rotation.z = -0.5   // Inward rotation to bring closer
      }
      
      // Hand position at waist - touching waist area (proper orientation)
      if (leftHand) {
        leftHand.rotation.z = 0.1        // Slight wrist adjustment
        leftHand.rotation.x = -0.2       // Hand facing naturally
        leftHand.rotation.y = 0.8        // Inward turn to touch waist
      }
      if (rightHand) {
        rightHand.rotation.z = -0.1      // Slight wrist adjustment
        rightHand.rotation.x = -0.2      // Hand facing naturally
        rightHand.rotation.y = -0.8      // Inward turn to touch waist
      }
      
      // Natural posture - confident standing
      const spine = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Spine)
      const chest = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Chest)
      const upperChest = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.UpperChest)
      const neck = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck)
      const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)
      const hips = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips)
      
      if (spine) spine.rotation.x = 0.03   // Slightly straighter posture
      if (chest) chest.rotation.x = 0.02
      if (upperChest) upperChest.rotation.x = 0.01
      if (neck) neck.rotation.x = -0.02
      if (head) {
        head.rotation.x = 0.02
        head.rotation.y = 0  // Look straight ahead
      }
      if (hips) {
        hips.position.y = 0.5  // Moderate hip height for better proportion
      }
      
      // Update the humanoid system
      vrm.humanoid.update()
      
      // Start greeting animation
      setIsGreeting(true)
      greetingStartTimeRef.current = performance.now() * 0.001
      
    } catch (error) {
      console.warn('Error setting up natural pose:', error)
    }
  }

  const updateVRMAnimations = (deltaTime: number) => {
    const vrm = vrmRef.current
    if (!vrm || !vrm.VRMHumanBoneName) return

    const time = performance.now() * 0.001
    const VRMHumanBoneName = vrm.VRMHumanBoneName

    // Check if greeting animation should stop (after 3 seconds)
    if (isGreeting && greetingStartTimeRef.current && (time - greetingStartTimeRef.current) > 3) {
      setIsGreeting(false)
      greetingStartTimeRef.current = null
    }

    // Animation parameters
    const breathSpeed = isThinking ? 3 : 2  // Faster breathing when thinking
    const swayAmount = 0.01
    const headMoveAmount = isThinking ? 0.15 : 0.08

    if (vrm.humanoid) {
      // Get bones
      const chest = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Chest)
      const spine = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Spine)
      const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)
      const neck = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck)
      const hips = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips)
      
      // Breathing animation
      if (chest) {
        chest.rotation.x = 0.02 + Math.sin(time * breathSpeed) * 0.015
      }
      if (spine) {
        spine.rotation.x = 0.03 + Math.sin(time * breathSpeed + 0.5) * 0.008
      }
      
      // Head movements
      if (head) {
        if (isGreeting && greetingStartTimeRef.current) {
          // Greeting head movement - friendly nod
          const greetingTime = time - greetingStartTimeRef.current
          head.rotation.x = 0.02 + Math.sin(greetingTime * 4) * 0.15
          head.rotation.y = Math.sin(greetingTime * 2) * 0.1
          head.rotation.z = Math.sin(greetingTime * 3) * 0.05
        } else if (isThinking) {
          // Looking around when thinking
          head.rotation.x = 0.02 + Math.sin(time * 1.5) * 0.1
          head.rotation.y = Math.sin(time * 1.2) * 0.25
          head.rotation.z = Math.sin(time * 1.8) * 0.05
        } else {
          // Natural idle head movement
          head.rotation.x = 0.02 + Math.sin(time * 0.7) * 0.05
          head.rotation.y = Math.sin(time * 0.5) * headMoveAmount
          head.rotation.z = Math.sin(time * 0.9) * 0.02
        }
      }
      
      // Subtle neck movement
      if (neck) {
        neck.rotation.x = -0.02 + Math.sin(time * 0.8 + 1) * 0.015
        neck.rotation.y = Math.sin(time * 0.6) * 0.02
      }
      
      // Very subtle body sway
      if (hips) {
        hips.position.x = Math.sin(time * 0.4) * swayAmount
        hips.position.y = 0.5 + Math.sin(time * 0.8) * 0.003  // Base height + subtle movement
        hips.rotation.y = Math.sin(time * 0.3) * 0.01
      }
      
      // Arm animations - greeting wave or natural position
      const leftUpperArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
      const rightUpperArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
      const leftLowerArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm)
      const rightLowerArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
      const leftHand = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftHand)
      const rightHand = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightHand)
      
      if (isGreeting && greetingStartTimeRef.current) {
        // Greeting animation - right hand waving HIGH AND VISIBLE
        const greetingTime = time - greetingStartTimeRef.current
        const waveProgress = Math.min(greetingTime / 3, 1) // 3 second greeting
        // Use waveProgress for future wave animation implementation
        console.log('Wave animation progress:', waveProgress);
        
        // Right arm waving motion - PROPER UPWARD LIFTING AND OUTWARD WAVING
        if (rightUpperArm) {
          // Raise arm HIGH and OUT for proper greeting wave
          rightUpperArm.rotation.z = -Math.PI * 0.7 // RAISED HIGH ARM  
          rightUpperArm.rotation.x = -0.2 // Slightly backward to lift arm up and out
          rightUpperArm.rotation.y = -0.8 + Math.sin(greetingTime * 5) * 0.3  // More outward, away from body
        }
        if (rightLowerArm) {
          // Elbow movement for proper waving - UP AND OUT
          rightLowerArm.rotation.y = -0.3 + Math.sin(greetingTime * 8) * 0.4 // Outward waving motion
          rightLowerArm.rotation.x = -0.3  // Upward elbow position
          rightLowerArm.rotation.z = -0.1  // Slight outward orientation
        }
        if (rightHand) {
          // Hand waving motion - UP AND OUTWARD
          rightHand.rotation.z = -0.2 + Math.sin(greetingTime * 10) * 0.4 // Upward waving
          rightHand.rotation.x = 0.1   // Hand facing upward
          rightHand.rotation.y = -0.3 + Math.sin(greetingTime * 8) * 0.3 // Outward waving
        }
        
        // Left arm stays at waist (casual pose during greeting) - PROPER VALUES
        if (leftUpperArm) {
          leftUpperArm.rotation.z = Math.PI * 0.35
          leftUpperArm.rotation.x = 0.4   // Forward bend
          leftUpperArm.rotation.y = 0.5   // Inward rotation
        }
        if (leftLowerArm) {
          leftLowerArm.rotation.y = -0.6  // Toward body
          leftLowerArm.rotation.x = 0.0
          leftLowerArm.rotation.z = 0.5   // Inward rotation
        }
        if (leftHand) {
          leftHand.rotation.z = 0.1       // Slight wrist adjustment
          leftHand.rotation.x = -0.2      // Hand facing naturally
          leftHand.rotation.y = 0.8       // Inward turn to touch waist
        }
      } else {
        // Normal standing pose with hands at waist - PROPER VALUES FOR 180° ROTATION
        if (leftUpperArm) {
          leftUpperArm.rotation.z = Math.PI * 0.35 + Math.sin(time * 0.5) * 0.005  // Gentle movement
          leftUpperArm.rotation.x = 0.4 + Math.sin(time * 0.4) * 0.005
          leftUpperArm.rotation.y = 0.5 + Math.sin(time * 0.3) * 0.01
        }
        if (rightUpperArm) {
          rightUpperArm.rotation.z = -Math.PI * 0.35 + Math.sin(time * 0.5 + Math.PI) * 0.005
          rightUpperArm.rotation.x = 0.4 + Math.sin(time * 0.4 + Math.PI) * 0.005
          rightUpperArm.rotation.y = -0.5 + Math.sin(time * 0.3 + Math.PI) * 0.01
        }
        if (leftLowerArm) {
          leftLowerArm.rotation.y = -0.6 + Math.sin(time * 0.6) * 0.01  // Bring closer to body
          leftLowerArm.rotation.x = 0.0 + Math.sin(time * 0.7) * 0.005   // No forward angle
          leftLowerArm.rotation.z = 0.5 + Math.sin(time * 0.7) * 0.005   // Inward rotation to bring closer
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.y = 0.6 + Math.sin(time * 0.6 + Math.PI) * 0.01  // Bring closer to body
          rightLowerArm.rotation.x = 0.0 + Math.sin(time * 0.7 + Math.PI) * 0.005  // No forward angle
          rightLowerArm.rotation.z = -0.5 + Math.sin(time * 0.7 + Math.PI) * 0.005 // Inward rotation to bring closer
        }
        
        // Natural hand position at waist - PROPER VALUES
        if (leftHand) {
          leftHand.rotation.z = 0.1 + Math.sin(time * 0.8) * 0.005      // Slight wrist adjustment
          leftHand.rotation.x = -0.2 + Math.sin(time * 0.6) * 0.005     // Hand facing naturally
          leftHand.rotation.y = 0.8 + Math.sin(time * 0.4) * 0.005      // Inward turn to touch waist
        }
        if (rightHand) {
          rightHand.rotation.z = -0.1 + Math.sin(time * 0.8 + Math.PI) * 0.005  // Slight wrist adjustment
          rightHand.rotation.x = -0.2 + Math.sin(time * 0.6 + Math.PI) * 0.005  // Hand facing naturally
          rightHand.rotation.y = -0.8 + Math.sin(time * 0.4 + Math.PI) * 0.005  // Inward turn to touch waist
        }
      }
      
      // Update humanoid after bone changes
      vrm.humanoid.update()
    }

    // Facial expressions and blinking
    if (vrm.expressionManager) {
      // Reset expressions safely
      const resetExpression = (name: string) => {
        try {
          vrm.expressionManager.setValue(name, 0)
        } catch {}
      }
      
      resetExpression('happy')
      resetExpression('sad')
      resetExpression('angry')
      resetExpression('surprised')
      resetExpression('relaxed')

      // Apply emotion-based expression
      try {
        switch (emotion) {
          case 'happy':
          case 'excited':
            vrm.expressionManager.setValue('happy', 0.7)
            break
          case 'sad':
            vrm.expressionManager.setValue('sad', 0.6)
            break
          case 'thoughtful':
          case 'confused':
            vrm.expressionManager.setValue('surprised', 0.3)
            break
          case 'encouraging':
            vrm.expressionManager.setValue('happy', 0.5)
            break
          default:
            vrm.expressionManager.setValue('happy', 0.15) // Slight smile
        }
      } catch (e) {
        // Silently handle if expression doesn't exist
      }

      // Natural blinking
      try {
        const blinkCycle = Math.sin(time * 4) > 0.98 || Math.sin(time * 4.7) > 0.99
        vrm.expressionManager.setValue('blink', blinkCycle ? 1 : 0)
      } catch {}
      
      // Update expressions
      vrm.expressionManager.update()
    }

    // Update VRM
    vrm.update(deltaTime)
  }

  // Improved placeholder
  const renderPlaceholder = () => {
    const config = characterConfig[characterId]
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-8xl mb-4 ${isThinking ? 'animate-pulse' : 'animate-bounce'}`}>
          {config.flag}
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {characterId === 'maria' ? 'María González' : 'Akira Tanaka'}
          </p>
          {isLoading && (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
          {hasError && (
            <div className="text-sm text-red-500 mt-2">
              <p>Unable to load 3D model</p>
              <p className="text-xs text-gray-500 mt-1">Place VRM file in: public/models/{characterId}/</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full ${className || ''}`} style={{ minHeight: '600px' }}>
      <div 
        ref={mountRef} 
        className="absolute inset-0"
        style={{ background: 'transparent' }}
      />
      {(isLoading || hasError) && renderPlaceholder()}
    </div>
  )
}

export default VRMViewer