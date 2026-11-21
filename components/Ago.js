'use client';
import { useEffect, useState } from 'react';
export default function Ago({ at }) {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    const s = Math.max(0, (Date.now() - new Date(at).getTime()) / 1000);
    setTxt(s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} d ago`);
  }, [at]);
  return <time dateTime={at}>{txt}</time>;
}
