import Link from 'next/link';
import LogoutButton from './LogoutButton';
import ThemeToggle from './ThemeToggle';

export default function Top({ name, active }) {
  return (
    <header className="nav wrap">
      <nav className="bar glass" aria-label="Main">
        <Link href="/" className="brand">Mesa War Room<span>C4 · Term 2</span></Link>
        <div className="links">
          <Link href="/" className="pill" aria-current={active === 'board' ? 'page' : undefined}>Board</Link>
          <Link href="/sources" className="pill" aria-current={active === 'sources' ? 'page' : undefined}>Sources</Link>
          <ThemeToggle />
          {name && <span className="who">{name.split(' ')[0]}</span>}
          <LogoutButton />
        </div>
      </nav>
    </header>
  );
}
