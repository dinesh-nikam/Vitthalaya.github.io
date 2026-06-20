'use client';

import * as React from 'react';
import * as THREE from 'three';

export function TempleViewer() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const templeGroupRef = React.useRef<THREE.Group | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 300;

    // 1. Scene Setup
    const scene = new THREE.Scene();

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3, 7);
    camera.lookAt(0, 0.8, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xfff8ec, 0.4);
    scene.add(ambientLight);

    // Spotlight representing warm temple oil lamp glow from inside/front
    const spotLight = new THREE.SpotLight(0xffaa44, 2.5, 15, Math.PI / 4, 0.5, 1);
    spotLight.position.set(3, 4, 5);
    spotLight.castShadow = true;
    scene.add(spotLight);

    // Soft moonlight from the top back
    const moonLight = new THREE.DirectionalLight(0x7ec0ee, 0.8);
    moonLight.position.set(-4, 5, -3);
    scene.add(moonLight);

    // 5. Build Temple Group
    const templeGroup = new THREE.Group();
    scene.add(templeGroup);
    templeGroupRef.current = templeGroup;

    // Materials
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a46, // Dark temple stone
      roughness: 0.9,
      metalness: 0.1
    });

    const innerStoneMat = new THREE.MeshStandardMaterial({
      color: 0x2e2e2c, // Darker stone for depth
      roughness: 0.95
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xe8b44d, // Temple Gold
      roughness: 0.25,
      metalness: 0.8
    });

    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xff7a00, // Bhagwa Orange
      roughness: 0.6,
      side: THREE.DoubleSide
    });

    // 5a. Ground Base
    const baseGeo = new THREE.BoxGeometry(2.5, 0.15, 2.5);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.receiveShadow = true;
    templeGroup.add(base);

    // 5b. Inner Sanctum Walls (Garbhagriha)
    const sanctumGeo = new THREE.BoxGeometry(1.6, 1.0, 1.6);
    const sanctum = new THREE.Mesh(sanctumGeo, innerStoneMat);
    sanctum.position.y = 0.5;
    sanctum.castShadow = true;
    templeGroup.add(sanctum);

    // 5c. Stepped Spire (Shikhara - Stacked stone towers)
    const spireLayers = 4;
    const spireMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < spireLayers; i++) {
      const layerSize = 1.4 - i * 0.3; // Shrinks as it goes up
      const layerHeight = 0.35;
      const layerGeo = new THREE.BoxGeometry(layerSize, layerHeight, layerSize);
      const layerMesh = new THREE.Mesh(layerGeo, stoneMat);
      layerMesh.position.y = 1.0 + i * layerHeight + layerHeight / 2;
      layerMesh.castShadow = true;
      templeGroup.add(layerMesh);
      spireMeshes.push(layerMesh);
    }

    // 5d. Dome and Kalash (Gold dome on top of spire)
    const topSpireY = 1.0 + spireLayers * 0.35;
    const domeGeo = new THREE.SphereGeometry(0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, goldMat);
    dome.position.set(0, topSpireY, 0);
    dome.scale.y = 0.6;
    templeGroup.add(dome);

    const kalashGeo = new THREE.ConeGeometry(0.06, 0.25, 8);
    const kalash = new THREE.Mesh(kalashGeo, goldMat);
    kalash.position.set(0, topSpireY + 0.15, 0);
    templeGroup.add(kalash);

    // 5e. Columns (Portico columns in front)
    const columnGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8);
    const columns: THREE.Mesh[] = [];
    const colPositions = [
      [0.6, 0.45, 0.9],
      [-0.6, 0.45, 0.9],
      [0.2, 0.45, 1.1],
      [-0.2, 0.45, 1.1]
    ];
    colPositions.forEach((pos) => {
      const col = new THREE.Mesh(columnGeo, stoneMat);
      col.position.set(pos[0], pos[1], pos[2]);
      col.castShadow = true;
      templeGroup.add(col);
      columns.push(col);
    });

    // Portico Roof slab
    const roofGeo = new THREE.BoxGeometry(1.5, 0.1, 0.6);
    const roof = new THREE.Mesh(roofGeo, stoneMat);
    roof.position.set(0, 0.95, 0.95);
    roof.castShadow = true;
    templeGroup.add(roof);

    // 5f. Saffron Flag on Kalash
    const flagPoleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 8);
    const flagPole = new THREE.Mesh(flagPoleGeo, goldMat);
    flagPole.position.set(0.05, topSpireY + 0.35, 0);
    templeGroup.add(flagPole);

    // Flag fabric (triangular shape)
    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0);
    flagShape.lineTo(0.35, -0.12);
    flagShape.lineTo(0, -0.24);
    flagShape.lineTo(0, 0);
    const flagGeo = new THREE.ShapeGeometry(flagShape);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.05, topSpireY + 0.6, 0);
    templeGroup.add(flag);

    // 6. Interactive Drag Controls (Manual Orbit)
    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMouseX;
      const deltaY = e.clientY - previousMouseY;

      templeGroup.rotation.y += deltaX * 0.007;
      templeGroup.rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 4, templeGroup.rotation.x + deltaY * 0.007));

      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Mobile touch support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMouseX = e.touches[0].clientX;
        previousMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMouseX;
      const deltaY = e.touches[0].clientY - previousMouseY;

      templeGroup.rotation.y += deltaX * 0.007;
      templeGroup.rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 4, templeGroup.rotation.x + deltaY * 0.007));

      previousMouseX = e.touches[0].clientX;
      previousMouseY = e.touches[0].clientY;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('touchstart', onTouchStart);
    domElement.addEventListener('touchmove', onTouchMove);
    domElement.addEventListener('touchend', onMouseUp);

    // 7. Animation Loop
    let clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // If the user is not dragging, rotate the temple very slowly
      if (!isDragging) {
        templeGroup.rotation.y += 0.003;
      }

      // Waving flag effect (waving the vertexes/skewing or simple sine wave rotation)
      flag.rotation.y = Math.sin(elapsedTime * 6) * 0.15;
      flag.scale.x = 1.0 + Math.sin(elapsedTime * 8) * 0.05;

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
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('touchstart', onTouchStart);
      domElement.removeEventListener('touchmove', onTouchMove);
      domElement.removeEventListener('touchend', onMouseUp);

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      baseGeo.dispose();
      sanctumGeo.dispose();
      domeGeo.dispose();
      kalashGeo.dispose();
      columnGeo.dispose();
      roofGeo.dispose();
      flagPoleGeo.dispose();
      flagGeo.dispose();
      spireMeshes.forEach((mesh) => mesh.geometry.dispose());
      stoneMat.dispose();
      innerStoneMat.dispose();
      goldMat.dispose();
      flagMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[300px] flex items-center justify-center cursor-grab active:cursor-grabbing"
      aria-label="३डी देवस्थान प्रदर्शन (टिल्ट आणि रोटेट करण्यासाठी ड्रॅग करा)"
    />
  );
}
export default TempleViewer;
