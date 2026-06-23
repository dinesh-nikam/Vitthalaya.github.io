/**
 * /login redirect — catches all `redirect('/login')` calls scattered across
 * admin/orders pages and forwards to the real NextAuth sign-in page.
 */
import { redirect } from 'next/navigation';

export default function LoginPage() {
  redirect('/auth/signin');
}
