import React from 'react';
import { C } from '../constants';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  style,
  disabled = false,
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 4,
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: size === 'sm' ? 11 : 13,
    padding: size === 'sm' ? '4px 10px' : '6px 14px',
    transition: 'opacity 0.15s',
    opacity: disabled ? 0.6 : 1,
  };

  const variantStyle: React.CSSProperties =
    variant === 'primary'
      ? { background: C.amber, color: '#FFFFFF' }
      : variant === 'secondary'
        ? { background: C.tag, color: C.text }
        : { background: 'transparent', color: C.textSub };

  return (
    <button
      style={{ ...baseStyle, ...variantStyle, ...style }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

interface TagProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Tag: React.FC<TagProps> = ({ children, style }) => {
  const tagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    background: C.tag,
    color: C.tagText,
    padding: '2px 7px',
    borderRadius: 3,
    fontSize: 11,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    ...style,
  };
  return <span style={tagStyle}>{children}</span>;
};

interface StatusBadgeProps {
  status: string;
  style?: React.CSSProperties;
}

const statusColorMap: Record<string, { bg: string; text: string }> = {
  done: { bg: C.greenBg, text: C.green },
  generating: { bg: C.amberLight, text: C.amber },
  pending: { bg: C.tag, text: C.tagText },
  active: { bg: C.amberLight, text: C.amber },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const colors = statusColorMap[status] || statusColorMap.pending;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 6px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 500,
        fontFamily: 'Inter, sans-serif',
        background: colors.bg,
        color: colors.text,
        ...style,
      }}
    >
      {status === 'done' ? '已完成' : status === 'active' || status === 'generating' ? '进行中' : '待处理'}
    </span>
  );
};

interface SectionLabelProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, style }) => {
  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        textTransform: 'uppercase',
        color: C.textMute,
        fontSize: 9,
        letterSpacing: '0.08em',
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface ProgressBarProps {
  percent: number;
  style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percent, style }) => {
  return (
    <div
      style={{
        width: '100%',
        height: 4,
        background: C.tag,
        borderRadius: 2,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, percent))}%`,
          height: '100%',
          background: C.amber,
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
};

interface DividerProps {
  style?: React.CSSProperties;
}

export const Divider: React.FC<DividerProps> = ({ style }) => {
  return (
    <div
      style={{
        width: '100%',
        height: 1,
        background: C.border,
        ...style,
      }}
    />
  );
};