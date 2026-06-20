'use client';

import * as React from 'react';
import * as THREE from 'three';

interface PalkhiViewerProps {
  scrollProgress?: number; // Value between 0 and 1 representing section scroll progress
}

export function PalkhiViewer({ scrollProgress = 0 }: PalkhiViewerProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const palkhiGroupRef = React.useRef<THREE.Group | null>(null);
  const petalsRef = React.useRef<THREE.Points | null>(null);

  // Sync scroll progress to group position and rotation
  React.useEffect(() => {
    if (!palkhiGroupRef.current) return;
    
    const group = palkhiGroupRef.current;
    // Map scroll progress (0 to 1) to horizontal position and a slight bobbing sway
    group.position.x = (scrollProgress - 0.5) * 4; // Moves from -2 to +2
    group.position.y = Math.sin(scrollProgress * Math.PI * 4) * 0.15; // Bobbing up and down
    group.rotation.y = (scrollProgress - 0.5) * 0.5 + Math.sin(scrollProgress * Math.PI * 8) * 0.05; // Slight yaw rotations
  }, [scrollProgress]);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 300;

    // 1. Scene Setup
    const scene = new THREE.Scene();

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 6);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xfff8ec, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffd700, 1.2); // Warm golden light
    dirLight.position.set(5, 5, 2);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 5. Build Palkhi Model Group
    const palkhiGroup = new THREE.Group();
    scene.add(palkhiGroup);
    palkhiGroupRef.current = palkhiGroup;

    // Materials
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c3317, // Mahogany wood
      roughness: 0.6,
      metalness: 0.2
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Temple Gold
      roughness: 0.2,
      metalness: 0.8
    });

    const saffronMat = new THREE.MeshStandardMaterial({
      color: 0xff7a1a, // Saffron
      roughness: 0.7,
      metalness: 0.1
    });

    // 5a. Carrying Poles (Long cylinders)
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 4.0, 8);
    poleGeo.rotateZ(Math.PI / 2); // Lay horizontal along X-axis

    const pole1 = new THREE.Mesh(poleGeo, woodMat);
    pole1.position.z = 0.4;
    pole1.castShadow = true;
    palkhiGroup.add(pole1);

    const pole2 = new THREE.Mesh(poleGeo, woodMat);
    pole2.position.z = -0.4;
    pole2.castShadow = true;
    palkhiGroup.add(pole2);

    // 5b. Base Platform
    const baseGeo = new THREE.BoxGeometry(1.6, 0.08, 0.85);
    const base = new THREE.Mesh(baseGeo, woodMat);
    base.position.y = 0.05;
    base.receiveShadow = true;
    palkhiGroup.add(base);

    // 5c. Gold Support pillars (4 corners)
    const pillarGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
    const pillars: THREE.Mesh[] = [];
    const positions = [
      [-0.7, 0.3, 0.35],
      [0.7, 0.3, 0.35],
      [-0.7, 0.3, -0.35],
      [0.7, 0.3, -0.35]
    ];

    positions.forEach((pos) => {
      const pillar = new THREE.Mesh(pillarGeo, goldMat);
      pillar.position.set(pos[0], pos[1], pos[2]);
      pillar.castShadow = true;
      palkhiGroup.add(pillar);
      pillars.push(pillar);
    });

    // 5d. Saffron Canopy (Dome ceiling)
    const domeGeo = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, saffronMat);
    dome.position.set(0, 0.6, 0);
    dome.scale.set(1.5, 0.6, 0.85);
    dome.castShadow = true;
    palkhiGroup.add(dome);

    // Gold Kalash on top of dome
    const kalashGeo = new THREE.ConeGeometry(0.08, 0.25, 8);
    const kalash = new THREE.Mesh(kalashGeo, goldMat);
    kalash.position.set(0, 0.95, 0);
    palkhiGroup.add(kalash);

    // 5e. Sacred Padukas inside (two golden footprints on base)
    const padukaGeo = new THREE.BoxGeometry(0.12, 0.03, 0.25);
    const paduka1 = new THREE.Mesh(padukaGeo, goldMat);
    paduka1.position.set(-0.1, 0.1, 0);
    palkhiGroup.add(paduka1);

    const paduka2 = new THREE.Mesh(padukaGeo, goldMat);
    paduka2.position.set(0.1, 0.1, 0);
    palkhiGroup.add(paduka2);

    // 6. Floating Flower Petal Embers in background
    const petalCount = 30;
    const petalGeo = new THREE.BufferGeometry();
    const petalPositions = new Float32Array(petalCount * 3);
    const petalVelocities: number[] = [];

    for (let i = 0; i < petalCount; i++) {
      petalPositions[i * 3] = (Math.random() - 0.5) * 5;
      petalPositions[i * 3 + 1] = 1.0 + Math.random() * 2;
      petalPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      // Drift slightly leftwards/downwards
      petalVelocities.push(-0.005 - Math.random() * 0.01); // dx
      petalVelocities.push(-0.01 - Math.random() * 0.01); // dy
      petalVelocities.push((Math.random() - 0.5) * 0.005); // dz
    }

    petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPositions, 3));
    const petalMat = new THREE.PointsMaterial({
      color: 0xffa500, // Marigold Orange
      size: 0.1,
      transparent: true,
      opacity: 0.75
    });
    const petals = new THREE.Points(petalGeo, petalMat);
    scene.add(petals);
    petalsRef.current = petals;

    // 7. Animation Loop
    let clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Gentle continuous rotation when not scrolled to keep view dynamic
      if (scrollProgress === 0) {
        palkhiGroup.rotation.y = elapsedTime * 0.15;
        palkhiGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.08;
      }

      // Animate background marigold petals
      const posArray = petals.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < petalCount; i++) {
        // Apply velocity
        posArray[i * 3] += petalVelocities[i * 3];
        posArray[i * 3 + 1] += petalVelocities[i * 3 + 1];
        posArray[i * 3 + 2] += petalVelocities[i * 3 + 2];

        // Reset if too low or out of bounds
        if (posArray[i * 3 + 1] < -2.0) {
          posArray[i * 3] = 2.5 + Math.random() * 2;
          posArray[i * 3 + 1] = 1.5 + Math.random() * 1.5;
          posArray[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
      }
      petals.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Handler
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
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      poleGeo.dispose();
      baseGeo.dispose();
      pillarGeo.dispose();
      domeGeo.dispose();
      kalashGeo.dispose();
      padukaGeo.dispose();
      woodMat.dispose();
      goldMat.dispose();
      saffronMat.dispose();
      petalGeo.dispose();
      petalMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[300px] flex items-center justify-center pointer-events-none"
      aria-label="३डी पालखी अनुभव"
    />
  );
}
