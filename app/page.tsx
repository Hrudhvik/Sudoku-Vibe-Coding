import dynamic from 'next/dynamic';
const SudokuGame = dynamic(() => import('./components/SudokuGame'), { ssr: false });
export default function Page() { return <SudokuGame />; }
