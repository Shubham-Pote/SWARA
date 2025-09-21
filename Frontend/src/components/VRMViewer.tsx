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
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const vrmRef = useRef<any>()
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const animationIdRef = useRef<number>()

  // Character configurations
  const characterConfig = {
    maria: {
      modelPath: '/models/maria/maria.vrm',
      position: [0, -1.5, 0],
      scale: 1.2,
      flag: '🇪🇸'
    },
    akira: {
      modelPath: '/models/akira/akira.vrm', 
      position: [0, -1.5, 0],
      scale: 1.2,
      flag: '🇯🇵'
    }
  }

  useEffect(() => {
    if (!mountRef.current) return

    // Initialize Three.js scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      30,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance" 
    })

    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    
    mountRef.current.appendChild(renderer.domElement)

    // Store refs
    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    // Set up lighting
    setupLighting(scene)

    // Position camera
    camera.position.set(0, 0, 2.5)
    camera.lookAt(0, -0.5, 0)

    // Try to load VRM model
    loadVRMModel()

    // Start render loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      
      // Update VRM animations based on emotion and thinking state
      updateVRMAnimations()
      
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return
      
      const width = mountRef.current.clientWidth
      const height = mountRef.current.clientHeight
      
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

  const setupLighting = (scene: THREE.Scene) => {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    // Directional light (main light)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3)
    fillLight.position.set(-1, 0, 1)
    scene.add(fillLight)
  }

  const loadVRMModel = async () => {
    try {
      setIsLoading(true)
      setHasError(false)

      const config = characterConfig[characterId]
      
      // Check if VRM file exists
      const response = await fetch(config.modelPath, { method: 'HEAD' })
      if (!response.ok) {
        throw new Error('VRM file not found')
      }

      // Import VRM loader dynamically to reduce bundle size
      const { VRMLoaderPlugin } = await import('@pixiv/three-vrm')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

      const loader = new GLTFLoader()
      loader.register((parser) => new VRMLoaderPlugin(parser))

      const gltf = await loader.loadAsync(config.modelPath)
      const vrm = gltf.userData.vrm

      if (!vrm) {
        throw new Error('Invalid VRM file')
      }

      // Configure VRM
      vrm.scene.position.set(...config.position)
      vrm.scene.scale.setScalar(config.scale)
      
      // Reset T-pose - set character to neutral standing position
      if (vrm.humanoid) {
        console.log('Applying natural pose to VRM...')
        
        // Reset all bones to neutral first
        const bones = [
          'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
          'leftShoulder', 'rightShoulder',
          'leftUpperArm', 'rightUpperArm',
          'leftLowerArm', 'rightLowerArm',
          'leftHand', 'rightHand',
          'leftUpperLeg', 'rightUpperLeg',
          'leftLowerLeg', 'rightLowerLeg',
          'leftFoot', 'rightFoot'
        ];

        bones.forEach(boneName => {
          const bone = vrm.humanoid.getRawBoneNode(boneName);
          if (bone) {
            bone.rotation.set(0, 0, 0);
          }
        });

        // Apply natural standing pose
        const leftUpperArm = vrm.humanoid.getRawBoneNode('leftUpperArm')
        const rightUpperArm = vrm.humanoid.getRawBoneNode('rightUpperArm')
        const leftLowerArm = vrm.humanoid.getRawBoneNode('leftLowerArm')
        const rightLowerArm = vrm.humanoid.getRawBoneNode('rightLowerArm')
        const leftHand = vrm.humanoid.getRawBoneNode('leftHand')
        const rightHand = vrm.humanoid.getRawBoneNode('rightHand')
        
        if (leftUpperArm) {
          leftUpperArm.rotation.z = -0.2  // Arms down and slightly forward
          leftUpperArm.rotation.x = 0.1   
        }
        if (rightUpperArm) {
          rightUpperArm.rotation.z = 0.2   
          rightUpperArm.rotation.x = 0.1   
        }
        if (leftLowerArm) {
          leftLowerArm.rotation.z = 0.3    // Natural elbow bend
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.z = -0.3   
        }
        if (leftHand) {
          leftHand.rotation.z = 0.1        // Slightly relaxed hands
        }
        if (rightHand) {
          rightHand.rotation.z = -0.1
        }
        
        // Slight forward lean for more natural pose
        const spine = vrm.humanoid.getRawBoneNode('spine')
        if (spine) spine.rotation.x = 0.05
        
        // Head position
        const head = vrm.humanoid.getRawBoneNode('head')
        if (head) {
          head.rotation.x = -0.1 // Slightly looking down (more natural)
        }
        
        // CRITICAL: Update humanoid after setting bone rotations
        vrm.humanoid.update();
        
        console.log('Natural pose applied successfully!')
      } else {
        console.warn('VRM humanoid not available - cannot apply natural pose')
      }

      // Update VRM to apply bone changes
      vrm.update(0.016); // 60fps

      // Add to scene
      if (sceneRef.current) {
        // Remove previous model if exists
        if (vrmRef.current) {
          sceneRef.current.remove(vrmRef.current.scene)
        }
        
        sceneRef.current.add(vrm.scene)
        vrmRef.current = vrm
      }

      setIsLoading(false)
    } catch (error) {
      console.warn('VRM loading failed:', error)
      setHasError(true)
      setIsLoading(false)
    }
  }

  const updateVRMAnimations = () => {
    if (!vrmRef.current) return

    const vrm = vrmRef.current
    const time = performance.now() * 0.001

    // Update VRM (required for animations)
    vrm.update(1 / 60)

    // Apply emotion-based expressions
    if (vrm.expressionManager) {
      // Reset all expressions
      vrm.expressionManager.setValue('happy', 0)
      vrm.expressionManager.setValue('sad', 0)
      vrm.expressionManager.setValue('surprised', 0)
      vrm.expressionManager.setValue('angry', 0)

      // Apply current emotion
      switch (emotion) {
        case 'happy':
        case 'excited':
          vrm.expressionManager.setValue('happy', 0.8)
          break
        case 'thoughtful':
          vrm.expressionManager.setValue('surprised', 0.3)
          break
        case 'encouraging':
          vrm.expressionManager.setValue('happy', 0.6)
          break
        default:
          // Neutral expression with subtle smile
          vrm.expressionManager.setValue('happy', 0.1)
          break
      }

      // Blinking animation
      const blinkCycle = time * 0.8
      const blinkIntensity = Math.sin(blinkCycle) > 0.85 ? 1 : 0
      vrm.expressionManager.setValue('blink', blinkIntensity)

      // Add thinking animation (subtle head movement)
      if (isThinking) {
        const headBone = vrm.humanoid?.getRawBoneNode('head')
        if (headBone) {
          headBone.rotation.y = Math.sin(time * 2) * 0.1
          headBone.rotation.x = Math.sin(time * 1.5) * 0.05
        }
      } else {
        // Idle head movement
        const headBone = vrm.humanoid?.getRawBoneNode('head')
        if (headBone) {
          headBone.rotation.y = Math.sin(time * 0.3) * 0.05
          headBone.rotation.x = Math.sin(time * 0.2) * 0.02
        }
      }
      
      // Update humanoid after bone changes
      vrm.humanoid.update();
    }

    // Subtle breathing animation
    if (vrm.scene) {
      vrm.scene.scale.y = 1 + Math.sin(time * 1.2) * 0.008 // Slower, more natural breathing
      
      // Slight chest movement for breathing
      const chest = vrm.humanoid?.getRawBoneNode('chest')
      if (chest) {
        chest.rotation.x = Math.sin(time * 1.2) * 0.02
      }
    }

    // Subtle idle body movement for more natural pose
    if (vrm.humanoid && !isThinking) {
      const spine = vrm.humanoid.getRawBoneNode('spine')
      if (spine) {
        spine.rotation.y = Math.sin(time * 0.5) * 0.02
        spine.rotation.x = 0.1 + Math.sin(time * 0.4) * 0.01
      }

      // Subtle arm sway
      const leftUpperArm = vrm.humanoid.getRawBoneNode('leftUpperArm')
      const rightUpperArm = vrm.humanoid.getRawBoneNode('rightUpperArm')
      if (leftUpperArm) {
        leftUpperArm.rotation.z = -0.5 + Math.sin(time * 0.6) * 0.05
      }
      if (rightUpperArm) {
        rightUpperArm.rotation.z = 0.5 + Math.sin(time * 0.7) * 0.05
      }
      
      // Update humanoid after idle movements
      vrm.humanoid.update();
    }
  }

  // Fallback placeholder when VRM is not available
  const renderPlaceholder = () => {
    const config = characterConfig[characterId]
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-6xl mb-4 ${isThinking ? 'animate-bounce' : ''}`}>
          {config.flag}
        </div>
        <div className="text-center text-slate-400">
          <p className="text-sm mb-2">3D Character Model</p>
          {hasError ? (
            <div className="text-xs">
              <p>VRM file not found</p>
              <p>Place {characterId}.vrm in:</p>
              <p className="font-mono">public/models/{characterId}/</p>
            </div>
          ) : isLoading ? (
            <p className="text-xs">Loading VRM model...</p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mountRef} 
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />
      {(isLoading || hasError) && renderPlaceholder()}
    </div>
  )
}

export default VRMViewer