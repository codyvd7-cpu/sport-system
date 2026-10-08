'use client';
import * as React from 'react';
import * as THREE from 'three';

// ─── Hero3D ────────────────────────────────────────────────────────────────────
// The WebGL layer of the cinematic hero: a genuinely three-dimensional scene.
//
// What's actually in 3D space, lit and moving:
//   · The school CREST as a real dimensional object — a bevelled medallion on
//     a floating disc, catching a key light and a coloured rim light, tilting
//     toward the pointer with smoothed inertia. Not a flat PNG.
//   · A field of depth PARTICLES at varying Z, so moving the pointer shifts
//     them against each other — true parallax, the thing that reads as "3D".
//   · Volumetric light: a large soft glow behind the crest in the school's
//     colour, with additive bloom-like falloff.
//   · A slow constant drift so the scene breathes even when still.
//
// Falls back gracefully: if WebGL is unavailable the component renders nothing
// and the CSS hero underneath carries the scene.

export default function Hero3D({ accent, crestUrl }: { accent: string; crestUrl: string | null }) {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const pointer = React.useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch { return; }

    const W = () => mount.clientWidth;
    const H = () => mount.clientHeight;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.1, 100);
    camera.position.z = 15;   // further back = smaller crest, less dominant
    camera.position.y = -2.4;
    camera.position.x = -3.2;  // push the crest to the RIGHT of frame

    // Accent as THREE colour
    const col = new THREE.Color(accent || '#3b6ea5');

    // ── Lights ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xfff6e8, 1.4);
    key.position.set(4, 6, 8);
    scene.add(key);
    const rim = new THREE.PointLight(col.getHex(), 2.4, 40);
    rim.position.set(-5, -2, 4);
    scene.add(rim);

    // ── The crest group ─────────────────────────────────────────────────────────
    const crest = new THREE.Group();
    scene.add(crest);

    // Backing disc — brushed metal medallion the crest sits on.
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.16, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a2029, metalness: 0.85, roughness: 0.35 }),
    );
    disc.rotation.x = Math.PI / 2;
    crest.add(disc);

    // Bevelled rim ring in the accent colour.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.05, 24, 96),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.9, roughness: 0.25, emissive: col, emissiveIntensity: 0.3 }),
    );
    crest.add(ring);

    // The crest image, mapped onto a plane floating just in front of the disc.
    if (crestUrl) {
      new THREE.TextureLoader().load(crestUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(2.0, 2.0),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
        );
        plane.position.z = 0.16;
        crest.add(plane);
      });
    }

    // ── Volumetric glow behind the crest (additive sprite) ──────────────────────
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 256;
    const gctx = glowCanvas.getContext('2d')!;
    const gr = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, `rgba(${(col.r*255)|0},${(col.g*255)|0},${(col.b*255)|0},0.9)`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    gctx.fillStyle = gr; gctx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.6 }));
    glow.scale.set(9, 9, 1);
    glow.position.z = -1;
    scene.add(glow);

    // ── Depth particle field ────────────────────────────────────────────────────
    const COUNT = 260;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 26;
      pos[i*3+1] = (Math.random() - 0.5) * 16;
      pos[i*3+2] = (Math.random() - 0.5) * 14 - 2;
      seed[i] = Math.random() * Math.PI * 2;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: col, size: 0.07, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // ── Interaction + loop ──────────────────────────────────────────────────────
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      pointer.current.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.current.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove);

    const onResize = () => {
      camera.aspect = W() / H(); camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const t = clock.getElapsedTime();

      // Smooth the pointer toward target (inertia).
      pointer.current.x += (pointer.current.tx - pointer.current.x) * 0.05;
      pointer.current.y += (pointer.current.ty - pointer.current.y) * 0.05;

      // Crest tilts toward pointer + a slow idle float.
      crest.rotation.y = pointer.current.x * 0.5 + Math.sin(t * 0.3) * 0.08;
      crest.rotation.x = -pointer.current.y * 0.4 + Math.cos(t * 0.25) * 0.05;
      crest.position.y = Math.sin(t * 0.6) * 0.12;

      // Particles drift + parallax against pointer.
      points.rotation.y = t * 0.02 + pointer.current.x * 0.15;
      points.rotation.x = pointer.current.y * 0.1;

      // Rim light orbits slowly for moving highlights.
      rim.position.x = Math.cos(t * 0.4) * 6;
      rim.position.y = Math.sin(t * 0.4) * 4;

      glow.material.opacity = 0.5 + Math.sin(t * 1.2) * 0.12;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [accent, crestUrl]);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }} />;
}
