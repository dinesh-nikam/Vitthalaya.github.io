'use client';

import * as React from 'react';
import * as THREE from 'three';

export function PandharpurScene({ progress }: { progress: number }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const sceneRef = React.useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    murti: THREE.Group;
    aura: THREE.Points;
    river: THREE.Mesh;
    flag: THREE.Mesh;
    frame: number;
  } | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.8, 7.4);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffd9ad, 0.85));
    const sun = new THREE.DirectionalLight(0xffa133, 3);
    sun.position.set(4, 5, 4);
    scene.add(sun);
    const templeGlow = new THREE.PointLight(0xffb13b, 8, 12);
    templeGlow.position.set(0, 1.3, 1.2);
    scene.add(templeGlow);

    const murti = createVitthalMurti();
    murti.position.set(0, -0.7, 0);
    scene.add(murti);

    const river = createRiver();
    river.position.set(0, -1.65, 1.5);
    scene.add(river);

    const flag = createFlag();
    flag.position.set(1.65, 1.9, -0.5);
    scene.add(flag);

    const aura = createAura();
    scene.add(aura);

    let clock = new THREE.Clock();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = () => {
      const time = clock.getElapsedTime();
      if (!prefersReducedMotion) {
        murti.position.y = -0.72 + Math.sin(time * 1.35) * 0.035;
        murti.rotation.y = Math.sin(time * 0.42) * 0.12;
        river.rotation.z = Math.sin(time * 0.8) * 0.015;
        flag.rotation.z = Math.sin(time * 4.5) * 0.18;
        aura.rotation.y += 0.0018;
      } else {
        murti.position.y = -0.72;
        murti.rotation.y = 0;
        river.rotation.z = 0;
        flag.rotation.z = 0;
      }
      camera.position.z = 7.4 - progress * 1.7;
      camera.position.y = 1.8 + progress * 0.35;
      camera.lookAt(0, 0.2, 0);
      renderer.render(scene, camera);
      const frame = requestAnimationFrame(animate);
      if (sceneRef.current) sceneRef.current.frame = frame;
    };

    sceneRef.current = { renderer, camera, scene, murti, aura, river, flag, frame: requestAnimationFrame(animate) };

    const resize = () => {
      if (!container || !sceneRef.current) return;
      sceneRef.current.camera.aspect = container.clientWidth / container.clientHeight;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (!sceneRef.current) return;
      cancelAnimationFrame(sceneRef.current.frame);
      sceneRef.current.scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      sceneRef.current.renderer.dispose();
      container.removeChild(sceneRef.current.renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="pandharpur-scene" aria-hidden="true" />;
}

function createVitthalMurti() {
  const group = new THREE.Group();
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.72, metalness: 0.12 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf4b84a, roughness: 0.28, metalness: 0.65 });
  const saffron = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5, metalness: 0.08 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.55, 12, 24), darkStone);
  body.position.y = 0.25;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), darkStone);
  head.position.y = 1.42;
  group.add(head);

  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 5), gold);
  crown.position.y = 1.98;
  group.add(crown);

  const dhoti = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.74, 0.55, 32), saffron);
  dhoti.position.y = -0.55;
  group.add(dhoti);

  const armGeometry = new THREE.CapsuleGeometry(0.11, 1.25, 8, 16);
  const leftArm = new THREE.Mesh(armGeometry, darkStone);
  leftArm.position.set(-0.78, 0.48, 0);
  leftArm.rotation.z = -Math.PI / 2.8;
  group.add(leftArm);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.78;
  rightArm.rotation.z = Math.PI / 2.8;
  group.add(rightArm);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.025, 12, 96),
    new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.78 })
  );
  halo.position.y = 1.35;
  halo.position.z = -0.18;
  group.add(halo);

  return group;
}

function createRiver() {
  const geometry = new THREE.PlaneGeometry(9, 2.2, 24, 4);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1b6e8c,
    roughness: 0.2,
    metalness: 0.72,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
  });
  const river = new THREE.Mesh(geometry, material);
  river.rotation.x = -Math.PI / 2.25;
  return river;
}

function createFlag() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.72, -0.16);
  shape.lineTo(0, -0.35);
  shape.lineTo(0, 0);
  return new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({ color: 0xff7a1a, side: THREE.DoubleSide, roughness: 0.48 })
  );
}

function createAura() {
  const count = 520;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = 1.25 + (i % 29) * 0.038;
    const angle = i * 2.399963229728653;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = -0.2 + ((i % 47) / 47) * 3;
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xffc76a, size: 0.035, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending })
  );
}
