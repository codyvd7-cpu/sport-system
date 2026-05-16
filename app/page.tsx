'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

const DEPARTMENTS = [
  { id: 'hockey', label: 'Hockey', href: '/portal', icon: '🏑', color: 'sky', available: true },
  { id: 'hp', label: 'HP Classes', href: '/hp-login', icon: '⚡', color: 'emerald', available: true },
  { id: 'rugby', label: 'Rugby', href: '#', icon: '🏉', color: 'slate', available: false },
  { id: 'cricket', label: 'Cricket', href: '#', icon: '🏏', color: 'slate', available: false },
];

export default function LandingPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#040810', color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Photo panels */}
      <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {['/sbc-photo-4.jpg', '/sbc-photo-1.jpg', '/sbc-photo-3.jpg', '/sbc-photo-2.jpg'].map((src, i) => (
          <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
            <Image src={src} alt="" fill className="object-cover object-center"
              style={{ filter: 'saturate(0.6) brightness(0.3)' }} priority />
          </div>
        ))}
      </div>

      {/* Overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.92) 80%, rgb(0,0,0) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 55% at 50% 38%, rgba(4,8,16,0.45), transparent)' }} />

      {/* Hero — flex-1 fills available space */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 1rem 1rem' }}>
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <div style={{ width: 96, height: 96, borderRadius: 20, background: 'white', padding: 8, boxShadow: '0 25px 50px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src="/sb-logo-hd.png" alt="SBC" width={80} height={80} style={{ objectFit: 'contain', width: '100%', height: '100%' }} priority />
          </div>
        </div>
        <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(125,211,252,0.8)', marginBottom: 12 }}>
          St Benedict's College
        </p>
        <h1 style={{ fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, color: 'white', margin: 0 }}>
          HIGH PERFORMANCE
        </h1>
        <p style={{ fontSize: 'clamp(0.85rem,2vw,1.3rem)', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.7)', marginTop: 8 }}>
          Operations Platform
        </p>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.7)', marginTop: 16 }}>
          Veritas In Caritate
        </p>
      </div>

      {/* Department bar — fixed height at bottom */}
      <div style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.95)', padding: '1.25rem 1rem 1.5rem', flexShrink: 0 }}>
        <p style={{ textAlign: 'center', fontSize: 9, fontWeight: 900, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.6)', marginBottom: 16 }}>
          Select Department
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, maxWidth: 800, margin: '0 auto' }}>
          {DEPARTMENTS.map(dept => {
            const isSkySky = dept.color === 'sky';
            const isEmerald = dept.color === 'emerald';
            const cardStyle: React.CSSProperties = {
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '1rem 0.5rem',
              borderRadius: 16,
              border: dept.available
                ? isSkySky ? '1px solid rgba(14,165,233,0.25)' : isEmerald ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(51,65,85,0.4)'
                : '1px solid rgba(30,41,59,0.4)',
              background: dept.available
                ? isSkySky ? 'rgba(14,165,233,0.08)' : isEmerald ? 'rgba(16,185,129,0.08)' : 'rgba(15,23,42,0.3)'
                : 'rgba(15,23,42,0.2)',
              cursor: dept.available ? 'pointer' : 'not-allowed',
              opacity: dept.available ? 1 : 0.4,
              textAlign: 'center',
              transition: 'all 0.2s',
            };
            const content = (
              <div style={cardStyle}>
                <span style={{ fontSize: 28 }}>{dept.icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 900, color: dept.available ? 'white' : 'rgba(100,116,139,0.7)', margin: 0 }}>{dept.label}</p>
                  {!dept.available && <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(71,85,105,0.8)', marginTop: 2 }}>Coming soon</p>}
                </div>
                {dept.available && (
                  <span style={{ fontSize: 12, color: isSkySky ? 'rgb(125,211,252)' : 'rgb(110,231,183)' }}>→</span>
                )}
              </div>
            );
            return dept.available
              ? <Link key={dept.id} href={dept.href} style={{ textDecoration: 'none' }}>{content}</Link>
              : <div key={dept.id}>{content}</div>;
          })}
        </div>
      </div>
    </div>
  );
}