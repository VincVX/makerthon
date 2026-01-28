"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDxfContext } from "./DxfContext";
import { processDxf } from "./dxf";
import type { BoxDimensions } from "./types";

export function ThreePreview({ dims }: { dims: BoxDimensions }) {
  const [threeError, setThreeError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { mode, dxfText } = useDxfContext();
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    mesh: THREE.Mesh;
    frameId: number;
    observer: ResizeObserver;
    controls: OrbitControls;
  } | null>(null);

  const dxfSize = useMemo(() => {
    if (mode !== "upload" || !dxfText) return null;
    try {
      return processDxf(dxfText).bounds;
    } catch {
      return null;
    }
  }, [dxfText, mode]);

  useEffect(() => {
    if (!previewRef.current) return;
    if (threeRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(2.6, 2.2, 2.6);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setThreeError("WebGL ist nicht verfuegbar.");
      return;
    }
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    previewRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.9);
    directional.position.set(3, 4, 2);
    scene.add(ambient, directional);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xcaa86a,
      roughness: 0.6,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -0.18;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x6b4b2a })
    );
    mesh.add(edges);
    scene.add(mesh);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.4;
    controls.maxDistance = 6;
    controls.target.set(0, 0, 0);
    controls.update();

    const resize = () => {
      if (!previewRef.current) return;
      const { clientWidth, clientHeight } = previewRef.current;
      renderer!.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer!.render(scene, camera);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(previewRef.current);
    resize();

    const animate = () => {
      controls.update();
      renderer!.render(scene, camera);
      threeRef.current!.frameId = requestAnimationFrame(animate);
    };
    const frameId = requestAnimationFrame(animate);

    threeRef.current = {
      renderer,
      scene,
      camera,
      mesh,
      frameId,
      observer,
      controls,
    };

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      renderer!.dispose();
      geometry.dispose();
      material.dispose();
      if (previewRef.current?.contains(renderer!.domElement)) {
        previewRef.current.removeChild(renderer!.domElement);
      }
      threeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!threeRef.current) return;
    const modelDims = dxfSize && mode === "upload"
      ? {
          x: dims.L,
          y: dims.H,
          z: dims.W,
        }
      : {
          x: dims.panelL,
          y: dims.panelH,
          z: dims.panelW,
        };
    const maxDim = Math.max(modelDims.x, modelDims.y, modelDims.z, 1);
    const scaleX = modelDims.x / maxDim;
    const scaleY = modelDims.y / maxDim;
    const scaleZ = modelDims.z / maxDim;
    threeRef.current.mesh.scale.set(scaleX, scaleY, scaleZ);
  }, [dims.panelL, dims.panelW, dims.panelH, dims.L, dims.W, dims.H, dxfSize, mode]);

  return (
    <div className="rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(18,18,18,0.08)] backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            3d vorschau
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900 font-[var(--font-display)]">
            Box Visualisierung
          </h2>
        </div>
        <span className="text-xs uppercase tracking-widest text-zinc-500">
          three.js
        </span>
      </div>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-[#fbf5ea] to-[#f6ead2]">
        <div
          ref={previewRef}
          className="aspect-[4/3] w-full min-h-[260px]"
          aria-label="3D Vorschau der Box"
        >
          {threeError && (
            <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-zinc-500">
              {threeError}
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-zinc-500">
        Die 3D-Ansicht skaliert automatisch aus den eingegebenen Innenmassen. Der
        Deckel wird im Makerthon als geschlossenes Volumen dargestellt.
      </p>
    </div>
  );
}
