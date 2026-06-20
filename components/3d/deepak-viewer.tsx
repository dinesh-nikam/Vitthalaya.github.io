'use client';

import * as React from 'react';
import * as THREE from 'three';

export function DeepakViewer() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 300;

    // 1. Scene Setup
    const scene = new THREE.Scene();

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4, 8);
    camera.lookAt(0, 0.5, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // 4. Construct Diya Clay Bowl (using Lathe Geometry)
    const points: THREE.Vector2[] = [];
    // Define the outline curve of the diya bowl (x, y)
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(1.2, 0));
    points.push(new THREE.Vector2(1.5, 0.3));
    points.push(new THREE.Vector2(1.6, 0.6));
    points.push(new THREE.Vector2(1.3, 0.8));
    points.push(new THREE.Vector2(1.1, 0.7)); // lip curving in
    points.push(new THREE.Vector2(0.9, 0.5));
    points.push(new THREE.Vector2(0, 0.3));

    const latheGeometry = new THREE.LatheGeometry(points, 32);
    const clayMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a4a2a, // Clay brown
      roughness: 0.85,
      metalness: 0.1,
      flatShading: false
    });
    const diyaBowl = new THREE.Mesh(latheGeometry, clayMaterial);
    diyaBowl.castShadow = true;
    diyaBowl.receiveShadow = true;
    scene.add(diyaBowl);

    // 5. Add oil inside the diya (a flat circle mesh)
    const oilGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32);
    const oilMat = new THREE.MeshStandardMaterial({
      color: 0x4a3b1a, // Dark golden oil
      roughness: 0.1,
      metalness: 0.8
    });
    const oil = new THREE.Mesh(oilGeo, oilMat);
    oil.position.y = 0.45;
    scene.add(oil);

    // 6. Wick (cotton string protruding)
    const wickGeo = new THREE.ConeGeometry(0.08, 0.5, 8);
    const wickMat = new THREE.MeshStandardMaterial({
      color: 0x221100, // Blackened tip
      roughness: 0.9
    });
    const wick = new THREE.Mesh(wickGeo, wickMat);
    wick.position.set(0, 0.6, 0.8);
    wick.rotation.x = Math.PI / 6; // Angled forward
    scene.add(wick);

    // 7. Flame (Mesh with glowing material)
    // Custom shape: double cone squashed
    const flameGeo = new THREE.ConeGeometry(0.3, 1.0, 16);
    flameGeo.translate(0, 0.5, 0); // Shift pivot to base
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0.75, 0.9);
    flame.rotation.x = Math.PI / 12; // tilt with wick
    scene.add(flame);

    // Inner glowing core
    const innerFlameGeo = new THREE.ConeGeometry(0.15, 0.6, 16);
    innerFlameGeo.translate(0, 0.3, 0);
    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    });
    const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
    flame.add(innerFlame);

    // 8. Flame Flickering Light Source
    const flameLight = new THREE.PointLight(0xff7a00, 2.5, 12);
    flameLight.position.set(0, 1.2, 1.1);
    flameLight.castShadow = true;
    scene.add(flameLight);

    // Ambient background temple light
    const ambientLight = new THREE.AmbientLight(0xfff8ec, 0.35);
    scene.add(ambientLight);

    // 9. Particle System for floating embers (spiritual sparks)
    const particleCount = 15;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: number[] = [];
    const life: number[] = [];

    // Initialize particles near the flame tip
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = 1.2 + Math.random() * 0.5;
      positions[i * 3 + 2] = 0.9 + (Math.random() - 0.5) * 0.2;

      // Random velocities rising upwards
      velocities.push((Math.random() - 0.5) * 0.01); // dx
      velocities.push(0.015 + Math.random() * 0.015); // dy
      velocities.push((Math.random() - 0.5) * 0.01); // dz
      life.push(Math.random()); // initial life index
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xff9900,
      size: 0.12,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const embers = new THREE.Points(particleGeo, particleMat);
    scene.add(embers);

    // 10. Animation Loop
    let clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Gentle diya rotation to see depth
      diyaBowl.rotation.y = Math.sin(elapsedTime * 0.2) * 0.25;
      oil.rotation.y = diyaBowl.rotation.y;
      wick.rotation.y = diyaBowl.rotation.y;

      // Flame physics (flicker and shape distortion)
      const scaleX = 1 + Math.sin(elapsedTime * 25) * 0.08;
      const scaleY = 1 + Math.cos(elapsedTime * 18) * 0.12;
      const scaleZ = 1 + Math.sin(elapsedTime * 22) * 0.08;
      flame.scale.set(scaleX, scaleY, scaleZ);

      // Organic wind wave tilt on the flame
      flame.rotation.z = Math.sin(elapsedTime * 8) * 0.05;

      // Light flicker intensity
      flameLight.intensity = 2.0 + Math.sin(elapsedTime * 35) * 0.35 + Math.random() * 0.15;

      // Update particle embers positions
      const positionsArray = embers.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        // Reset particles that die (rise too high)
        if (positionsArray[i * 3 + 1] > 3.0) {
          positionsArray[i * 3] = flame.position.x + (Math.random() - 0.5) * 0.1;
          positionsArray[i * 3 + 1] = flame.position.y + 0.5;
          positionsArray[i * 3 + 2] = flame.position.z + (Math.random() - 0.5) * 0.1;
          life[i] = 0;
        } else {
          // Move particles
          positionsArray[i * 3] += velocities[i * 3];
          positionsArray[i * 3 + 1] += velocities[i * 3 + 1];
          positionsArray[i * 3 + 2] += velocities[i * 3 + 2];
          life[i] += 0.01;
        }
      }
      embers.geometry.attributes.position.needsUpdate = true;

      // Render scene
      renderer.render(scene, camera);
    };

    animate();

    // 11. Responsive Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      latheGeometry.dispose();
      clayMaterial.dispose();
      oilGeo.dispose();
      oilMat.dispose();
      wickGeo.dispose();
      wickMat.dispose();
      flameGeo.dispose();
      flameMat.dispose();
      innerFlameGeo.dispose();
      innerFlameMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[250px] sm:min-h-[300px] flex items-center justify-center cursor-grab active:cursor-grabbing"
      aria-label="३डी सजीव दीपक अनुभव"
    />
  );
}
