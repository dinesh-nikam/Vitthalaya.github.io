'use client';

/**
 * Header Navigation — 5-pillar navigation with user dropdown.
 * Keyboard accessible with arrow key navigation and focus management.
 */
import * as React from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, User, BookOpen, BarChart3, Settings, LogOut, ShoppingBag } from 'lucide-react';
import { CartIcon } from './cart-icon';
import { ThemeToggle } from './theme-toggle';

const PILLAR_LINKS = [
  { href: '/explore', label: 'एक्सप्लोर' },
  { href: '/library', label: 'लायब्ररी' },
  { href: '/saints', label: 'संत' },
  { href: '/wari', label: 'वारी' },
  { href: '/learn', label: 'शिका' },
  { href: '/about', label: 'बद्दल' },
  { href: '/donate', label: 'सहयोग' },
];

export function HeaderNav() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape key and restore focus to trigger
  React.useEffect(() => {
    if (!showUserMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showUserMenu]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className="flex items-center gap-1 sm:gap-2" aria-label="मुख्य नेव्हिगेशन">
      {/* Desktop 5 Pillar Links */}
      <div className="hidden md:flex items-center gap-0.5">
        {PILLAR_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium px-2.5 py-2 rounded-lg transition-colors ${
              isActive(href)
                ? 'text-saffron bg-saffron/10'
                : 'text-foreground hover:text-saffron hover:bg-saffron/5'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Search trigger — opens search overlay on mobile */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-search-overlay'))}
        className="p-2 hover:bg-saffron/10 rounded-lg transition-colors text-muted-foreground hover:text-saffron"
        aria-label="शोधा"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Cart */}
      <CartIcon />

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* User Menu */}
      <div className="relative" ref={menuRef}>
        <button
          ref={triggerRef}
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={`p-2 rounded-lg transition-colors ${
            showUserMenu ? 'bg-saffron/10 text-saffron' : 'text-muted-foreground hover:text-saffron hover:bg-saffron/10'
          }`}
          aria-label="वापरकर्ता मेनू"
          aria-expanded={showUserMenu}
          aria-haspopup="true"
          aria-controls={showUserMenu ? 'user-menu' : undefined}
        >
          <User className="w-4 h-4" />
        </button>

        {showUserMenu && (
          <div
            id="user-menu"
            role="menu"
            aria-label="वापरकर्ता मेनू"
            className="absolute right-0 top-full mt-2 w-56 bg-card border border-saffron/20 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {session ? (
              <div className="py-1">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-saffron/10">
                  <p className="text-sm font-medium truncate text-foreground">
                    {session.user?.name || 'वापरकर्ता'}
                  </p>
                  {session.user?.email && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {session.user.email}
                    </p>
                  )}
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <UserMenuItem href={`/profile/${(session.user as any).id}`} icon={<User className="w-4 h-4" />} label="प्रोफाइल" />
                  <UserMenuItem href="/reading-lists" icon={<BookOpen className="w-4 h-4" />} label="वाचन सूची" />
                  <UserMenuItem href="/orders" icon={<ShoppingBag className="w-4 h-4" />} label="ऑर्डर्स" />
                  <UserMenuItem href="/community" icon={<BarChart3 className="w-4 h-4" />} label="समुदाय" />
                  <UserMenuItem href="/about" icon={<BookOpen className="w-4 h-4" />} label="बद्दल" />
                  <UserMenuItem href="/donate" icon={<ShoppingBag className="w-4 h-4" />} label="सहयोग" />
                  {isAdmin && (
                    <UserMenuItem href="/admin" icon={<Settings className="w-4 h-4" />} label="प्रशासन" />
                  )}
                </div>

                {/* Logout */}
                <div className="border-t border-saffron/10 pt-1 pb-1">
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    बाहेर पडा
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-3 px-4 space-y-2">
                <Link
                  href="/login"
                  onClick={() => setShowUserMenu(false)}
                  className="block w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-saffron rounded-lg hover:bg-saffron/90 transition-colors"
                >
                  प्रवेश करा (Log In)
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setShowUserMenu(false)}
                  className="block w-full text-center px-4 py-2.5 text-sm font-medium text-saffron border border-saffron/20 rounded-lg hover:bg-saffron/5 transition-colors"
                >
                  नोंदणी करा (Sign Up)
                </Link>
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  वाचन सूची, बुकमार्क आणि अधिक
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function UserMenuItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      role="menuitem"
      tabIndex={0}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-saffron/5 transition-colors focus:outline-none focus:bg-saffron/10"
    >
      <span className="text-muted-foreground shrink-0" aria-hidden="true">{icon}</span>
      {label}
    </Link>
  );
}
