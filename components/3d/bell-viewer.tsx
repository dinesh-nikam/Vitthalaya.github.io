'use client';

import * as React from 'react';
import * as THREE from 'three';

export function BellViewer() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const bellGroupRef = React.useRef<THREE.Group | null>(null);
  const clapperRef = React.useRef<THREE.Mesh | null>(null);

  // Sound synthesis using Web Audio API
  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Base fundamental frequency of a bronze bell
      const baseFreq = 261.63; // Middle C

      // Overtones for a rich metallic, authentic bronze bell resonance
      // Bell overtones are typically non-harmonic (non-integer multiples)
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
    } catch (e) {
      console.warn('Web Audio Context not allowed or initialized: ', e);
    }
  };

  React.useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 300;

    // 1. Scene Setup
    const scene = new THREE.Scene();

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.0);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xfff8ec, 0.55);
    scene.add(ambientLight);

    const goldLight = new THREE.DirectionalLight(0xffd700, 1.5); // Golden highlight
    goldLight.position.set(4, 3, 2);
    goldLight.castShadow = true;
    scene.add(goldLight);

    // 5. Build Bell Model
    const bellGroup = new THREE.Group();
    // Pivot points at the top of the chain (Y = 1.5)
    bellGroup.position.set(0, 1.5, 0);
    scene.add(bellGroup);
    bellGroupRef.current = bellGroup;

    // Materials
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xc8983c, // Rich bronze gold
      roughness: 0.28,
      metalness: 0.85
    });

    const chainMat = new THREE.MeshStandardMaterial({
      color: 0x907030, // Antique gold
      roughness: 0.4,
      metalness: 0.8
    });

    // 5a. Hanging Chain (Cylinder representing chain links)
    const chainGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8);
    const chain = new THREE.Mesh(chainGeo, chainMat);
    // Chain hangs from pivot (Y=0) down to bell top (Y=-0.6)
    chain.position.y = -0.6;
    bellGroup.add(chain);

    // Torus representing hanger loop at top of bell
    const loopGeo = new THREE.TorusGeometry(0.08, 0.02, 8, 16);
    const loop = new THREE.Mesh(loopGeo, chainMat);
    loop.position.y = -1.2;
    bellGroup.add(loop);

    // 5b. Bell Body (using Lathe Geometry)
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.2, 0));
    points.push(new THREE.Vector2(0.35, -0.15));
    points.push(new THREE.Vector2(0.38, -0.4));
    points.push(new THREE.Vector2(0.48, -0.75));
    points.push(new THREE.Vector2(0.65, -0.9)); // Flare rim outwards
    points.push(new THREE.Vector2(0.68, -0.95)); // Rim lip
    points.push(new THREE.Vector2(0.64, -0.98)); // Rim bottom
    points.push(new THREE.Vector2(0.58, -0.92)); // Inward curve
    points.push(new THREE.Vector2(0.0, -0.85)); // Closed center

    const latheGeometry = new THREE.LatheGeometry(points, 32);
    const bellBowl = new THREE.Mesh(latheGeometry, bronzeMat);
    // Position lath so it aligns correctly under loop (centered around Y = -2.0)
    bellBowl.position.y = -1.2;
    bellBowl.castShadow = true;
    bellBowl.receiveShadow = true;
    bellGroup.add(bellBowl);

    // 5c. Clapper (Striker ball inside bell)
    const clapperGroup = new THREE.Group();
    clapperGroup.position.set(0, -2.05, 0); // Center of clapper rod
    bellGroup.add(clapperGroup);

    const rodGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.35, 8);
    const rod = new THREE.Mesh(rodGeo, chainMat);
    rod.position.y = 0.15;
    clapperGroup.add(rod);

    const strikerGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const clapper = new THREE.Mesh(strikerGeo, bronzeMat);
    clapper.position.y = 0;
    clapperGroup.add(clapper);
    clapperRef.current = clapper;

    // 6. Damped Harmonic Swing Physics
    let swingAngle = 0;
    let swingVelocity = 0;
    let swingAcceleration = 0;
    
    // Physics constants
    const gravity = 9.8;
    const damping = 0.02; // Slows down over time
    const restLength = 1.5; // distance from top pivot

    let isTriggered = false;

    // Swing trigger function
    const triggerSwing = () => {
      // Add a sudden impulse (push the bell)
      swingVelocity = 12.0; // Angled velocity kick
      playChime();
    };

    // 7. Event Listeners for Interaction
    const onCanvasClick = () => {
      triggerSwing();
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('click', onCanvasClick);
    
    // Mouseenter hover trigger
    const onMouseEnter = () => {
      triggerSwing();
    };
    domElement.addEventListener('mouseenter', onMouseEnter);

    // 8. Animation Loop
    let clock = new THREE.Clock();
    let animationId: number;
    let lastTime = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const currentTime = clock.getElapsedTime();
      const dt = Math.min(currentTime - lastTime, 0.1); // cap delta time
      lastTime = currentTime;

      // Update swing pendulum physics using Euler integration
      // Theta'' = - (g/L) * sin(Theta) - damping * Theta'
      swingAcceleration = -(gravity / restLength) * Math.sin(swingAngle) - damping * swingVelocity;
      swingVelocity += swingAcceleration * dt;
      swingAngle += swingVelocity * dt;

      // Apply swing rotation around Z-axis
      bellGroup.rotation.z = swingAngle;

      // Dynamic clapper lag (clapper swings slightly out of phase with bell body!)
      clapperGroup.rotation.z = -swingAngle * 0.45;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
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
    <div className="flex flex-col items-center gap-2">
      <div 
        ref={containerRef} 
        className="w-full h-[250px] flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-200"
        aria-label="३डी घंटा स्पर्श आणि नाद अनुभव"
      />
      <button 
        onClick={playChime}
        className="px-4 py-1.5 rounded-full border border-saffron/20 bg-saffron/5 hover:bg-saffron/10 text-xs font-semibold text-saffron transition-all"
      >
        घंटा नाद ऐका 🔔
      </button>
    </div>
  );
}
export default BellViewer;
