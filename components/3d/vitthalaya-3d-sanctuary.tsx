'use client';

import * as React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Link from 'next/link';
import {
  Play,
  Pause,
  Compass,
  Sparkles,
  ArrowRight,
  List,
} from 'lucide-react';
import {
  SCRAPED_COMPOSITIONS,
} from '@/src/data/scraped-music-data';

interface Vitthalaya3DSanctuaryProps {
  initialGenre?: string;
  className?: string;
  isStandalone?: boolean;
}

const GENRE_TABS = [
  { id: 'all', label: 'सर्व रचना', count: 21 },
  { id: 'abhang', label: 'अभंग', count: 4 },
  { id: 'gaulani', label: 'गवळण', count: 3 },
  { id: 'bharud', label: 'भारुड', count: 3 },
  { id: 'deviche_gane', label: 'देवीचे गाणे व आरती', count: 2 },
  { id: 'bhajan', label: 'भक्तिगीत व भजन', count: 5 },
  { id: 'kirtan', label: 'कीर्तन व गजर', count: 2 },
  { id: 'stotra', label: 'स्तोत्र व संस्कृत', count: 2 },
];

export function Vitthalaya3DSanctuary({
  initialGenre = 'all',
  className = '',
  isStandalone = false,
}: Vitthalaya3DSanctuaryProps) {
  const [selectedGenre, setSelectedGenre] = React.useState(initialGenre);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
  const [viewMode, setViewMode] = React.useState<'3d' | 'grid'>('3d');
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);
  const [inspectorOpen, setInspectorOpen] = React.useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const sceneRef = React.useRef<THREE.Scene | null>(null);
  const cameraRef = React.useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = React.useRef<OrbitControls | null>(null);
  const platesGroupRef = React.useRef<THREE.Group | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  // Filter compositions by active genre
  const filteredItems = React.useMemo(() => {
    if (selectedGenre === 'all') return SCRAPED_COMPOSITIONS;
    return SCRAPED_COMPOSITIONS.filter((item) => item.genre === selectedGenre);
  }, [selectedGenre]);

  const activeComposition = filteredItems[selectedIndex] || filteredItems[0] || SCRAPED_COMPOSITIONS[0];

  // Detect reduced motion preference
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // Handle Audio toggle
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((e) => {
        console.warn('Audio play restricted by browser policy:', e);
      });
    }
  };

  // ── Three.js 3D Celestial Mandala Carousel Setup ────────────────────────────
  React.useEffect(() => {
    if (viewMode !== '3d' || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 560;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x0a0806, 0.04);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 12);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.minPolarAngle = Math.PI / 6;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.9);
    scene.add(ambientLight);

    const goldenSun = new THREE.DirectionalLight(0xffd700, 1.8);
    goldenSun.position.set(6, 12, 8);
    goldenSun.castShadow = true;
    goldenSun.shadow.mapSize.width = 1024;
    goldenSun.shadow.mapSize.height = 1024;
    scene.add(goldenSun);

    const mysticalFill = new THREE.PointLight(0xa855f7, 2, 20);
    mysticalFill.position.set(-6, -2, -6);
    scene.add(mysticalFill);

    // Golden Central Sanctum Pillar (Visual Center Anchor)
    const centralPillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 6, 32);
    const centralPillarMat = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x443005,
    });
    const centralPillar = new THREE.Mesh(centralPillarGeo, centralPillarMat);
    centralPillar.position.set(0, 0, 0);
    scene.add(centralPillar);

    // ── Swirling Sacred Temple Dust / Stardust Particles ─────────────────────
    const particleCount = prefersReducedMotion ? 100 : 500;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const goldColor = new THREE.Color(0xf6bc55);
    const amberColor = new THREE.Color(0xff7a1a);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2 + Math.random() * 10;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 8;

      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;

      const c = Math.random() > 0.5 ? goldColor : amberColor;
      particleColors[i * 3] = c.r;
      particleColors[i * 3 + 1] = c.g;
      particleColors[i * 3 + 2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── 3D Sacred Manuscript Plates Group ────────────────────────────────────
    const platesGroup = new THREE.Group();
    platesGroupRef.current = platesGroup;
    scene.add(platesGroup);

    const items = filteredItems;
    const radius = Math.max(5.5, items.length * 0.45);
    const plateMeshes: THREE.Mesh[] = [];

    items.forEach((item, idx) => {
      const angle = (idx / items.length) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;

      // Canvas Texture for Ornate Sacred Manuscript Plate
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 360;
      const ctx = canvas.getContext('2d')!;

      // Background Gradient (Deep Maroon / Velvet Temple Parchment)
      const grad = ctx.createLinearGradient(0, 0, 512, 360);
      grad.addColorStop(0, '#24100c');
      grad.addColorStop(1, '#120705');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 360);

      // Gold Filigree Border
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 8;
      ctx.strokeRect(16, 16, 480, 328);

      // Inner Decorative Thin Border
      ctx.strokeStyle = 'rgba(201, 162, 39, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(28, 28, 456, 304);

      // Corner Accents
      ctx.fillStyle = '#ff7a1a';
      ctx.fillRect(20, 20, 16, 16);
      ctx.fillRect(476, 20, 16, 16);
      ctx.fillRect(20, 324, 16, 16);
      ctx.fillRect(476, 324, 16, 16);

      // Genre Badge Pill
      ctx.fillStyle = '#c9a227';
      ctx.font = 'bold 20px "Noto Sans Devanagari", sans-serif';
      ctx.fillText(item.genreLabelMarathi, 44, 68);

      // Raga & Tala Tag
      ctx.fillStyle = '#f6bc55';
      ctx.font = '16px "Noto Sans Devanagari", sans-serif';
      ctx.fillText(`राग: ${item.raga.split(' ')[0]} | ${item.bpm} BPM`, 44, 96);

      // Title in Marathi
      ctx.fillStyle = '#fff8ec';
      ctx.font = 'bold 28px "Noto Sans Devanagari", serif';
      const maxTitleChars = 22;
      const displayTitle = item.titleMarathi.length > maxTitleChars
        ? item.titleMarathi.slice(0, maxTitleChars) + '...'
        : item.titleMarathi;
      ctx.fillText(displayTitle, 44, 150);

      // Artist / Saint Line
      ctx.fillStyle = '#e5d5be';
      ctx.font = 'italic 20px "Noto Sans Devanagari", sans-serif';
      ctx.fillText(`रचनाकार: ${item.artist}`, 44, 190);

      // Verse preview
      ctx.fillStyle = 'rgba(255, 248, 236, 0.75)';
      ctx.font = '18px "Noto Sans Devanagari", serif';
      const firstLine = item.sections[0]?.lines[0] || '';
      ctx.fillText(firstLine.slice(0, 34), 44, 240);

      // Bottom Bar with Accent
      ctx.fillStyle = '#c9a227';
      ctx.font = '15px "Noto Sans Devanagari", sans-serif';
      ctx.fillText(`छंद: ${item.rhymeScheme} | ${item.key} | ${item.timeSignature}`, 44, 305);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      // 3D Tablet Geometry with Thickness
      const tabletGeo = new THREE.BoxGeometry(2.4, 1.7, 0.06);
      const tabletMat = [
        new THREE.MeshStandardMaterial({ color: 0x3d1a12, roughness: 0.6 }), // right
        new THREE.MeshStandardMaterial({ color: 0x3d1a12, roughness: 0.6 }), // left
        new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.8 }), // top gold
        new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.8 }), // bottom gold
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4 }),    // front
        new THREE.MeshStandardMaterial({ color: 0x1f0b07, roughness: 0.7 }), // back
      ];

      const mesh = new THREE.Mesh(tabletGeo, tabletMat);
      mesh.position.set(x, 0, z);
      // Face toward center
      mesh.lookAt(0, 0, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { index: idx, item };

      // Acoustic Resonance Halo Ring underneath
      const ringGeo = new THREE.TorusGeometry(1.2, 0.03, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf6bc55,
        transparent: true,
        opacity: 0.5,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(x, -1.0, z);
      ringMesh.userData = { isPulseRing: true, baseBpm: item.bpm };
      platesGroup.add(ringMesh);

      platesGroup.add(mesh);
      plateMeshes.push(mesh);
    });

    // Raycasting for click interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(plateMeshes);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        if (clickedMesh.userData && typeof clickedMesh.userData.index === 'number') {
          setSelectedIndex(clickedMesh.userData.index);
          setInspectorOpen(true);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle orbital rotation if not reduced motion
      if (!prefersReducedMotion && platesGroupRef.current) {
        platesGroupRef.current.rotation.y = elapsed * 0.04;
        particles.rotation.y = elapsed * 0.02;
        particles.rotation.x = Math.sin(elapsed * 0.05) * 0.05;
      }

      // Pulse rings based on BPM
      platesGroup.children.forEach((child) => {
        if (child.userData?.isPulseRing) {
          const bpm = child.userData.baseBpm || 80;
          const frequency = (bpm / 60) * Math.PI;
          const scale = 1 + Math.sin(elapsed * frequency) * 0.12;
          child.scale.set(scale, scale, scale);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.dispose();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [viewMode, filteredItems, prefersReducedMotion]);

  // Smoothly rotate 3D view towards selected index
  React.useEffect(() => {
    if (viewMode !== '3d' || !platesGroupRef.current || filteredItems.length === 0) return;
    const targetAngle = -(selectedIndex / filteredItems.length) * Math.PI * 2;
    if (prefersReducedMotion) {
      platesGroupRef.current.rotation.y = targetAngle;
    }
  }, [selectedIndex, filteredItems, viewMode, prefersReducedMotion]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Escape') {
        setInspectorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems]);

  return (
    <section
      className={`relative rounded-2xl overflow-hidden border border-[var(--dp-rule)] bg-[#0d0a07] text-[#fff8ec] ${
        isStandalone ? 'min-h-[90vh]' : 'py-10'
      } ${className}`}
      aria-label="३D संगीत मंडप - पवित्र स्वर दर्शन"
    >
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src="/audio/regional_music_intelligence_summary.wav"
        preload="metadata"
        loop
        onEnded={() => setIsPlayingAudio(false)}
      />

      {/* ── Top Bar Controls & Genre Selector ── */}
      <div className="relative z-20 px-4 sm:px-8 pt-4 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(201,162,39,0.2)] bg-[#120e0a]/90 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c9a227] font-marathi">
            <Sparkles size={14} className="text-[#f6bc55]" />
            <span>डिजिटल पंढरपूर ३D व्हर्च्युअल मंदाकिनी</span>
            <span className="inline-block w-1 h-1 rounded-full bg-[#f6bc55]" />
            <span className="text-emerald-400 font-sans">२१ पवित्र रचना</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-marathi text-[#fff8ec] mt-0.5">
            ३D संगीत मंडप : पवित्र स्वर दर्शन
          </h2>
        </div>

        {/* View Mode & Audio Toolbar */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Audio Recitation Player Button */}
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-marathi font-medium border transition-all ${
              isPlayingAudio
                ? 'bg-[#ff7a1a] text-black border-[#ff7a1a] shadow-[0_0_15px_rgba(255,122,26,0.5)]'
                : 'bg-[#24170d] text-[#f6bc55] border-[#c9a227]/40 hover:border-[#c9a227]'
            }`}
            aria-label={isPlayingAudio ? 'ऑडिओ थांबवा' : 'ऑडिओ विवरण ऐका'}
          >
            {isPlayingAudio ? (
              <>
                <Pause size={13} />
                <span>स्वर चालू आहे</span>
                <span className="flex gap-0.5 items-end h-3 ml-1">
                  <span className="w-0.5 bg-black animate-[bounce_0.6s_infinite]" />
                  <span className="w-0.5 bg-black animate-[bounce_0.8s_infinite_0.2s]" />
                  <span className="w-0.5 bg-black animate-[bounce_0.5s_infinite_0.4s]" />
                </span>
              </>
            ) : (
              <>
                <Play size={13} />
                <span>ऑडिओ विवरण ऐका</span>
              </>
            )}
          </button>

          {/* 3D vs Grid Toggle */}
          <div className="flex bg-[#24170d] rounded-lg p-0.5 border border-[#c9a227]/30">
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-marathi transition-colors ${
                viewMode === '3d'
                  ? 'bg-[#c9a227] text-black font-semibold'
                  : 'text-[#e5d5be] hover:text-white'
              }`}
              aria-label="३D दर्शन मोड"
            >
              <Compass size={14} />
              <span>३D दर्शन</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-marathi transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#c9a227] text-black font-semibold'
                  : 'text-[#e5d5be] hover:text-white'
              }`}
              aria-label="यादी दर्शन मोड"
            >
              <List size={14} />
              <span>यादी दर्शन</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Genre Filter Pills ── */}
      <div className="relative z-20 px-4 sm:px-8 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2 border-b border-[rgba(201,162,39,0.15)] bg-[#0d0906]/95">
        {GENRE_TABS.map((tab) => {
          const isActive = selectedGenre === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedGenre(tab.id);
                setSelectedIndex(0);
              }}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-marathi transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#c9a227] text-black font-semibold shadow-[0_0_10px_rgba(201,162,39,0.4)]'
                  : 'bg-[#1a120b] text-[#d6c4a8] hover:bg-[#2a1d12] border border-[#c9a227]/20'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-black/20 text-black' : 'bg-[#3d2919] text-[#f6bc55]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main Viewport Container ── */}
      <div className="relative w-full h-[600px] lg:h-[680px]">
        {viewMode === '3d' ? (
          <>
            {/* Three.js Canvas Container */}
            <div
              ref={containerRef}
              className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
              tabIndex={0}
              role="region"
              aria-label="३D मंदिर संगीत चक्र. फिरवण्यासाठी माऊस ड्रॅग करा किंवा ॲरो की दाबा."
            />

            {/* Subtle 3D Navigation Guide Pill */}
            <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[var(--dp-rule)] text-[11px] text-[#e5d5be] font-marathi">
              <Compass size={12} className="text-[#f6bc55]" />
              <span>माऊसने फिरवा / ॲरो की द्वारे रचना बदला</span>
              <span className="text-[#c9a227]">
                ({selectedIndex + 1}/{filteredItems.length})
              </span>
            </div>
          </>
        ) : (
          /* 2D Accessible Grid View */
          <div className="w-full h-full overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#0a0806]">
            {filteredItems.map((item, idx) => {
              const isCurrent = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedIndex(idx);
                    setInspectorOpen(true);
                  }}
                  className={`p-5 rounded-xl cursor-pointer transition-all border ${
                    isCurrent
                      ? 'bg-[#22160d] border-[#c9a227] shadow-[0_0_20px_rgba(201,162,39,0.3)]'
                      : 'bg-[#150f0a] border-[#c9a227]/20 hover:border-[#c9a227]/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[#c9a227] font-semibold font-marathi">
                      {item.genreLabelMarathi}
                    </span>
                    <span className="text-xs text-[#a89279]">
                      {item.raga.split(' ')[0]} • {item.bpm} BPM
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-marathi text-[#fff8ec] mb-1 line-clamp-1">
                    {item.titleMarathi}
                  </h3>
                  <p className="text-xs text-[#d6c4a8] font-marathi mb-3">
                    {item.artist}
                  </p>
                  <p className="text-xs text-[#a89279] italic line-clamp-2 mb-3 font-serif">
                    {item.sections[0]?.lines[0] || item.lyricsText.slice(0, 80)}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(201,162,39,0.2)] text-[11px] text-[#f6bc55]">
                    <span>स्वरपट्टी: {item.key}</span>
                    <span className="font-semibold">तपशील पहा →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Sacred Manuscript Inspector Panel (Glassmorphism Modal) ── */}
        {inspectorOpen && activeComposition && (
          <aside
            className="absolute top-4 right-4 bottom-4 w-full max-w-[420px] rounded-xl z-30 bg-[#16100b]/95 backdrop-blur-xl border border-[#c9a227]/40 shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
            aria-label="निवडलेल्या रचनेचा संपूर्ण तपशील"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#c9a227]/30 flex items-start justify-between bg-[#22170f]/90">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#c9a227]/20 text-[#f6bc55] font-marathi">
                    {activeComposition.genreLabelMarathi}
                  </span>
                  <span className="text-[11px] text-[#c9a227] font-marathi">
                    {activeComposition.tradition}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-marathi text-[#fff8ec] leading-snug">
                  {activeComposition.titleMarathi}
                </h3>
                <p className="text-xs text-[#d6c4a8] font-marathi mt-0.5">
                  {activeComposition.artist}
                </p>
              </div>
              <button
                onClick={() => setInspectorOpen(false)}
                className="text-[#a89279] hover:text-[#fff8ec] p-1 rounded-md text-lg"
                aria-label="पॅनेल बंद करा"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {/* Musical Characteristics Badge Bar */}
              <div className="grid grid-cols-2 gap-2 bg-[#26190f] p-3 rounded-lg border border-[#c9a227]/20 text-xs">
                <div>
                  <span className="text-[10px] text-[#a89279] block">राग (Raga)</span>
                  <span className="font-bold text-[#f6bc55]">{activeComposition.raga}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#a89279] block">ताल (Tala)</span>
                  <span className="font-bold text-[#f6bc55]">{activeComposition.tala}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#a89279] block">गती (Tempo)</span>
                  <span className="font-bold text-[#f6bc55]">{activeComposition.bpm} BPM</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#a89279] block">स्वरपट्टी (Key)</span>
                  <span className="font-bold text-[#f6bc55]">{activeComposition.key} ({activeComposition.timeSignature})</span>
                </div>
              </div>

              {/* Chord Progression */}
              {activeComposition.chordProgression.length > 0 && (
                <div>
                  <span className="text-[11px] text-[#c9a227] font-semibold block mb-1.5 font-marathi">
                    स्वरसंगती (Harmonic Chord Progression):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeComposition.chordProgression.map((chord, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2.5 py-1 rounded bg-[#332014] border border-[#c9a227]/40 text-[#f6bc55] font-mono text-xs font-bold"
                      >
                        {chord}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Poetic & Metric Metrics */}
              <div className="flex items-center justify-between p-2.5 rounded bg-[#1c130b] border border-[#c9a227]/15 text-xs font-marathi">
                <div>
                  <span className="text-[10px] text-[#a89279] block">यमक रचना (Rhyme)</span>
                  <span className="font-semibold text-[#f6bc55]">{activeComposition.rhymeScheme}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#a89279] block">सरासरी अक्षर संख्या</span>
                  <span className="font-semibold text-[#f6bc55]">{activeComposition.avgSyllablesPerLine} अक्षर/ओळ</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#a89279] block">भाषा (Language)</span>
                  <span className="font-semibold text-[#f6bc55]">{activeComposition.languageLabel}</span>
                </div>
              </div>

              {/* Authentic Lyrics & Verses */}
              <div>
                <span className="text-xs text-[#c9a227] font-bold block mb-2 font-marathi">
                  पवित्र काव्य रचना (Authentic Verses):
                </span>
                <div className="space-y-3 bg-[#110c08] p-3.5 rounded-lg border border-[#c9a227]/20">
                  {activeComposition.sections.map((sec, sIdx) => (
                    <div key={sIdx} className="space-y-1">
                      <span className="text-[11px] font-bold text-[#ff7a1a] block font-marathi">
                        [{sec.header}]
                      </span>
                      {sec.lines.map((line, lIdx) => (
                        <p
                          key={lIdx}
                          className="text-sm font-serif text-[#fff8ec] leading-relaxed pl-2 border-l border-[#c9a227]/30"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Master Audio Performance Credential */}
              <div className="p-2.5 rounded bg-[#20140b] border border-[#c9a227]/20 text-xs font-marathi">
                <span className="text-[10px] text-[#c9a227] block font-semibold">
                  प्रसिद्ध ध्वनिमुद्रण व शास्त्रीय गायक:
                </span>
                <p className="text-[#e5d5be] mt-0.5">{activeComposition.performer}</p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-[#c9a227]/30 bg-[#160f09] flex items-center justify-between gap-2">
              <button
                onClick={toggleAudio}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#c9a227] text-black font-semibold text-xs font-marathi hover:bg-[#d8b032] transition-colors"
              >
                {isPlayingAudio ? <Pause size={13} /> : <Play size={13} />}
                <span>{isPlayingAudio ? 'थांबवा' : 'स्वर ऐका'}</span>
              </button>

              <Link
                href={`/abhang/${activeComposition.slug}`}
                className="flex items-center gap-1 text-xs text-[#f6bc55] hover:text-white font-marathi transition-colors"
              >
                <span>पूर्ण पृष्ठ पहा</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </aside>
        )}
      </div>

      {/* ── Bottom Carousel Switcher Strip ── */}
      <div className="px-4 sm:px-8 py-3 bg-[#120e0a] border-t border-[rgba(201,162,39,0.2)] flex items-center justify-between text-xs text-[#a89279] font-marathi">
        <div className="flex items-center gap-2">
          <span>सध्या निवडलेले:</span>
          <span className="text-[#f6bc55] font-semibold">{activeComposition.titleMarathi}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
            }
            className="px-2.5 py-1 rounded bg-[#24170d] hover:bg-[#382314] text-[#fff8ec] border border-[#c9a227]/30"
            aria-label="मागील रचना"
          >
            ← मागील
          </button>
          <span className="text-[#c9a227]">
            {selectedIndex + 1} / {filteredItems.length}
          </span>
          <button
            onClick={() => setSelectedIndex((prev) => (prev + 1) % filteredItems.length)}
            className="px-2.5 py-1 rounded bg-[#24170d] hover:bg-[#382314] text-[#fff8ec] border border-[#c9a227]/30"
            aria-label="पुढील रचना"
          >
            पुढील →
          </button>
        </div>
      </div>
    </section>
  );
}
