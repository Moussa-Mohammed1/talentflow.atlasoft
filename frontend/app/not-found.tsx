"use client";

import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50/40 to-white px-4 text-center">
      <div className="max-w-md">
        <img
          src="/static/404.svg"
          alt="404 illustration"
          className="mx-auto w-2/5 max-w-sm"
        />

        <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Page not found
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-500">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might
          have been removed, renamed, or doesn&apos;t exist.
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Home size={18} />
          Back to home
        </Link>
      </div>
    </div>
  );
}
