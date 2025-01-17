import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { PinIcon } from '@/components/icons/PinIcon';
import { BeakerIcon } from '@/components/icons/BeakerIcon';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function Home() {
  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} flex items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]`}>
      <Link
        href="/drone-map"
        className="flex flex-col items-center justify-center gap-4 border-2 border-gray-800 p-8 rounded bg-gray-800 w-56">
        <PinIcon className="h-16 w-16" />
        <h1 className="text-2xl">Drone Demo</h1>
      </Link>
      <Link
        href="/echo-test"
        className="flex flex-col items-center justify-center gap-4 border-2 border-gray-800 p-8 rounded bg-gray-800 w-56">
        <BeakerIcon className="h-16 w-16" />
        <h1 className="text-2xl">Echo Test</h1>
      </Link>
    </div>
  );
}
