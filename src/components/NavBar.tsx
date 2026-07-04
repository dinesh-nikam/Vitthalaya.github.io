import Link from 'next/link';
import Button from '../components/Button';

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Contact', href: '/contact' },
];

export default function NavBar() {
  return (
    <nav className="bg-background text-foreground p-2 flex flex-wrap justify-between">
      <ul className="flex items-center space-x-2">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href}>
            <Button variant="primary" className="text-sm">
              {item.label}
            </Button>
          </Link>
        ))}
      </ul>
    </nav>
    );
}