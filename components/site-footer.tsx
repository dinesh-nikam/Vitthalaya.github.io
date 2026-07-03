import Link from 'next/link';

const FOOTER_LINKS = {
  content: [
    { href: '/explore', label: 'एक्सप्लोर' },
    { href: '/library', label: 'लायब्ररी' },
    { href: '/saints', label: 'संत' },
    { href: '/wari', label: 'वारी' },
    { href: '/learn', label: 'शिका' },
    { href: '/search', label: 'शोध' },
  ],
  community: [
    { href: '/community', label: 'समुदाय' },
    { href: '/community/corrections', label: 'सुधारणा' },
    { href: '/community/feedback', label: 'प्रतिक्रिया' },
    { href: '/leaderboard', label: 'लीडरबोर्ड' },
  ],
  about: [
    { href: '/about', label: 'बद्दल' },
    { href: '/donate', label: 'सहयोग' },
    { href: '/store', label: 'भंडार' },
    { href: '/account', label: 'खाते' },
  ],
};

export function SiteFooter() {
  return (
    <footer role="contentinfo" className="border-t py-12 bg-saffron/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-marathiHeading text-xl text-saffron font-bold">
              डिजिटल पंढरपूर
            </Link>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              मराठी भक्ती साहित्याचा डिजिटल संग्रह. वारकरी संप्रदायाचे साहित्य, संत, अभंग आणि परंपरा.
            </p>
          </div>

          {/* Content Links */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">साहित्य</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.content.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-saffron transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">समुदाय</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.community.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-saffron transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Links */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">बद्दल</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.about.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-saffron transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © २०२६ डिजिटल पंढरपूर. मराठी भक्ती साहित्याचे डिजिटल संग्रह.
          </p>
          <p className="text-xs text-muted-foreground">
            विठ्ठलाच्या चरणी अर्पण 🙏
          </p>
        </div>
      </div>
    </footer>
  );
}
