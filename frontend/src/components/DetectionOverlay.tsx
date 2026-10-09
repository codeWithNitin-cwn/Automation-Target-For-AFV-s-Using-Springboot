import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DetectedObject } from '../types';
import { getThreatForClass } from '../config/threat';

interface DetectionOverlayProps {
  imageSrc: string;
  imageAlt?: string;
  detections: DetectedObject[];
  showBoxes?: boolean;
  showLabels?: boolean;
  showConfidence?: boolean;
  minConfidence?: number; // 0 to 1
  selectedTargetId?: number | null;
  hoveredTargetId?: number | null;
  onSelectTarget?: (id: number | null) => void;
  onHoverTarget?: (id: number | null) => void;
  filterClasses?: string[]; // If specified, only show these classes
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  imageSrc,
  imageAlt = 'AFV Target Reconnaissance View',
  detections = [],
  showBoxes = true,
  showLabels = true,
  showConfidence = true,
  minConfidence = 0.25,
  selectedTargetId = null,
  hoveredTargetId = null,
  onSelectTarget,
  onHoverTarget,
  filterClasses,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLayout, setImgLayout] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
  }>({ width: 0, height: 0, left: 0, top: 0 });

  const [imageError, setImageError] = useState(false);

  // Compute exact position and dimensions of the rendered image within the container
  const updateImageLayout = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    // Use getBoundingClientRect for subpixel accuracy
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    setImgLayout({
      width: imgRect.width,
      height: imgRect.height,
      left: imgRect.left - containerRect.left,
      top: imgRect.top - containerRect.top,
    });
  }, []);

  useEffect(() => {
    updateImageLayout();
    window.addEventListener('resize', updateImageLayout);

    const observer = new ResizeObserver(() => {
      updateImageLayout();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateImageLayout);
      observer.disconnect();
    };
  }, [updateImageLayout, imageSrc]);

  // Filter detections based on confidence and class toggle filters
  const visibleDetections = detections.filter((det) => {
    if (det.confidence < minConfidence) return false;
    if (filterClasses && filterClasses.length > 0 && !filterClasses.includes(det.className)) {
      return false;
    }
    return true;
  });

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '340px',
        maxHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#04060c',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border-muted)',
      }}
    >
      {/* Fallback neutral grid if image unavailable or error */}
      {imageError || !imageSrc ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            width: '100%',
            height: '340px',
            backgroundImage:
              'radial-gradient(circle, rgba(56, 189, 248, 0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              padding: '8px 16px',
              background: 'rgba(17, 28, 52, 0.8)',
              border: '1px solid var(--border-muted)',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          >
            IMAGE UNAVAILABLE
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Grid placeholder active (Awaiting telemetry feed)
          </span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={imageAlt}
          onLoad={() => {
            setImageError(false);
            updateImageLayout();
          }}
          onError={() => setImageError(true)}
          style={{
            maxWidth: '100%',
            maxHeight: '70vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
            userSelect: 'none',
          }}
        />
      )}

      {/* Exact overlay layer wrapping rendered image coordinates */}
      {imgLayout.width > 0 && imgLayout.height > 0 && showBoxes && !imageError && (
        <div
          style={{
            position: 'absolute',
            left: `${imgLayout.left}px`,
            top: `${imgLayout.top}px`,
            width: `${imgLayout.width}px`,
            height: `${imgLayout.height}px`,
            pointerEvents: 'none',
          }}
        >
          {visibleDetections.map((det, index) => {
            const threat = getThreatForClass(det.className);
            const isHovered = hoveredTargetId === (det.id ?? index);
            const isSelected = selectedTargetId === (det.id ?? index);

            // Normalized coordinates (0 to 1) converted to exact pixel coordinates
            const left = det.boxXMin * imgLayout.width;
            const top = det.boxYMin * imgLayout.height;
            const width = Math.max((det.boxXMax - det.boxXMin) * imgLayout.width, 12);
            const height = Math.max((det.boxYMax - det.boxYMin) * imgLayout.height, 12);

            const borderColor = threat.borderColor;
            const confidencePercent = Math.round(det.confidence * 100);

            return (
              <div
                key={det.id ?? index}
                className={`detection-box ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  borderColor: borderColor,
                  backgroundColor: isHovered || isSelected ? threat.bgColor : 'transparent',
                  boxShadow: isSelected ? `0 0 12px ${borderColor}` : 'none',
                  zIndex: isSelected ? 30 : isHovered ? 20 : 10,
                }}
                onMouseEnter={() => onHoverTarget?.(det.id ?? index)}
                onMouseLeave={() => onHoverTarget?.(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTarget?.(isSelected ? null : (det.id ?? index));
                }}
                role="button"
                tabIndex={0}
                aria-label={`Target: ${det.className}, Confidence: ${confidencePercent}%`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTarget?.(isSelected ? null : (det.id ?? index));
                  }
                }}
              >
                {/* Tactical corner ticks */}
                <span className="detection-box-tick tick-tl" style={{ borderColor }} />
                <span className="detection-box-tick tick-tr" style={{ borderColor }} />
                <span className="detection-box-tick tick-bl" style={{ borderColor }} />
                <span className="detection-box-tick tick-br" style={{ borderColor }} />

                {/* Tactical label chip */}
                {(showLabels || showConfidence) && (
                  <div
                    className="detection-label-chip"
                    style={{
                      backgroundColor: borderColor,
                    }}
                  >
                    {/* NATO shape indicator */}
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        background: '#fff',
                        borderRadius: threat.shape === 'diamond' ? '0' : threat.shape === 'square' ? '1px' : '50%',
                        transform: threat.shape === 'diamond' ? 'rotate(45deg)' : 'none',
                      }}
                    />
                    {showLabels && <span>{det.className}</span>}
                    {showConfidence && <span>{confidencePercent}%</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
