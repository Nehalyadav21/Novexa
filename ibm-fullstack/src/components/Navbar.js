'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { COLORS } from '@/lib/theme';

const Navbar = () => {
  const { data: session, status } = useSession();

  return (
    <nav className="fixed w-full bg-[#0d0d0f]/95 backdrop-blur-md border-b border-gray-800 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/novexa2.png"
                alt="Novexa"
                width={32}
                height={32}
                className="object-contain"
              />
              <span 
                className="text-xl font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`,
                }}
              >
                Novexa
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <span className="text-gray-300">Welcome, {session.user.name}</span>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 text-white border border-gray-600 rounded-md hover:bg-gray-700 transition-all"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-white rounded-md hover:opacity-90 transition-all"
                  style={{
                    background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`,
                  }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
