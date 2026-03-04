'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MentorTraits, MentorTier } from '@/lib/veil/types';

interface MentorPetSpriteProps {
  traits: MentorTraits;
  tier: MentorTier;
  size?: number;
  animated?: boolean;
}

/**
 * MentorPetSprite - The Teacher's Guardian Familiar
 *
 * A calm, ancient, watchful creature. Not playful like the kid's pet.
 * Evolves visually through tiers without bouncing or needing care.
 */
export const MentorPetSprite = memo(function MentorPetSprite({
  traits,
  tier,
  size = 200,
  animated = true,
}: MentorPetSpriteProps) {
  // Derive colors from traits (muted palette for guardian aesthetic)
  const colors = useMemo(() => {
    const hslToHex = (h: number, s: number, l: number) => {
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    // Muted, guardian-like colors (reduced saturation)
    const primary = hslToHex(traits.primaryHue, 0.35, 0.45);
    const secondary = hslToHex(traits.secondaryHue, 0.3, 0.55);
    const glow = hslToHex(traits.primaryHue, 0.5, 0.6);

    return { primary, secondary, glow };
  }, [traits.primaryHue, traits.secondaryHue]);

  // Body shape based on trait
  const bodyPath = useMemo(() => {
    const cx = 100;
    const cy = 100;
    const baseSize = 45;

    switch (traits.bodyShape) {
      case 0: // Sphere/orb
        return `M ${cx} ${cy - baseSize}
                A ${baseSize} ${baseSize} 0 1 1 ${cx} ${cy + baseSize}
                A ${baseSize} ${baseSize} 0 1 1 ${cx} ${cy - baseSize}`;
      case 1: // Diamond
        return `M ${cx} ${cy - baseSize * 1.2}
                L ${cx + baseSize} ${cy}
                L ${cx} ${cy + baseSize * 1.2}
                L ${cx - baseSize} ${cy} Z`;
      case 2: // Hexagon
        const hexPoints = Array.from({ length: 6 }, (_, i) => {
          const angle = (i * 60 - 90) * (Math.PI / 180);
          return `${cx + baseSize * Math.cos(angle)},${cy + baseSize * Math.sin(angle)}`;
        }).join(' ');
        return `M ${hexPoints.split(' ')[0]} L ${hexPoints.split(' ').slice(1).join(' L ')} Z`;
      case 3: // Teardrop (inverted)
        return `M ${cx} ${cy - baseSize * 1.3}
                Q ${cx + baseSize * 1.2} ${cy} ${cx} ${cy + baseSize * 0.8}
                Q ${cx - baseSize * 1.2} ${cy} ${cx} ${cy - baseSize * 1.3}`;
      case 4: // Shield
        return `M ${cx} ${cy - baseSize * 1.2}
                L ${cx + baseSize * 0.9} ${cy - baseSize * 0.3}
                L ${cx + baseSize * 0.7} ${cy + baseSize * 0.8}
                L ${cx} ${cy + baseSize * 1.2}
                L ${cx - baseSize * 0.7} ${cy + baseSize * 0.8}
                L ${cx - baseSize * 0.9} ${cy - baseSize * 0.3} Z`;
      case 5: // Flame-like
        return `M ${cx} ${cy - baseSize * 1.4}
                Q ${cx + baseSize * 0.8} ${cy - baseSize * 0.5} ${cx + baseSize * 0.6} ${cy + baseSize * 0.3}
                Q ${cx + baseSize * 0.3} ${cy + baseSize * 0.8} ${cx} ${cy + baseSize}
                Q ${cx - baseSize * 0.3} ${cy + baseSize * 0.8} ${cx - baseSize * 0.6} ${cy + baseSize * 0.3}
                Q ${cx - baseSize * 0.8} ${cy - baseSize * 0.5} ${cx} ${cy - baseSize * 1.4}`;
      case 6: // Star (5-point)
        const starPoints = Array.from({ length: 10 }, (_, i) => {
          const angle = (i * 36 - 90) * (Math.PI / 180);
          const r = i % 2 === 0 ? baseSize : baseSize * 0.5;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return `M ${starPoints.split(' ')[0]} L ${starPoints.split(' ').slice(1).join(' L ')} Z`;
      default: // Octagon
        const octPoints = Array.from({ length: 8 }, (_, i) => {
          const angle = (i * 45 - 22.5) * (Math.PI / 180);
          return `${cx + baseSize * Math.cos(angle)},${cy + baseSize * Math.sin(angle)}`;
        }).join(' ');
        return `M ${octPoints.split(' ')[0]} L ${octPoints.split(' ').slice(1).join(' L ')} Z`;
    }
  }, [traits.bodyShape]);

  // Eye style
  const renderEyes = () => {
    const cx = 100;
    const cy = 95;
    const eyeOffset = 18;

    switch (traits.eyeStyle) {
      case 0: // Circles
        return (
          <>
            <circle cx={cx - eyeOffset} cy={cy} r={6} fill="#fff" opacity={0.9} />
            <circle cx={cx + eyeOffset} cy={cy} r={6} fill="#fff" opacity={0.9} />
            <circle cx={cx - eyeOffset} cy={cy} r={3} fill={colors.secondary} />
            <circle cx={cx + eyeOffset} cy={cy} r={3} fill={colors.secondary} />
          </>
        );
      case 1: // Slits
        return (
          <>
            <ellipse cx={cx - eyeOffset} cy={cy} rx={3} ry={8} fill="#fff" opacity={0.9} />
            <ellipse cx={cx + eyeOffset} cy={cy} rx={3} ry={8} fill="#fff" opacity={0.9} />
          </>
        );
      case 2: // Diamond eyes
        return (
          <>
            <polygon points={`${cx - eyeOffset},${cy - 6} ${cx - eyeOffset + 5},${cy} ${cx - eyeOffset},${cy + 6} ${cx - eyeOffset - 5},${cy}`} fill="#fff" opacity={0.9} />
            <polygon points={`${cx + eyeOffset},${cy - 6} ${cx + eyeOffset + 5},${cy} ${cx + eyeOffset},${cy + 6} ${cx + eyeOffset - 5},${cy}`} fill="#fff" opacity={0.9} />
          </>
        );
      case 3: // Single eye (cyclops)
        return (
          <>
            <circle cx={cx} cy={cy} r={10} fill="#fff" opacity={0.9} />
            <circle cx={cx} cy={cy} r={5} fill={colors.secondary} />
          </>
        );
      case 4: // Three eyes
        return (
          <>
            <circle cx={cx - eyeOffset} cy={cy + 3} r={5} fill="#fff" opacity={0.9} />
            <circle cx={cx + eyeOffset} cy={cy + 3} r={5} fill="#fff" opacity={0.9} />
            <circle cx={cx} cy={cy - 10} r={4} fill="#fff" opacity={0.9} />
          </>
        );
      case 5: // Horizontal line eyes
        return (
          <>
            <line x1={cx - eyeOffset - 6} y1={cy} x2={cx - eyeOffset + 6} y2={cy} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
            <line x1={cx + eyeOffset - 6} y1={cy} x2={cx + eyeOffset + 6} y2={cy} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
          </>
        );
      default: // Gentle curves (wise look)
        return (
          <>
            <path d={`M ${cx - eyeOffset - 6} ${cy} Q ${cx - eyeOffset} ${cy - 4} ${cx - eyeOffset + 6} ${cy}`} stroke="#fff" strokeWidth={2} fill="none" />
            <path d={`M ${cx + eyeOffset - 6} ${cy} Q ${cx + eyeOffset} ${cy - 4} ${cx + eyeOffset + 6} ${cy}`} stroke="#fff" strokeWidth={2} fill="none" />
          </>
        );
    }
  };

  // Pattern overlay
  const renderPattern = () => {
    const patternId = `pattern-${traits.patternType}`;

    switch (traits.patternType) {
      case 0: // None
        return null;
      case 1: // Circuits
        return (
          <pattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 0 10 L 10 10 L 10 0 M 10 20 L 10 10 L 20 10" stroke={colors.secondary} strokeWidth="1" fill="none" opacity="0.3" />
          </pattern>
        );
      case 2: // Dots
        return (
          <pattern id={patternId} x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="7.5" cy="7.5" r="2" fill={colors.secondary} opacity="0.3" />
          </pattern>
        );
      case 3: // Waves
        return (
          <pattern id={patternId} x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
            <path d="M 0 5 Q 5 0 10 5 T 20 5" stroke={colors.secondary} strokeWidth="1" fill="none" opacity="0.3" />
          </pattern>
        );
      case 4: // Stars
        return (
          <pattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <text x="10" y="15" textAnchor="middle" fontSize="10" fill={colors.secondary} opacity="0.2">*</text>
          </pattern>
        );
      default: // Subtle grid
        return (
          <pattern id={patternId} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" stroke={colors.secondary} strokeWidth="0.5" fill="none" opacity="0.15" />
          </pattern>
        );
    }
  };

  // Tier-based features
  const renderTierFeatures = () => {
    const features: React.ReactNode[] = [];

    // Tier 1+: Tail
    if (tier >= 1) {
      features.push(
        <motion.path
          key="tail"
          d="M 100 145 Q 100 165 85 175 Q 70 185 60 175"
          stroke={colors.secondary}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          animate={animated ? { d: ['M 100 145 Q 100 165 85 175 Q 70 185 60 175', 'M 100 145 Q 100 165 90 178 Q 75 188 65 178'] } : undefined}
          transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
      );
    }

    // Tier 2+: Aura shimmer
    if (tier >= 2) {
      features.push(
        <motion.circle
          key="aura"
          cx={100}
          cy={100}
          r={65}
          fill="none"
          stroke={colors.glow}
          strokeWidth={2}
          opacity={0.4}
          animate={animated ? { r: [65, 70, 65], opacity: [0.4, 0.2, 0.4] } : undefined}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      );
    }

    // Tier 3+: Crown
    if (tier >= 3) {
      features.push(
        <g key="crown">
          <path
            d="M 75 55 L 80 40 L 90 50 L 100 35 L 110 50 L 120 40 L 125 55"
            fill={colors.glow}
            stroke={colors.secondary}
            strokeWidth={1.5}
          />
          <circle cx={100} cy={38} r={4} fill="#FFD700" />
        </g>
      );
    }

    // Tier 4: Forge symbol
    if (tier >= 4) {
      features.push(
        <g key="forge">
          <motion.circle
            cx={100}
            cy={130}
            r={8}
            fill="none"
            stroke="#FFD700"
            strokeWidth={2}
            animate={animated ? { scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] } : undefined}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <text x={100} y={134} textAnchor="middle" fontSize={10} fill="#FFD700" fontWeight="bold">*</text>
        </g>
      );
    }

    return features;
  };

  const patternId = `pattern-${traits.patternType}`;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className="drop-shadow-lg"
      animate={animated ? { y: [0, -3, 0] } : undefined}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <defs>
        {/* Background glow */}
        <radialGradient id="mentor-bg-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor={colors.glow} stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>

        {/* Body gradient */}
        <linearGradient id="mentor-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>

        {/* Glow filter */}
        <filter id="mentor-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Pattern */}
        {renderPattern()}
      </defs>

      {/* Background glow */}
      <circle cx={100} cy={100} r={90} fill="url(#mentor-bg-glow)" />

      {/* Tier features (behind body) */}
      {renderTierFeatures()}

      {/* Main body */}
      <path
        d={bodyPath}
        fill="url(#mentor-body-grad)"
        stroke={colors.secondary}
        strokeWidth={2}
        filter="url(#mentor-glow)"
      />

      {/* Pattern overlay */}
      {traits.patternType > 0 && (
        <path
          d={bodyPath}
          fill={`url(#${patternId})`}
        />
      )}

      {/* Eyes */}
      {renderEyes()}

      {/* Inner glow/core */}
      <circle cx={100} cy={115} r={12} fill={colors.glow} opacity={0.3} />
    </motion.svg>
  );
});

export default MentorPetSprite;
