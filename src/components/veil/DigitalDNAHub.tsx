"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ThreeModule = typeof import("three");
type ToneModule = typeof import("tone");
type Mode = "spiral" | "mandala" | "sound" | "particles" | "journey";
type Seed = "red" | "black" | "blue";
type EngineState = "loading" | "ready" | "error";
type AudioState = "loading" | "ready" | "error";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  digit: number;
  color: string;
  size: number;
}

const MIN_SURFACE = 280;
const MAX_HELIX_WIDTH = 980;
const MAX_HELIX_HEIGHT = 760;
const MAX_SURFACE_SIZE = 860;
const MAX_PAINT_POINTS = 6000;
const AUDIO_UNAVAILABLE_MESSAGE = "Audio unavailable on this device.";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const hasAudioContextSupport = () => {
  if (typeof window === "undefined") return false;

  const compatWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };

  return (
    typeof window.AudioContext !== "undefined" ||
    typeof compatWindow.webkitAudioContext !== "undefined"
  );
};

const shouldForceAudioError = () => {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get("forceAudioError") === "1"
  );
};

const toAudioErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("notallowed") ||
      message.includes("user gesture") ||
      message.includes("interaction") ||
      message.includes("suspended")
    ) {
      return "Audio is blocked until this device allows playback.";
    }
  }

  return AUDIO_UNAVAILABLE_MESSAGE;
};

const SEEDS: Record<Seed, string> = {
  red: "113031491493585389543778774590997079619617525721567332336510",
  black: "011235831459437077415617853819099875279651673033695493257291",
  blue: "012776329785893036118967145479098334781325217074992143965631",
};

const MODES: Array<{ id: Mode; icon: string; label: string }> = [
  { id: "spiral", icon: "🌀", label: "DNA Helix" },
  { id: "mandala", icon: "🔮", label: "Sacred Mandala" },
  { id: "particles", icon: "✨", label: "Particle Field" },
  { id: "sound", icon: "🎵", label: "Sound Temple" },
  { id: "journey", icon: "🧭", label: "Guided Journey" },
];

const DigitalDNAHub = () => {
  const [activeMode, setActiveMode] = useState<Mode>("spiral");
  const [selectedSeed, setSelectedSeed] = useState<Seed>("red");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [consciousness, setConsciousness] = useState(50);
  const [harmony, setHarmony] = useState(7);
  const [tempo, setTempo] = useState(120);
  const [engineState, setEngineState] = useState<EngineState>("loading");
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineRetryNonce, setEngineRetryNonce] = useState(0);
  const [audioState, setAudioState] = useState<AudioState>("loading");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioRetryNonce, setAudioRetryNonce] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeRef = useRef<ThreeModule | null>(null);
  const toneRef = useRef<ToneModule | null>(null);
  const synthRef = useRef<any>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  const paintedPatternRef = useRef<Array<{ x: number; y: number }>>([]);

  const digitToNote = (digit: number) =>
    ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"][digit];
  const digitToColor = (digit: number) =>
    [
      "#1a1a2e",
      "#16213e",
      "#0f3460",
      "#533483",
      "#8b5cf6",
      "#ffd700",
      "#ff6b6b",
      "#4ecdc4",
      "#95e1d3",
      "#f38181",
    ][digit];

  const getSequence = useCallback(
    () => SEEDS[selectedSeed].split("").map(Number),
    [selectedSeed],
  );

  useEffect(() => {
    let mounted = true;
    setEngineState("loading");
    setEngineError(null);

    (async () => {
      try {
        const threeModule = await import("three");

        if (!mounted) return;
        threeRef.current = threeModule;
        setEngineState("ready");
      } catch (error) {
        if (!mounted) return;
        threeRef.current = null;
        setEngineState("error");
        setEngineError("3D unavailable on this device.");
        console.error(
          "[DigitalDNAHub] Failed to load 3D engine libraries.",
          error,
        );
      }
    })();

    return () => {
      mounted = false;
    };
  }, [engineRetryNonce]);

  useEffect(() => {
    let mounted = true;
    setAudioState("loading");
    setAudioError(null);
    setAudioInitialized(false);

    (async () => {
      try {
        const toneModule = await import("tone");
        if (!mounted) return;

        toneRef.current = toneModule;

        if (!hasAudioContextSupport()) {
          setAudioState("error");
          setAudioError(AUDIO_UNAVAILABLE_MESSAGE);
          return;
        }

        try {
          if (synthRef.current?.dispose) {
            synthRef.current.dispose();
          }

          synthRef.current = new toneModule.PolySynth(toneModule.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 1 },
          }).toDestination();

          const reverb = new toneModule.Reverb({
            decay: 4,
            wet: 0.3,
          }).toDestination();
          synthRef.current.connect(reverb);

          setAudioState("ready");
          setAudioError(null);
        } catch (error) {
          setAudioState("error");
          setAudioError(toAudioErrorMessage(error));
          console.error(
            "[DigitalDNAHub] Failed to initialize audio synth.",
            error,
          );
        }
      } catch (error) {
        if (!mounted) return;
        toneRef.current = null;
        setAudioState("error");
        setAudioError(AUDIO_UNAVAILABLE_MESSAGE);
        console.error("[DigitalDNAHub] Failed to load audio libraries.", error);
      }
    })();

    return () => {
      mounted = false;
      if (synthRef.current?.dispose) {
        synthRef.current.dispose();
      }
      synthRef.current = null;
    };
  }, [audioRetryNonce]);

  const playSequence = async () => {
    const Tone = toneRef.current;
    if (!Tone || !synthRef.current || audioState === "loading") {
      setAudioInitialized(false);
      setAudioState("error");
      setAudioError(AUDIO_UNAVAILABLE_MESSAGE);
      return;
    }

    try {
      if (shouldForceAudioError()) {
        throw new Error("Forced audio failure via query param.");
      }

      if (!audioInitialized) {
        await Tone.start();
        setAudioInitialized(true);
      }

      setAudioState("ready");
      setAudioError(null);
      setIsPlaying(true);

      const sequence = getSequence();
      const now = Tone.now();
      const interval = 60 / tempo;

      sequence.slice(0, 60).forEach((digit, i) => {
        synthRef.current.triggerAttackRelease(
          digitToNote(digit),
          interval * 0.8,
          now + i * interval,
        );
      });

      setTimeout(
        () => setIsPlaying(false),
        sequence.slice(0, 60).length * interval * 1000,
      );
    } catch (error) {
      setIsPlaying(false);
      setAudioInitialized(false);
      setAudioState("error");
      setAudioError(toAudioErrorMessage(error));
      console.error("[DigitalDNAHub] Audio playback unavailable.", error);
    }
  };

  const playChord = useCallback(
    (digits: number[]) => {
      if (!audioInitialized || !synthRef.current) return;
      synthRef.current.triggerAttackRelease(digits.map(digitToNote), "4n");
    },
    [audioInitialized],
  );

  const retryEngine = () => {
    setEngineError(null);
    setEngineState("loading");
    setEngineRetryNonce((value) => value + 1);
  };

  const retryAudio = async () => {
    if (shouldForceAudioError()) {
      setAudioInitialized(false);
      setAudioState("error");
      setAudioError(AUDIO_UNAVAILABLE_MESSAGE);
      return;
    }

    const Tone = toneRef.current;
    if (!Tone || !synthRef.current) {
      setAudioRetryNonce((value) => value + 1);
      return;
    }

    try {
      await Tone.start();
      setAudioInitialized(true);
      setAudioState("ready");
      setAudioError(null);
    } catch (error) {
      setAudioInitialized(false);
      setAudioState("error");
      setAudioError(toAudioErrorMessage(error));
      console.error("[DigitalDNAHub] Audio retry failed.", error);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const THREE = threeRef.current;
    if (activeMode !== "spiral" || engineState !== "ready" || !canvas || !THREE)
      return;

    let cleanup: (() => void) | undefined;
    let renderer: any = null;

    try {
      if (
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("force3dError") === "1"
      ) {
        throw new Error("Forced 3D failure via query param.");
      }

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0e27);

      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      camera.position.z = 20;

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      canvas.style.display = "block";
      canvas.style.touchAction = "none";

      scene.add(new THREE.AmbientLight(0xffffff, 0.4));
      const pointLight1 = new THREE.PointLight(0xffd700, 1.5);
      pointLight1.position.set(10, 10, 10);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0x4444ff, 1.0);
      pointLight2.position.set(-10, -10, 5);
      scene.add(pointLight2);

      const group = new THREE.Group();
      const spheres: any[] = [];
      const sequence = getSequence();

      for (let helix = 0; helix < harmony; helix++) {
        const helixGroup = new THREE.Group();
        const angleOffset = (helix * Math.PI * 2) / harmony;
        for (let i = 0; i < sequence.length; i++) {
          const digit = sequence[i];
          const t = i / 10;
          const radius = 3 + (digit / 10) * 2;
          const angle = angleOffset + t * Math.PI * 0.5;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const z = t - 10;

          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.15 + digit * 0.02, 16, 16),
            new THREE.MeshPhongMaterial({
              color: new THREE.Color(digitToColor(digit)),
              emissive: new THREE.Color(digitToColor(digit)),
              emissiveIntensity: 0.5,
              shininess: 100,
            }),
          );
          sphere.position.set(x, y, z);
          sphere.userData = { digit, index: i };
          spheres.push(sphere);
          helixGroup.add(sphere);
        }
        group.add(helixGroup);
      }
      scene.add(group);

      const resize = () => {
        const host = canvas.parentElement;
        if (!host || !renderer) return;
        const width = Math.round(
          clamp(host.clientWidth, MIN_SURFACE, MAX_HELIX_WIDTH),
        );
        const height = Math.round(
          clamp(
            Math.min(width * 0.72, window.innerHeight * 0.62),
            MIN_SURFACE,
            MAX_HELIX_HEIGHT,
          ),
        );
        renderer.setSize(width, height, false);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      resize();
      const resizeObserver = new ResizeObserver(resize);
      if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
      window.addEventListener("resize", resize);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2(2, 2);
      const pointers = new Map<number, { x: number; y: number }>();
      let pinchDistance = 0;
      let targetRotX = 0;
      let targetRotY = 0;
      let rotX = 0;
      let rotY = 0;
      let lastToneAt = 0;
      let hovered: any = null;

      const setPointer = (clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      };

      const probeSphere = () => {
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(spheres, false)[0]
          ?.object as any;

        if (hovered && hovered !== hit && hovered.material) {
          hovered.material.emissiveIntensity = 0.5;
          hovered = null;
        }

        if (!hit || hit.userData?.digit === undefined || !hit.material) return;

        hovered = hit;
        hit.material.emissiveIntensity = 1.0;

        const now = performance.now();
        if (now - lastToneAt > 90) {
          lastToneAt = now;
          playChord([hit.userData.digit]);
        }
      };

      const updatePinch = () => {
        if (pointers.size !== 2) {
          pinchDistance = 0;
          return;
        }
        const [a, b] = Array.from(pointers.values());
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance > 0) {
          camera.position.z = clamp(
            camera.position.z - (distance - pinchDistance) * 0.03,
            8,
            40,
          );
        }
        pinchDistance = distance;
      };

      const onPointerDown = (event: PointerEvent) => {
        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        setPointer(event.clientX, event.clientY);
        probeSphere();
      };

      const onPointerMove = (event: PointerEvent) => {
        const previous = pointers.get(event.pointerId);
        if (previous) {
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.size === 1) {
            targetRotY += (event.clientX - previous.x) * 0.005;
            targetRotX = clamp(
              targetRotX + (event.clientY - previous.y) * 0.003,
              -1.2,
              1.2,
            );
          }
          updatePinch();
        }
        setPointer(event.clientX, event.clientY);
        probeSphere();
      };

      const onPointerUp = (event: PointerEvent) => {
        pointers.delete(event.pointerId);
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        updatePinch();
      };

      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        camera.position.z = clamp(
          camera.position.z + event.deltaY * 0.01,
          8,
          40,
        );
      };

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });

      let animationId = 0;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const t = performance.now() * 0.001;
        rotX += (targetRotX - rotX) * 0.08;
        rotY += (targetRotY - rotY) * 0.08;
        group.rotation.y = t * 0.22 + rotY;
        group.rotation.x = Math.sin(t * 0.7) * 0.08 + rotX;
        const breathe = Math.sin(t * 1.1) * 0.08 + 1.0;
        group.scale.set(breathe, breathe, breathe);
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener("resize", resize);
        resizeObserver.disconnect();
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        canvas.removeEventListener("wheel", onWheel);
        scene.remove(group);
        group.traverse((object) => {
          const renderObject = object as any;
          if (renderObject.geometry?.dispose) {
            renderObject.geometry.dispose();
          }
          if (Array.isArray(renderObject.material)) {
            renderObject.material.forEach((material: any) =>
              material.dispose?.(),
            );
          } else if (renderObject.material?.dispose) {
            renderObject.material.dispose();
          }
        });
        renderer.dispose();
      };
    } catch (error) {
      if (renderer) renderer.dispose();
      setEngineState("error");
      setEngineError("3D unavailable on this device.");
      console.error(
        "[DigitalDNAHub] Failed to initialize helix renderer.",
        error,
      );
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [activeMode, engineState, getSequence, harmony, playChord]);

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas || (activeMode !== "mandala" && activeMode !== "particles"))
      return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 800;
    let height = 800;
    let centerX = width / 2;
    let centerY = height / 2;

    const sequence = getSequence();

    const buildParticles = () => {
      particlesRef.current = sequence.map((digit) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        digit,
        color: digitToColor(digit),
        size: 2 + digit * 0.5,
      }));
    };

    const resize = () => {
      const host = canvas.parentElement;
      if (!host) return;
      const side = Math.round(
        clamp(
          Math.min(host.clientWidth, window.innerHeight * 0.62),
          MIN_SURFACE,
          MAX_SURFACE_SIZE,
        ),
      );
      width = side;
      height = side;
      centerX = width / 2;
      centerY = height / 2;
      canvas.width = side;
      canvas.height = side;
      canvas.style.width = `${side}px`;
      canvas.style.height = `${side}px`;
      if (activeMode === "particles") {
        buildParticles();
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    window.addEventListener("resize", resize);

    if (activeMode === "particles") {
      buildParticles();
    }

    const onPointerDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.down = true;
      mouseRef.current.x = event.clientX - rect.left;
      mouseRef.current.y = event.clientY - rect.top;

      if (activeMode === "mandala") {
        paintedPatternRef.current.push({
          x: mouseRef.current.x,
          y: mouseRef.current.y,
        });
        if (paintedPatternRef.current.length > MAX_PAINT_POINTS) {
          paintedPatternRef.current.splice(
            0,
            paintedPatternRef.current.length - MAX_PAINT_POINTS,
          );
        }
        const dist = Math.hypot(
          mouseRef.current.x - centerX,
          mouseRef.current.y - centerY,
        );
        const digit = Math.floor((dist / 50) % 10);
        playChord([digit]);
      }
    };

    const onPointerUp = () => {
      mouseRef.current.down = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseRef.current.x = x;
      mouseRef.current.y = y;

      if (activeMode === "mandala" && mouseRef.current.down) {
        paintedPatternRef.current.push({ x, y });
        if (paintedPatternRef.current.length > MAX_PAINT_POINTS) {
          paintedPatternRef.current.splice(
            0,
            paintedPatternRef.current.length - MAX_PAINT_POINTS,
          );
        }
        const dist = Math.hypot(x - centerX, y - centerY);
        const digit = Math.floor((dist / 50) % 10);
        playChord([digit]);
      }
    };

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (activeMode === "mandala") {
        ctx.fillStyle = "#0a0e27";
        ctx.fillRect(0, 0, width, height);
        const segments = harmony * 12;
        const ringSpacing = Math.max(30, Math.min(width, height) / 14);

        for (let ring = 0; ring < 7; ring++) {
          const radius = (ring + 1) * ringSpacing;
          for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
            const digit = sequence[(ring * segments + i) % sequence.length];
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            ctx.beginPath();
            ctx.arc(x, y, 3 + digit * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = digitToColor(digit);
            ctx.fill();
          }
        }

        paintedPatternRef.current.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 215, 0, 0.6)";
          ctx.fill();
        });
      } else if (activeMode === "particles") {
        ctx.fillStyle = "rgba(10, 14, 39, 0.1)";
        ctx.fillRect(0, 0, width, height);
        particlesRef.current.forEach((particle) => {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < 200) {
            const force = (200 - dist) / 1000;
            particle.vx += (dx / dist) * force * (consciousness / 50);
            particle.vy += (dy / dist) * force * (consciousness / 50);
          }
          particle.x = Math.max(0, Math.min(width, particle.x + particle.vx));
          particle.y = Math.max(0, Math.min(height, particle.y + particle.vy));
          particle.vx *= 0.99;
          particle.vy *= 0.99;
          if (particle.x === 0 || particle.x === width) particle.vx *= -1;
          if (particle.y === 0 || particle.y === height) particle.vy *= -1;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fillStyle = particle.color;
          ctx.fill();
        });
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [activeMode, consciousness, getSequence, harmony, playChord]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-amber-50">
      <div className="relative z-10 mx-auto max-w-7xl p-6">
        <div className="mb-12 text-center">
          <h1 className="mb-4 bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 bg-clip-text text-6xl font-bold text-transparent">
            ✨ Digital DNA ✨
          </h1>
          <p className="text-2xl font-light text-blue-300">
            Sacred Geometry & Sonic Consciousness
          </p>
          {(engineState === "loading" || audioState === "loading") && (
            <p className="mt-3 text-sm text-amber-400">
              Loading 3D and audio libraries...
            </p>
          )}
          {engineState === "error" && (
            <p className="mt-3 text-sm text-rose-300">
              3D unavailable on this device.
            </p>
          )}
          {audioState === "error" && (
            <p className="mt-3 text-sm text-amber-200">
              Audio unavailable. Visual modes still work.
            </p>
          )}
        </div>

        <div className="mb-12 flex flex-wrap justify-center gap-4">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`rounded-2xl px-6 py-4 ${activeMode === mode.id ? "bg-amber-600" : "bg-slate-800/50"}`}
            >
              <div className="text-3xl">{mode.icon}</div>
              <div className="text-sm font-bold">{mode.label}</div>
            </button>
          ))}
        </div>

        {activeMode === "spiral" && (
          <div className="flex justify-center" style={{ minHeight: "320px" }}>
            {engineState === "ready" && (
              <canvas
                ref={canvasRef}
                className="rounded-xl border border-blue-700/30 shadow-2xl shadow-blue-950/40"
              />
            )}

            {engineState === "loading" && (
              <div className="flex w-full max-w-4xl items-center justify-center rounded-xl border border-blue-700/40 bg-slate-900/60 px-6 py-16 text-center">
                <p className="text-sm text-blue-200">
                  Loading 3D helix engine...
                </p>
              </div>
            )}

            {engineState === "error" && (
              <div className="w-full max-w-4xl rounded-2xl border border-rose-500/50 bg-rose-950/30 p-6">
                <h2 className="text-xl font-semibold text-rose-200">
                  3D unavailable on this device.
                </h2>
                <p className="mt-2 text-sm text-rose-100/90">
                  {engineError ?? "The 3D helix engine failed to initialize."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={retryEngine}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
                  >
                    Retry 3D
                  </button>
                  <button
                    onClick={() => setActiveMode("mandala")}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                  >
                    Switch to 2D mode
                  </button>
                </div>
                <p className="mt-3 text-xs text-rose-100/70">
                  For smoke testing fallback behavior, open this route with{" "}
                  <code>?force3dError=1</code>.
                </p>
              </div>
            )}
          </div>
        )}

        {(activeMode === "mandala" || activeMode === "particles") && (
          <div className="flex justify-center" style={{ minHeight: "320px" }}>
            <canvas
              ref={particleCanvasRef}
              className="rounded-xl border border-purple-700/30"
            />
          </div>
        )}

        {activeMode === "sound" && (
          <div className="mx-auto w-full max-w-3xl text-center">
            {audioState === "error" ? (
              <div className="rounded-2xl border border-rose-500/50 bg-rose-950/30 p-6">
                <h2 className="text-xl font-semibold text-rose-200">
                  Audio unavailable on this device.
                </h2>
                <p className="mt-2 text-sm text-rose-100/90">
                  {audioError ?? AUDIO_UNAVAILABLE_MESSAGE}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={retryAudio}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
                  >
                    Retry Audio
                  </button>
                  <button
                    onClick={() => setActiveMode("mandala")}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                  >
                    Switch to Visual Mode
                  </button>
                </div>
                <p className="mt-3 text-xs text-rose-100/70">
                  For smoke testing audio fallback behavior, open this route
                  with <code>?forceAudioError=1</code>.
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={playSequence}
                  disabled={isPlaying || audioState !== "ready"}
                  className="rounded-xl bg-pink-600 px-6 py-3 font-bold disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  {isPlaying ? "🎵 Playing..." : "▶️ Play DNA Sequence"}
                </button>
                {!audioInitialized && (
                  <p className="mt-3 text-xs text-slate-300">
                    Tap play to initialize audio playback.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {activeMode === "journey" && (
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <p className="mb-4 text-lg text-amber-300">
              Tune your journey settings and jump into a mode:
            </p>
            <div className="mb-4 flex items-center gap-3">
              <span>Tempo:</span>
              <input
                type="range"
                min="60"
                max="180"
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="w-full"
              />
              <span>{tempo}</span>
            </div>
            <div className="mb-4 flex items-center gap-3">
              <span>Consciousness:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={consciousness}
                onChange={(e) => setConsciousness(Number(e.target.value))}
                className="w-full"
              />
              <span>{consciousness}%</span>
            </div>
            <div className="flex gap-2">
              {[3, 5, 7, 9, 12].map((num) => (
                <button
                  key={num}
                  onClick={() => setHarmony(num)}
                  className={`rounded-full px-4 py-2 ${harmony === num ? "bg-purple-600" : "bg-slate-700"}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 flex justify-center gap-3">
          {(Object.keys(SEEDS) as Seed[]).map((seed) => (
            <button
              key={seed}
              onClick={() => setSelectedSeed(seed)}
              className={`rounded-full px-4 py-2 ${selectedSeed === seed ? "bg-amber-500" : "bg-slate-700"}`}
            >
              {seed}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DigitalDNAHub;
