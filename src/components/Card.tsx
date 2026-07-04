import { SPACING, RADIUS, COLOR, TYPOGRAPHY } from '../theme';

type CardProps = {
  children: React.ReactNode;
  title?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
};

const baseStyles: React.CSSProperties = {
  padding: SPACING['4'],
  margin: SPACING['2'],
  borderRadius: RADIUS.md,
  backgroundColor: COLOR.background,
  border: `1px solid ${COLOR.border}`,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  transition: 'box-shadow 0.2s ease',
};

const variantStyles: Record<string, React.CSSProperties> = {
  default: {
    backgroundColor: COLOR.background,
    color: COLOR.foreground,
  },
  elevated: {
    backgroundColor: COLOR.background,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderColor: COLOR.border,
  },
};

export const Card = ({
  children,
  title,
  variant = 'default',
  className,
}: CardProps) => {
  const variantStyle: React.CSSProperties = {
    ...baseStyles,
    ...((variant === 'elevated') ? variantStyles.elevated : {}),
    ...((variant === 'outlined') ? variantStyles.outlined : {}),
  };

  return (
    <div style={variantStyle} className={className}>
      {title && <h2 style={{ ...TYPOGRAPHY, marginBottom: SPACING['2'] }}>{title}</h2>}
      {children}
    </div>
  );
};

export default Card;