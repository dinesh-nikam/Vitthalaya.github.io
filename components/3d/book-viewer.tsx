'use client';

import * as React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface BookViewer3DProps {
  titleMarathi: string;
  titleEnglish?: string;
  coverColor?: string;
  pageCount?: number;
  accentColor?: string;
}

/**
 * 3D Book Viewer — renders a physical book with cover, spine, and page block.
 * Supports orbit controls (rotate, zoom) and simulated page-flip on click.
 *
 * For books with >100 pages, only the cover is 3D (2D scroll for pages).
 */
export function BookViewer3D({
  titleMarathi,
  titleEnglish,
  coverColor = '#6B1E1E',
  pageCount = 100,
  accentColor = '#C9A227',
}: BookViewer3DProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const pageIndexRef = React.useRef(0);
  const pagesGroupRef = React.useRef<THREE.Group | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 400;

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2e8d8);

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(5, 3, 7);
    camera.lookAt(0, 0, 0);

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ── Controls ───────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, 0, 0);

    // ── Lighting ──────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 512;
    dirLight.shadow.mapSize.height = 512;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xddddff, 0.3);
    fillLight.position.set(-3, 4, -3);
    scene.add(fillLight);

    // ── Cover Texture (canvas-generated) ──────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 700;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = coverColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Inner border
    ctx.strokeStyle = accentColor + '60';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Title (Marathi)
    ctx.fillStyle = '#FFF8EC';
    ctx.font = 'bold 36px "Noto Sans Devanagari", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = wrapText(ctx, titleMarathi, 400, 36);
    const lineHeight = 48;
    const startY = (canvas.height - lines.length * lineHeight) / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
    });

    // English subtitle
    if (titleEnglish) {
      ctx.fillStyle = accentColor;
      ctx.font = '16px "Inter", sans-serif';
      ctx.fillText(titleEnglish, canvas.width / 2, startY + lines.length * lineHeight + 30);
    }

    // Decorative dots
    ctx.fillStyle = accentColor;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(canvas.width / 2 - 20 + i * 20, canvas.height - 60, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const coverTexture = new THREE.CanvasTexture(canvas);
    coverTexture.minFilter = THREE.LinearFilter;

    // ── Book Construction ──────────────────────────────────────────────────
    const bookGroup = new THREE.Group();

    // Book dimensions
    const bookW = 2.0;
    const bookH = 2.8;
    const bookThickness = Math.min(0.3 + pageCount * 0.003, 1.5);

    // Pages (white body)
    const pageGeo = new THREE.BoxGeometry(bookW, bookH, bookThickness);
    const pageMat = new THREE.MeshStandardMaterial({
      color: 0xfff8ec,
      roughness: 0.6,
      metalness: 0.0,
    });
    const pages = new THREE.Mesh(pageGeo, pageMat);
    pages.castShadow = true;
    pages.receiveShadow = true;
    bookGroup.add(pages);

    // Front cover (thin plane on the front face)
    const coverGeo = new THREE.PlaneGeometry(bookW, bookH);
    const coverMat = new THREE.MeshStandardMaterial({
      map: coverTexture,
      roughness: 0.4,
      metalness: 0.1,
    });
    const frontCover = new THREE.Mesh(coverGeo, coverMat);
    frontCover.position.z = bookThickness / 2 + 0.01;
    frontCover.castShadow = true;
    bookGroup.add(frontCover);

    // Back cover (mirrored)
    const backCoverMat = new THREE.MeshStandardMaterial({
      color: 0x4a1515,
      roughness: 0.6,
    });
    const backCover = new THREE.Mesh(
      new THREE.PlaneGeometry(bookW, bookH),
      backCoverMat,
    );
    backCover.position.z = -bookThickness / 2 - 0.01;
    backCover.rotation.y = Math.PI;
    bookGroup.add(backCover);

    // Spine
    const spineGeo = new THREE.BoxGeometry(bookThickness, bookH, 0.02);
    const spineMat = new THREE.MeshStandardMaterial({
      color: 0x4a1515,
      roughness: 0.7,
    });
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.position.x = -bookW / 2;
    bookGroup.add(spine);

    scene.add(bookGroup);

    // ── Ground plane ───────────────────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(12, 12);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -bookH / 2 - 0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Page Flipping (simple visual) ───────────────────────────────────────
    const flipPages = new THREE.Group();
    const numFlipPages = Math.min(pageCount, 20);
    for (let i = 0; i < numFlipPages; i++) {
      const pGeo = new THREE.PlaneGeometry(bookW - 0.1, bookH - 0.1);
      const pMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.08, 0.85 + Math.random() * 0.1),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3,
      });
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(0, 0, bookThickness / 2 + 0.02 + i * 0.002);
      flipPages.add(p);
    }
    flipPages.position.x = 0.02;
    bookGroup.add(flipPages);
    pagesGroupRef.current = flipPages;

    // ── Animation Loop ──────────────────────────────────────────────────────
    let animationId: number;

    function animate() {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ─────────────────────────────────────────────────────────────
    function handleResize() {
      const newWidth = container.clientWidth || 500;
      const newHeight = container.clientHeight || 400;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    }
    window.addEventListener('resize', handleResize);

    // ── Click to Flip ──────────────────────────────────────────────────────
    function handleClick() {
      if (!pagesGroupRef.current) return;
      const index = pageIndexRef.current;
      const numPages = pagesGroupRef.current.children.length;

      if (index < numPages) {
        const page = pagesGroupRef.current.children[index];
        const targetRot = -Math.PI;
        let rot = 0;

        function flipAnimate() {
          rot -= 0.08;
          if (rot > targetRot) {
            page.rotation.y = rot;
            requestAnimationFrame(flipAnimate);
          } else {
            page.rotation.y = targetRot;
            page.position.x = -0.02;
            pageIndexRef.current++;
          }
        }
        flipAnimate();
      }
    }
    renderer.domElement.addEventListener('click', handleClick);

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [titleMarathi, titleEnglish, coverColor, accentColor, pageCount]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[350px] sm:min-h-[450px] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
      aria-label="३डी पुस्तक पूर्वावलोकन"
    />
  );
}

// ── Text Wrapping Helper ──────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string[] {
  ctx.font = `bold ${fontSize}px "Noto Sans Devanagari", sans-serif`;
  const lines: string[] = [];
  let current = '';

  for (const char of text) {
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}
