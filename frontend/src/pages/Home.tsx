import React, { useMemo } from 'react';
import { Hero } from '../components/Hero';
import { RoadmapBalloons } from '../components/RoadmapBalloons';
import { PillarsAccordion } from '../components/PillarsAccordion';

function isLiteMode(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /phantom|solflare|backpack|glow|trust/i.test(ua) ||
    (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function Home() {
  const lite = useMemo(() => isLiteMode(), []);

  return (
    <main className="relative overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://i.imgur.com/7FAr6ck.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          opacity: lite ? 0.08 : 0.15,
          filter: lite ? 'none' : 'brightness(0.8) contrast(1.2) saturate(1.0)',
        }}
      />

      {!lite && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.4) 70%),
              linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.2) 100%)
            `,
          }}
        />
      )}

      <div className="relative z-10">
        <Hero />
        <RoadmapBalloons />
        <PillarsAccordion />
      </div>
    </main>
  );
}