import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface V4PageShellProps {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  stats?: Array<{ label: string; value: string | number }>;
  primaryHref?: string;
  primaryLabel?: string;
}

export function V4PageShell({
  children,
  eyebrow,
  title,
  description,
  stats = [],
  primaryHref,
  primaryLabel,
}: V4PageShellProps) {
  return (
    <div className="v4-subpage">
      <header className="v4-subpage-hero">
        <div className="v4-subpage-stars" aria-hidden="true" />
        <div className="v4-subpage-copy">
          <span className="v4-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {primaryHref && primaryLabel && (
            <Link href={primaryHref} className="v4-hero-link">
              {primaryLabel}
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
        {stats.length > 0 && (
          <div className="v4-hero-stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </header>
      <main className="v4-subpage-main">{children}</main>
    </div>
  );
}

interface V4ArtifactLinkProps {
  href: string;
  title: string;
  subtitle?: string | null;
  meta?: string;
  variant?: 'gold' | 'red' | 'blue';
}

export function V4ArtifactLink({ href, title, subtitle, meta, variant = 'gold' }: V4ArtifactLinkProps) {
  return (
    <Link href={href} className={`v4-artifact-link v4-artifact-${variant}`}>
      <span>{meta}</span>
      <strong>{title}</strong>
      {subtitle && <small>{subtitle}</small>}
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}

export function V4Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="v4-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
