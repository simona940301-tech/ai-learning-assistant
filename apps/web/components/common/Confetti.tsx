'use client';

import { useEffect, useState } from 'react';

interface ConfettiProps {
  show: boolean;
  duration?: number; // Duration in ms (default: 2000ms)
}

/**
 * Confetti animation for mission completion
 * Requirement: < 2.5s duration, respects prefers-reduced-motion
 */
export function Confetti({ show, duration = 2000 }: ConfettiProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!visible) return null;

  // Generate random confetti pieces
  const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 0.5,
    color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'][
      Math.floor(Math.random() * 6)
    ],
  }));

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 overflow-hidden"
      role="presentation"
      aria-hidden="true"
    >
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            backgroundColor: piece.color,
          }}
        />
      ))}

      <style jsx>{`
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confetti-fall linear forwards;
        }

        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        /* Disable animation if user prefers reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .confetti-piece {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
