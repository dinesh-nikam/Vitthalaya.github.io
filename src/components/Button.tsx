import { SPACING, COLOR, RADIUS, TYPOGRAPHY, DURATION, EASING } from '../theme';

type ButtonProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

const baseStyles: React.CSSProperties = {
  padding: SPACING['4'],
  margin: SPACING['2'],
  borderRadius: RADIUS.md,
  fontWeight: TYPOGRAPHY.weightbold,
  fontSize: TYPOGRAPHY.textbase,
  cursor: 'pointer',
  outline: 'none',
  transition: `background-color ${DURATION['200']} ${EASING.default}`,
};

const styles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: COLOR.primary,
    color: 'white',
    border: `2px solid ${COLOR.primary}`,
  },
  secondary: {
    backgroundColor: 'transparent',
    color: COLOR.primary,
    border: `2px solid ${COLOR.primary}`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: COLOR.primary,
    border: 'none',
  },
};

export const Button = ({
  children,
  variant = 'primary',
  onClick,
  className,
}: ButtonProps) => {
  const style = {
    ...baseStyles,
    ...styles[variant],
  };

  return (
    <button style={style} className={className} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;