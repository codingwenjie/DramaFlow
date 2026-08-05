import React from 'react';
import { C } from '../constants';

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'editor' | 'detail';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = 'card', count = 3 }) => {
  const skeletonStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, #EEF0F4 25%, #F5F6F8 50%, #EEF0F4 75%)',
    backgroundSize: '200% 100%',
    borderRadius: 4,
    animation: 'skeleton-loading 1.5s ease-in-out infinite',
  };

  if (type === 'card') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ width: '100%', aspectRatio: '16/9', ...skeletonStyle }} />
            <div style={{ padding: 12 }}>
              <div style={{ height: 16, width: '70%', marginBottom: 8, ...skeletonStyle }} />
              <div style={{ height: 12, width: '40%', marginBottom: 8, ...skeletonStyle }} />
              <div style={{ height: 4, width: '100%', marginBottom: 8, ...skeletonStyle }} />
              <div style={{ height: 10, width: '60%', ...skeletonStyle }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 4 }}>
            <div style={{ width: 80, height: 45, ...skeletonStyle }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, width: '50%', marginBottom: 6, ...skeletonStyle }} />
              <div style={{ height: 10, width: '30%', ...skeletonStyle }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // default: simple text skeleton
  return (
    <div style={{ padding: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 14,
            width: `${60 + Math.random() * 30}%`,
            marginBottom: 10,
            ...skeletonStyle,
          }}
        />
      ))}
    </div>
  );
};

export default LoadingSkeleton;