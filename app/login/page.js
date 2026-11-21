import LoginForm from '@/components/LoginForm';
import { googleEnabled, passwordAllowed } from '@/lib/google';

export const dynamic = 'force-dynamic';

const ERRORS = {
  not_mesa: 'That Google account isn’t a Mesa account. Choose your @…mesaschool.co account and try again.',
  unverified: 'Google hasn’t verified that email address. Use your Mesa Google account.',
  expired: 'The sign-in link expired. Try again.',
  cancelled: 'Sign-in was cancelled.',
  google_error: 'Google sign-in didn’t complete. Try again.',
  google_off: 'Google sign-in isn’t switched on yet.',
};

export default function Login({ searchParams }) {
  return <LoginForm google={googleEnabled()} password={passwordAllowed()} error={ERRORS[searchParams?.error] || ''} />;
}
