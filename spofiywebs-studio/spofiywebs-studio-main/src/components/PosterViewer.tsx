import { Suspense, useMemo } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import * as THREE from 'three'
import posterAsset from '@/assets/invincible-poster.glb.asset.json'
import circusAsset from '@/assets/circus-poster.glb.asset.json'
import ballerAsset from '@/assets/baller.glb.asset.json'
import dollAsset from '@/assets/doll-complete.glb.asset.json'
import fbxAsset from '@/assets/untitled.fbx.asset.json'

export type Variant = 'invincible' | 'circus' | 'baller' | 'doll' | 'untitled'

const config: Record<Variant, { url: string; size: number; rotation: [number, number, number]; min: number; max: number; label: string }> = {
  invincible: { url: posterAsset.url, size: 7.5, rotation: [0, 0, 0], min: 2.5, max: 12, label: '3D poster' },
  circus: { url: circusAsset.url, size: 3.6, rotation: [0, -Math.PI / 2, 0], min: 3.8, max: 9, label: 'Amazing Digital Circus poster' },
  baller: { url: ballerAsset.url, size: 3.4, rotation: [0, 0, 0], min: 2.5, max: 10, label: 'Baller character model' },
  doll: { url: dollAsset.url, size: 3.8, rotation: [0, 0, 0], min: 2.5, max: 10, label: 'Ball-joint doll model' },
  untitled: { url: fbxAsset.url, size: 3.4, rotation: [0, 0, 0], min: 2.5, max: 10, label: 'Untitled 3D model' },
}

function fit(source: THREE.Object3D, target: number) {
  const clone = source.clone(true)
  const size = new THREE.Box3().setFromObject(clone).getSize(new THREE.Vector3())
  clone.scale.multiplyScalar(target / Math.max(size.x, size.y, size.z, 0.001))
  const center = new THREE.Box3().setFromObject(clone).getCenter(new THREE.Vector3())
  clone.position.sub(center)
  return clone
}

function GltfModel({ variant }: { variant: Variant }) {
  const { scene } = useGLTF(config[variant].url)
  const object = useMemo(() => fit(scene, config[variant].size), [scene, variant])
  return <group rotation={config[variant].rotation}><primitive object={object} /></group>
}

function FbxModel({ variant }: { variant: Variant }) {
  const fbx = useLoader(FBXLoader, config[variant].url)
  const object = useMemo(() => fit(fbx, config[variant].size), [fbx, variant])
  return <primitive object={object} />
}

export function PosterViewer({ variant = 'invincible' }: { variant?: Variant }) {
  const c = config[variant]
  return <div className="poster-viewer h-full w-full" role="img" aria-label={`${c.label}; drag to rotate on desktop`}>
    <Canvas frameloop="demand" camera={{ position: [0, 0, 5.6], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 6]} intensity={2} />
      <Environment>
        <Lightformer intensity={2} position={[0, 5, 2]} scale={[8, 8, 1]} />
      </Environment>
      <Suspense fallback={null}>{variant === 'untitled' ? <FbxModel variant={variant} /> : <GltfModel variant={variant} />}</Suspense>
      <OrbitControls enableDamping enablePan={false} enableZoom={false} minDistance={c.min} maxDistance={c.max} />
    </Canvas>
  </div>
}
