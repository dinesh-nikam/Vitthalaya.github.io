'use client';

import * as React from 'react';
import * as THREE from 'three';

export function TulsiViewer() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 300;

    // 1. Scene Setup
    const scene = new THREE.Scene();

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.8, 5.5);
    camera.lookAt(0, 0.8, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xfff8ec, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffd8b3, 1.2); // Warm sunlight
    sunLight.position.set(4, 5, 3);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // 5. Build Tulsi Vrindavan
    const vrindavanGroup = new THREE.Group();
    scene.add(vrindavanGroup);

    // Materials
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0x9e3f3f, // Terracotta red clay
      roughness: 0.8,
      metalness: 0.1
    });

    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x3d271d, // Dark fertile soil
      roughness: 0.95
    });

    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x5a483a, // Woody stem
      roughness: 0.9
    });

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x2e6b3e, // Tulsi Green
      roughness: 0.6,
      side: THREE.DoubleSide
    });

    // 5a. Vrindavan Pedestal (Octagonal base)
    // Cylinder with 8 radial segments makes an octagon!
    const baseGeo = new THREE.CylinderGeometry(0.7, 0.8, 1.2, 8);
    const base = new THREE.Mesh(baseGeo, clayMat);
    base.position.y = 0.6;
    base.castShadow = true;
    base.receiveShadow = true;
    vrindavanGroup.add(base);

    // Moldings (rims at top and bottom)
    const rimTopGeo = new THREE.CylinderGeometry(0.78, 0.78, 0.1, 8);
    const rimTop = new THREE.Mesh(rimTopGeo, clayMat);
    rimTop.position.y = 1.15;
    rimTop.castShadow = true;
    vrindavanGroup.add(rimTop);

    const rimBotGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.1, 8);
    const rimBot = new THREE.Mesh(rimBotGeo, clayMat);
    rimBot.position.y = 0.05;
    rimBot.castShadow = true;
    vrindavanGroup.add(rimBot);

    // 5b. Soil Bed (placed in top opening)
    const soilGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.05, 8);
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 1.18;
    vrindavanGroup.add(soil);

    // 5c. Tulsi Plant Stems & Leaves
    const plantGroup = new THREE.Group();
    plantGroup.position.set(0, 1.2, 0); // Center on soil
    vrindavanGroup.add(plantGroup);

    // Stems (Main stem and 3 branch groups)
    const mainStemGeo = new THREE.CylinderGeometry(0.02, 0.035, 0.8, 8);
    mainStemGeo.translate(0, 0.4, 0); // Offset pivot to base
    const mainStem = new THREE.Mesh(mainStemGeo, stemMat);
    mainStem.castShadow = true;
    plantGroup.add(mainStem);

    // Sub-branch nodes for animating wind sway
    const branches: THREE.Group[] = [];

    const createBranch = (angleY: number, tilt: number, scale = 1) => {
      const branchGroup = new THREE.Group();
      branchGroup.position.set(0, 0.35, 0);
      branchGroup.rotation.y = angleY;
      branchGroup.rotation.z = tilt;
      branchGroup.scale.set(scale, scale, scale);
      
      // Branch woody stem
      const branchStemGeo = new THREE.CylinderGeometry(0.012, 0.02, 0.5, 8);
      branchStemGeo.translate(0, 0.25, 0);
      const branchStem = new THREE.Mesh(branchStemGeo, stemMat);
      branchGroup.add(branchStem);

      // Add leaf meshes along the branch stem
      const leafGeo = new THREE.ConeGeometry(0.07, 0.18, 4);
      leafGeo.rotateX(Math.PI / 2); // Lay leaf flat along Z
      leafGeo.scale(1.2, 0.1, 1.0); // Squash thickness, make leaf shape

      const leafPositions = [
        [0, 0.15, 0.06, 0.3],
        [0.05, 0.25, 0.05, 0.5],
        [-0.05, 0.25, -0.05, -0.5],
        [0, 0.35, 0.08, 0.2],
        [0.06, 0.42, -0.04, -0.4],
        [-0.06, 0.42, 0.04, 0.4],
        [0, 0.5, 0.1, 0]
      ];

      leafPositions.forEach((pos) => {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(pos[0], pos[1], pos[2]);
        leaf.rotation.y = pos[3];
        leaf.rotation.x = Math.PI / 4 + Math.random() * 0.2; // Leaf tilt
        leaf.castShadow = true;
        branchGroup.add(leaf);
      });

      plantGroup.add(branchGroup);
      branches.push(branchGroup);
    };

    // Construct 4 branches growing in different directions
    createBranch(0, 0.4, 0.95);
    createBranch(Math.PI / 2, 0.35, 0.9);
    createBranch(Math.PI, 0.45, 1.0);
    createBranch(-Math.PI / 2, 0.38, 0.85);

    // Add leaves directly to top of main stem
    const topLeafGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
    topLeafGeo.rotateX(Math.PI / 2);
    topLeafGeo.scale(1.2, 0.1, 1.0);
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(topLeafGeo, leafMat);
      leaf.position.set(0, 0.75, 0);
      leaf.rotation.y = (i * Math.PI) / 2;
      leaf.rotation.x = 0.2;
      plantGroup.add(leaf);
    }

    // 6. Animation Loop
    let clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Vrindavan slow base spin
      vrindavanGroup.rotation.y = elapsedTime * 0.12;

      // Simulated wind swaying the branches at slightly different rates
      branches.forEach((branch, idx) => {
        const windSpeed = 3.5;
        const windIntensity = 0.04;
        // Sway branch rotation dynamically using offset sines
        branch.rotation.z += Math.sin(elapsedTime * windSpeed + idx) * windIntensity * 0.01;
        branch.rotation.x += Math.cos(elapsedTime * windSpeed * 0.9 + idx) * windIntensity * 0.01;
      });

      // Subtle breath sway on the main plant group
      plantGroup.rotation.z = Math.sin(elapsedTime * 2.0) * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize Handler
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
      baseGeo.dispose();
      rimTopGeo.dispose();
      rimBotGeo.dispose();
      soilGeo.dispose();
      mainStemGeo.dispose();
      clayMat.dispose();
      soilMat.dispose();
      stemMat.dispose();
      leafMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[300px] flex items-center justify-center pointer-events-none"
      aria-label="३डी सजीव तुळशी वृंदावन"
    />
  );
}
export default TulsiViewer;
