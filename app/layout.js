import './globals.css';
import './readability.css';

export const metadata = { title: 'Mesa War Room', description: 'Mid-term prep for Cohort 4, Term 2' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: [
  { media: '(prefers-color-scheme: light)', color: '#f4effe' }, { media: '(prefers-color-scheme: dark)', color: '#0d0628' } ] };

const themeScript = `try{var t=localStorage.getItem('wr-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="field" aria-hidden="true">
          <div className="orb o1" /><div className="orb o2" /><div className="orb o3" /><div className="orb o4" /><div className="grain" />
        </div>
        {children}
      </body>
    </html>
  );
}
