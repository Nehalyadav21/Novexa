'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { NovexaLogo, Particles, Field } from '@/components/ui/ThemeComponents';

const inter = Inter({ subsets: ['latin'] });

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      // Redirect to login page on successful signup
      router.push('/login?success=Account created successfully');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0d0d0f] flex items-center justify-center overflow-hidden">
      <Particles />
      <div
        className={`${inter.className} min-h-screen px-6 pt-24 pb-16 relative z-10`}
        style={{ backgroundColor: COLORS.background }}
      >
        <main className="flex justify-center items-start">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <NovexaLogo />
              <p className="mt-2 text-base text-gray-400">
                Join the Novexa community
              </p>
            </div>

            <div
              className="rounded-xl border p-6 md:p-8 relative z-20"
              style={{
                backgroundColor: "#141417",
                borderColor: COLORS.border,
              }}
            >
              <h2 className="text-2xl md:text-3xl font-semibold text-white text-center">
                Create an Account
              </h2>
              <p className="mt-2 text-center text-gray-400 text-sm">
                Get started with your Novexa journey
              </p>

              {error && (
                <div className="mt-5 rounded-md border px-3 py-2 text-sm text-red-400 border-red-600 bg-red-950">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <Field label="Full Name" htmlFor="name">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="Your full name"
                    className="w-full rounded-md bg-[#1a1a1d] px-4 py-3 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </Field>

                <Field label="Email" htmlFor="email">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="you@company.com"
                    className="w-full rounded-md bg-[#1a1a1d] px-4 py-3 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </Field>

                <Field label="Password" htmlFor="password">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full rounded-md bg-[#1a1a1d] px-4 py-3 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </Field>

                <Field label="Confirm Password" htmlFor="confirmPassword">
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full rounded-md bg-[#1a1a1d] px-4 py-3 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md px-5 py-3 font-medium text-white transition disabled:opacity-60 hover:opacity-90 cursor-pointer"
                  style={{
                    background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`,
                  }}
                >
                  {loading ? "Creating account…" : "Sign Up"}
                </button>
              </form>

              <p className="mt-6 text-center text-gray-400 text-sm">
                Already have an account?{" "}
                <Link
                  href="/login"
                  style={{ color: COLORS.secondary }}
                  className="underline underline-offset-4 hover:text-white"
                >
                  Login
                </Link>
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <Link
                href="/"
                className="px-5 py-2 text-sm font-medium text-white border border-gray-700 rounded-full hover:bg-[#1a1a1d]"
              >
                ← Get Started
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
