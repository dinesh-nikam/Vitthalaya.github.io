'use client';

import * as React from 'react';
import * as THREE from 'three';
import { Bell } from 'lucide-react';

export function BellViewer() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const bellGroupRef = React.useRef<THREE.Group | null>(null);
  const clapperRef = React.useRef<THREE.Mesh | null>(null);

  // Sound synthesis using Web Audio API
  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Base fundamental frequency of a bronze bell
      const baseFreq = 261.63; // Middle C

      // Overtones for a rich metallic, authentic bronze bell resonance
      const partials = [
        { ratio: 1.0, decay: 3.5, gain: 0.35 },  // Fundamental
        { ratio: 2.0, decay: 2.0, gain: 0.15 },  // Octave
        { ratio: 2.4, decay: 1.2, gain: 0.20 },  // Minor third overtone (characteristic of bells)
        { ratio: 3.0, decay: 0.8, gain: 0.10 },  // Fifth
        { ratio: 4.2, decay: 0.4, gain: 0.08 }   // High chime
      ];

      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * p.ratio, now);

        // Exponential decay envelope
        gainNode.gain.setValueAtTime(p.gain, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + p.decay + 0.1);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  };

  React.useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 250;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    const bellGroup = new THREE.Group();
    bellGroupRef.current = bellGroup;
    scene.add(bellGroup);

    // Bronze Material
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xc8963e,
      roughness: 0.35,
      metalness: 0.85,
      flatShading: false
    });

    const chainMat = new THREE.MeshStandardMaterial({
      color: 0x8a6524,
      roughness: 0.6,
      metalness: 0.7
    });

    // Construct Bell Body using Lathe
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, 1.8));
    points.push(new THREE.Vector2(0.4, 1.7));
    points.push(new THREE.Vector2(0.6, 1.5));
    points.push(new THREE.Vector2(0.7, 1.1));
    points.push(new THREE.Vector2(0.9, 0.5));
    points.push(new THREE.Vector2(1.2, 0.0));
    points.push(new THREE.Vector2(1.6, -0.6));
    points.push(new THREE.Vector2(1.8, -1.0));
    points.push(new THREE.Vector2(1.9, -1.2)); // Lip flare
    points.push(new THREE.Vector2(1.6, -1.2)); // Rim inner
    points.push(new THREE.Vector2(1.4, -0.8));
    points.push(new THREE.Vector2(1.0, 0.0));
    points.push(new THREE.Vector2(0.6, 0.8));
    points.push(new THREE.Vector2(0.3, 1.4));
    points.push(new THREE.Vector2(0, 1.5));

    const latheGeometry = new THREE.LatheGeometry(points, 32);
    const bellMesh = new THREE.Mesh(latheGeometry, bronzeMat);
    bellMesh.castShadow = true;
    bellMesh.receiveShadow = true;
    bellGroup.add(bellMesh);

    // Clapper Assembly
    const clapperGroup = new THREE.Group();
    clapperGroup.position.set(0, 1.2, 0);

    const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8);
    const rodMesh = new THREE.Mesh(rodGeo, chainMat);
    rodMesh.position.set(0, -1.0, 0);
    clapperGroup.add(rodMesh);

    const strikerGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const strikerMesh = new THREE.Mesh(strikerGeo, bronzeMat);
    strikerMesh.position.set(0, -2.1, 0);
    clapperRef.current = strikerMesh;
    clapperGroup.add(strikerMesh);

    bellGroup.add(clapperGroup);

    // Hanging loop & Chain
    const loopGeo = new THREE.TorusGeometry(0.25, 0.08, 8, 24);
    const loopMesh = new THREE.Mesh(loopGeo, bronzeMat);
    loopMesh.position.set(0, 2.0, 0);
    loopMesh.rotation.y = Math.PI / 2;
    bellGroup.add(loopMesh);

    const chainGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8);
    const chainMesh = new THREE.Mesh(chainGeo, chainMat);
    chainMesh.position.set(0, 2.9, 0);
    bellGroup.add(chainMesh);

    // Lighting
    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffaa44, 2.0);
    rimLight.position.set(-4, -1, -3);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    let animationId: number;
    let clock = new THREE.Clock();
    let swingVelocity = 0;
    let swingAngle = 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ring = () => {
      swingVelocity = 0.35;
      playChime();
    };

    const domElement = renderer.domElement;
    const onCanvasClick = () => ring();
    const onMouseEnter = () => {
      if (swingAngle < 0.05 && swingVelocity < 0.02) {
        swingVelocity = 0.12;
      }
    };

    domElement.addEventListener('click', onCanvasClick);
    domElement.addEventListener('mouseenter', onMouseEnter);

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (!prefersReducedMotion) {
        const dt = clock.getDelta();
        const damping = 0.96;
        const spring = 8.0;

        const force = -spring * swingAngle;
        swingVelocity += force * dt;
        swingVelocity *= damping;
        swingAngle += swingVelocity;

        bellGroup.rotation.z = swingAngle;
        clapperGroup.rotation.z = -swingAngle * 1.4;
        bellGroup.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.15;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      domElement.removeEventListener('click', onCanvasClick);
      domElement.removeEventListener('mouseenter', onMouseEnter);

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      chainGeo.dispose();
      loopGeo.dispose();
      latheGeometry.dispose();
      rodGeo.dispose();
      strikerGeo.dispose();
      bronzeMat.dispose();
      chainMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        ref={containerRef} 
        className="w-full h-[250px] flex items-center justify-center cursor-pointer motion-safe:active:scale-95 motion-safe:transition-transform motion-reduce:transition-none"
        aria-label="३डी घंटा स्पर्श आणि नाद अनुभव"
      />
      <button 
        type="button"
        onClick={playChime}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[var(--dp-rule)] bg-[var(--dp-ground-well)] hover:border-[var(--dp-gold)] text-xs font-semibold text-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Bell size={13} aria-hidden="true" />
        <span>घंटा नाद ऐका</span>
      </button>
    </div>
  );
}
export default BellViewer;
