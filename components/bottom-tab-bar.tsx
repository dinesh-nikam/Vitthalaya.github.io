'use client';

/**
 * BottomTabBar — mobile bottom navigation with 5 primary tabs.
 * Desktop: hidden (lg:hidden). 
 * Tabs: Home, Search, Library, Saints, More
 */
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, BookOpen, User, Menu, X, Compass, Map, GraduationCap, Users, ShoppingBag, ExternalLink } from 'lucide-react';

interface Tab {
  href: string;
  icon: React.ReactNode;
  label: string;
  match: string | string[];
}

const PRIMARY_TABS: Tab[] = [
  { href: '/', icon: <Home className="w-5 h-5" />, label: 'मुख्य', match: '/' },
  { href: '/search', icon: <Search className="w-5 h-5" />, label: 'शोध', match: '/search' },
  { href: '/library', icon: <BookOpen className="w-5 h-5" />, label: 'साहित्य', match: '/library' },
  { href: '/saints', icon: <User className="w-5 h-5" />, label: 'संत', match: ['/saints', '/sant'] },
  { href: '#more', icon: <Menu className="w-5 h-5" />, label: 'अधिक', match: '#more' },
];

const MORE_ITEMS = [
  { href: '/explore', icon: Compass, label: 'एक्सप्लोर', desc: 'नवीन साहित्य शोधा' },
  { href: '/wari', icon: Map, label: 'वारी', desc: 'पवित्र प्रवास' },
  { href: '/learn', icon: GraduationCap, label: 'शिका', desc: 'इतिहास आणि संस्कृती' },
  { href: '/community', icon: Users, label: 'समुदाय', desc: 'लीडरबोर्ड आणि योगदान' },
  { href: '/store', icon: ShoppingBag, label: 'भंडार', desc: 'पुस्तके आणि अधिक' },
  { href: '/account', icon: ExternalLink, label: 'खाते', desc: 'प्रोफाइल आणि सेटिंग्ज' },
];

function isActiveTab(tab: Tab, pathname: string): boolean {
  if (tab.href === '#more') return false;
  if (Array.isArray(tab.match)) {
    return tab.match.some((m) => pathname === m || pathname.startsWith(m + '/'));
  }
  if (tab.match === '/') return pathname === '/';
  return pathname === tab.match || pathname.startsWith(tab.match + '/');
}

export function BottomTabBar() {
  const pathname = usePathname();
  const [showMore, setShowMore] = React.useState(false);

  // Close More drawer on route change
  React.useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  return (
    <>
      {/* Primary Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-saffron/10 lg:hidden safe-area-bottom"
        aria-label="मोबाइल नेव्हिगेशन"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {PRIMARY_TABS.map((tab) => {
            const isActive = isActiveTab(tab, pathname);
            if (tab.href === '#more') {
              return (
                <button
                  key={tab.label}
                  onClick={() => setShowMore(!showMore)}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-0 px-3 py-1.5 rounded-lg transition-colors ${
                    showMore ? 'text-saffron' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={tab.label}
                  aria-expanded={showMore}
                >
                  {showMore ? <X className="w-5 h-5" /> : tab.icon}
                  <span className="text-[10px] font-medium truncate">{tab.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-0 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'text-saffron'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.icon}
                <span className="text-[10px] font-medium truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More Drawer Overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          {/* Drawer */}
          <div className="absolute bottom-16 left-0 right-0 bg-background border-t border-saffron/10 rounded-t-2xl shadow-2xl animate-slide-up max-h-[70vh] overflow-y-auto">
            <div className="p-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 px-1">
                सर्व विभाग
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {MORE_ITEMS.map(({ href, icon: Icon, label, desc }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMore(false)}
                    className="flex flex-col items-center text-center p-4 rounded-xl bg-card border border-saffron/10 hover:border-saffron/30 hover:bg-saffron/5 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-saffron/10 flex items-center justify-center mb-2">
                      <Icon className="w-5 h-5 text-saffron" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
