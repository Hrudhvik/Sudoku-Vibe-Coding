import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Sudoku', description: 'Sudoku game deployed on Vercel' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
