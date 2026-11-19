'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { MediaAsset } from '@/lib/types';

const MAX_BYTES = 25 * 1024 * 1024;

type State = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported' | 'too_large';

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl');
  } catch {
    return false;
  }
}

/**
 * Optional 3D viewer for permission-cleared GLB/glTF assets.
 * - Three.js is loaded only when the visitor chooses to open the model (no 3D cost on page load).
 * - Static preview image + floor plans remain the primary content and the fallback.
 * - Keyboard: arrow keys orbit, +/- zoom, R resets. Respects prefers-reduced-motion (no auto-rotate).
 */
export function ModelViewer({ asset, fallbackImage }: { asset: MediaAsset; fallbackImage?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ reset: () => void; zoom: (f: number) => void; orbit: (dx: number, dy: number) => void; dispose: () => void } | null>(null);
  const [state, setState] = useState<State>('idle');
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');

  useEffect(() => () => api.current?.dispose(), []);

  const start = useCallback(async () => {
    if (!webglAvailable()) return setState('unsupported');
    if (asset.bytes && asset.bytes > MAX_BYTES) return setState('too_large');
    setState('loading');
    try {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
      const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const el = host.current!;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lowPower = (navigator.hardwareConcurrency ?? 4) <= 2;

      const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1 : 2));
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      el.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-hidden', 'true');

      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xfff8ee, 0x2a2a2a, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 1.4);
      sun.position.set(5, 10, 7);
      scene.add(sun);
      const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.1, 5000);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = !reduce;
      controls.autoRotate = false;

      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/draco/gltf/');
      loader.setDRACOLoader(draco);
      loader.setMeshoptDecoder(MeshoptDecoder);

      const gltf = await new Promise<{ scene: import('three').Object3D }>((resolve, reject) =>
        loader.load(asset.url, resolve, (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)), reject),
      );
      scene.add(gltf.scene);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3()).length() || 10;
      const center = box.getCenter(new THREE.Vector3());
      const home = center.clone().add(new THREE.Vector3(size * 0.6, size * 0.45, size * 0.6));
      const resetView = () => {
        camera.position.copy(home);
        camera.near = size / 100;
        camera.far = size * 20;
        camera.updateProjectionMatrix();
        controls.target.copy(center);
        controls.update();
      };
      resetView();

      let raf = 0;
      let dirty = true;
      controls.addEventListener('change', () => (dirty = true));
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (controls.update() || dirty) {
          renderer.render(scene, camera);
          dirty = false;
        }
      };
      loop();
      const ro = new ResizeObserver(() => {
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(el.clientWidth, el.clientHeight);
        dirty = true;
      });
      ro.observe(el);

      const spherical = new THREE.Spherical();
      api.current = {
        reset: () => {
          resetView();
          dirty = true;
        },
        zoom: (f) => {
          camera.position.sub(controls.target).multiplyScalar(f).add(controls.target);
          controls.update();
        },
        orbit: (dx, dy) => {
          const off = camera.position.clone().sub(controls.target);
          spherical.setFromVector3(off);
          spherical.theta += dx;
          spherical.phi = Math.min(Math.PI - 0.1, Math.max(0.1, spherical.phi + dy));
          off.setFromSpherical(spherical);
          camera.position.copy(controls.target).add(off);
          controls.update();
        },
        dispose: () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          controls.dispose();
          draco.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        },
      };
      setState('ready');
      setMsg('3D model loaded. Use arrow keys to rotate, plus and minus to zoom, R to reset.');
    } catch (e) {
      console.error(e);
      api.current?.dispose();
      setState('error');
    }
  }, [asset]);

  const onKey = (e: React.KeyboardEvent) => {
    const a = api.current;
    if (!a) return;
    const map: Record<string, () => void> = {
      ArrowLeft: () => a.orbit(-0.15, 0),
      ArrowRight: () => a.orbit(0.15, 0),
      ArrowUp: () => a.orbit(0, -0.1),
      ArrowDown: () => a.orbit(0, 0.1),
      '+': () => a.zoom(0.85),
      '=': () => a.zoom(0.85),
      '-': () => a.zoom(1.18),
      r: () => a.reset(),
      R: () => a.reset(),
    };
    if (map[e.key]) {
      e.preventDefault();
      map[e.key]();
    }
  };

  return (
    <figure className="viewer">
      <div
        className="viewer__stage"
        ref={host}
        tabIndex={state === 'ready' ? 0 : -1}
        role={state === 'ready' ? 'application' : undefined}
        aria-label={state === 'ready' ? `Interactive 3D model: ${asset.alt}` : undefined}
        onKeyDown={onKey}
      >
        {state !== 'ready' && (
          <div className="viewer__poster">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {(asset.previewUrl || fallbackImage) && <img src={asset.previewUrl || fallbackImage} alt="" loading="lazy" />}
            <div className="viewer__overlay">
              {state === 'idle' && (
                <button type="button" className="btn btn-ink" onClick={start}>
                  <Box size={16} aria-hidden="true" /> Load 3D model{asset.bytes ? ` (${(asset.bytes / 1048576).toFixed(1)} MB)` : ''}
                </button>
              )}
              {state === 'loading' && (
                <div className="viewer__progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Loading 3D model">
                  <span style={{ width: `${progress}%` }} />
                  <p className="small">Loading model… {progress ? `${progress}%` : ''}</p>
                </div>
              )}
              {state === 'error' && <p className="notice notice-danger small">The 3D model could not be loaded. The photos and floor plans on this page are unaffected.</p>}
              {state === 'unsupported' && <p className="notice small">3D viewing isn’t supported on this device or browser. Please use the floor plans instead.</p>}
              {state === 'too_large' && <p className="notice small">This model is too large to load in the browser. Please use the floor plans instead.</p>}
            </div>
          </div>
        )}
      </div>
      {state === 'ready' && (
        <div className="viewer__controls" role="toolbar" aria-label="3D view controls">
          <button type="button" className="icon-btn" onClick={() => api.current?.zoom(0.85)} aria-label="Zoom in"><ZoomIn size={18} aria-hidden="true" /></button>
          <button type="button" className="icon-btn" onClick={() => api.current?.zoom(1.18)} aria-label="Zoom out"><ZoomOut size={18} aria-hidden="true" /></button>
          <button type="button" className="icon-btn" onClick={() => api.current?.reset()} aria-label="Reset view"><RotateCcw size={18} aria-hidden="true" /></button>
        </div>
      )}
      <figcaption className="tiny muted">
        {asset.illustrative && <span className="badge badge-warn" style={{ marginRight: 8 }}>Illustrative model — not an exact representation</span>}
        {asset.caption ?? asset.alt} · {asset.attribution}
      </figcaption>
      <p className="visually-hidden" aria-live="polite">{msg}</p>
    </figure>
  );
}
