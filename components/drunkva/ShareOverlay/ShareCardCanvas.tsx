import { useRef, useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareCardCanvasProps {
  children: React.ReactNode;
  backgroundSrc?: string | null;
  onTransformChange?: (scale: number, x: number, y: number) => void;
  resetKey?: number;
  containerStyle?: React.CSSProperties;
}

export function ShareCardCanvas({
  children,
  backgroundSrc,
  onTransformChange,
  resetKey,
  containerStyle,
}: ShareCardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Existing drag state logic adapted to refs for high performance
  const isDragging = useRef(false);
  const dragStart = useRef({ pointerX: 0, pointerY: 0, posX: 0, posY: 0 });
  const positionRef = useRef({ x: 0.5, y: 0.25 });
  const [position, setPosition] = useState({ x: 0.5, y: 0.25 });
  
  // New pinch state using pointer events
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDistance = useRef<number | null>(null);
  const scaleRef = useRef(1.0);
  const [scale, setScale] = useState(1.0);
  const lastTapTime = useRef(0);

  // Expose current scale and position
  useEffect(() => {
    onTransformChange?.(scale, position.x, position.y);
  }, [scale, position, onTransformChange]);

  const resetTransform = () => {
    setPosition({ x: 0.5, y: 0.25 });
    positionRef.current = { x: 0.5, y: 0.25 };
    setScale(1.0);
    scaleRef.current = 1.0;
    
    if (cardRef.current) {
      cardRef.current.style.left = "50%";
      cardRef.current.style.top = "25%";
      cardRef.current.style.transform = "translate(-50%, 0) scale(1)";
    }
    
    // Animate button scale
    const btn = document.getElementById("canvas-reset-btn");
    if (btn) {
      btn.style.transform = "scale(0.9)";
      setTimeout(() => { btn.style.transform = "scale(1)"; }, 100);
    }
  };

  useEffect(() => {
    if (resetKey) {
      resetTransform();
    }
  }, [resetKey]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // The primary pointer handles the drag component.
    if (e.isPrimary) {
      isDragging.current = true;
      dragStart.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        posX: positionRef.current.x,
        posY: positionRef.current.y,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 1. Calculate pinch if 2 or more pointers
    if (activePointers.current.size >= 2) {
      const [p1, p2] = Array.from(activePointers.current.values());
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (lastPinchDistance.current !== null) {
        const delta = dist / lastPinchDistance.current;
        scaleRef.current = Math.min(2.0, Math.max(0.5, scaleRef.current * delta));
      }
      lastPinchDistance.current = dist;
    }

    // 2. Calculate drag if primary pointer is moving
    if (e.isPrimary && isDragging.current && containerRef.current) {
      const container = containerRef.current.getBoundingClientRect();
      // Adjust delta by scale so dragging feels 1:1 regardless of zoom
      const deltaX = (e.clientX - dragStart.current.pointerX) / (container.width * scaleRef.current);
      const deltaY = (e.clientY - dragStart.current.pointerY) / (container.height * scaleRef.current);
      
      const newX = Math.max(0.1, Math.min(0.9, dragStart.current.posX + deltaX));
      const newY = Math.max(0.05, Math.min(0.85, dragStart.current.posY + deltaY));

      positionRef.current = { x: newX, y: newY };
    }

    // Apply combined transforms via direct DOM modification for performance
    if (cardRef.current) {
      cardRef.current.style.left = `${positionRef.current.x * 100}%`;
      cardRef.current.style.top = `${positionRef.current.y * 100}%`;
      cardRef.current.style.transform = `translate(-50%, 0) scale(${scaleRef.current})`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);

    // If we dropped below 2 pointers, end the pinch gesture
    if (activePointers.current.size < 2) {
      lastPinchDistance.current = null;
      setScale(scaleRef.current);
    }
    
    // If the primary pointer is lifted, end the drag gesture
    if (e.isPrimary) {
      isDragging.current = false;
      setPosition(positionRef.current);
      
      // Double tap to reset
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        resetTransform();
      }
      lastTapTime.current = now;
    }
  };

  return (
    <div
      ref={containerRef}
      id="share-card-canvas"
      className="relative w-full overflow-hidden bg-[#0a0a0a] rounded-xl"
      style={{ aspectRatio: "9/16", ...containerStyle }}
    >
      {backgroundSrc && (
        <img
          src={backgroundSrc}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-60"
        />
      )}

      <div
        ref={cardRef}
        id="share-card-wrapper"
        className="absolute w-full cursor-grab active:cursor-grabbing select-none touch-none z-10"
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          transform: `translate(-50%, 0) scale(${scale})`,
          transformOrigin: "top center",
          willChange: "transform",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>

      <button
        id="canvas-reset-btn"
        onClick={resetTransform}
        className="absolute w-[32px] h-[32px] rounded-full bg-black/50 flex items-center justify-center z-20 backdrop-blur-[4px] border-[0.5px] border-[#333] transition-transform"
        style={{ top: "12px", right: "12px" }}
        aria-label="Reset position and scale"
      >
        <RotateCcw className="w-[14px] h-[14px] text-[#888]" />
      </button>
    </div>
  );
}
