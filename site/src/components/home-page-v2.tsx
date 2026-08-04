'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { InstallTabs } from '@/components/install-tabs';

type HomePageV2Props = {
  nodeMajor: number;
  nodeFull: string;
};

const ecosystem = ['Node.js', 'npm', 'pnpm', 'Bun', 'Docker', 'GitHub Actions'];

const featureCards = [
  {
    id: '01',
    title: 'File Runner',
    bigStat: 'TS',
    body: 'Run TypeScript and JSX with Node-compatible behavior, sourcemaps, and tsconfig-aware resolution.',
    accent: '#2463eb',
    tag: 'nub index.ts',
  },
  {
    id: '02',
    title: 'Script Runner',
    bigStat: '24×',
    body: 'Drop in for pnpm run with fast startup, workspace filters, and CI-friendly ergonomics.',
    accent: '#1140a7',
    tag: 'nub run build',
  },
  {
    id: '03',
    title: 'CLI Launcher',
    bigStat: '19×',
    body: 'Use nubx to resolve local binaries instantly or fetch a missing CLI without wrapper tax.',
    accent: '#1857d8',
    tag: 'nubx eslint .',
  },
  {
    id: '04',
    title: 'Package Manager',
    bigStat: '5×',
    body: 'Install fast, keep your lockfile format, and ship with safer defaults for dependency trust.',
    accent: '#0f3b8c',
    tag: 'nub install',
  },
];

const benchmarkRows = [
  { label: 'TypeScript file', stat: '˜ node', unit: 'speed', note: 'Rust transpilation, stock Node execution' },
  { label: 'Script dispatch', stat: '24', unit: '×', note: 'faster than pnpm run on warm runs' },
  { label: 'Local CLI launch', stat: '19', unit: '×', note: 'faster than npx for installed binaries' },
  { label: 'Warm install', stat: '5', unit: '×', note: 'faster than pnpm large fixture benchmark' },
];

const steps = [
  { id: '01', title: 'Run TypeScript directly', body: 'Execute .ts, .tsx, decorators, JSX, and modern syntax on top of real Node.' },
  { id: '02', title: 'Replace slow script dispatch', body: 'Swap pnpm run and npx for a fast native workflow that feels immediate.' },
  { id: '03', title: 'Keep your existing ecosystem', body: 'Use your current lockfile, Node habits, and CI setup. Nub augments what you have.' },
  { id: '04', title: 'Ship with less friction', body: 'Built-in package management, Node version handling, watch mode, and dependency safety.' },
];

/* Parallax hook */
function useParallax(ref: React.RefObject<HTMLElement | null>, speed = 0.3) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.setProperty('--parallax-y', `${center * speed}px`);
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, [ref, speed]);
}

/* Primitives */
function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[82rem] px-6 sm:px-10 ${className}`}>{children}</div>;
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#bfd7ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2463eb]">
      <span className="size-1.5 rounded-full bg-[#2463eb]" />
      {children}
    </div>
  );
}

/* Hero */
function Hero({ nodeFull }: { nodeMajor: number; nodeFull: string }) {
  const bgRef = useRef<HTMLDivElement>(null);
  useParallax(bgRef, 0.18);

  return (
    <section
      className="relative min-h-[100svh] overflow-hidden border-b border-[#e3ecfb] bg-white"
      style={{ contain: 'layout' }}
    >
      <div
        ref={bgRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-[700px]"
        style={{
          transform: 'translateY(var(--parallax-y, 0px))',
          background:
            'radial-gradient(ellipse 80% 60% at 50% 10%, rgba(36,99,235,0.92) 0%, rgba(70,130,255,0.7) 35%, rgba(140,190,255,0.3) 65%, transparent 85%)',
          willChange: 'transform',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle, #2463eb 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <Container className="relative flex min-h-[100svh] flex-col justify-center pb-24 pt-28 md:pt-32">
        <div className="grid gap-16 xl:grid-cols-[1fr_1fr] xl:gap-10 xl:items-center">
          <div>
            <Kicker>TypeScript-first Node toolkit</Kicker>
            <h1
              className="mt-6 text-[clamp(3.2rem,8vw,7rem)] font-semibold leading-[0.88] tracking-[-0.06em] text-white"
              style={{ textShadow: '0 2px 40px rgba(0,0,0,0.18)' }}
            >
              One toolkit.
              <br />
              <span className="text-[#c7dcff]">Real Node.</span>
              <br />
              Much faster.
            </h1>
            <p className="mt-6 max-w-[30rem] text-pretty text-[1.15rem] leading-8 text-[#dceeff]">
              Nub redesigns the JavaScript toolchain around speed and clarity. Run files, scripts,
              installs, and CLIs through a cleaner interface without replacing Node.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0f172a] transition hover:bg-[#dceeff]"
              >
                Explore docs ?
              </Link>
              <Link
                href="https://github.com/nubjs/nub"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                View GitHub
              </Link>
            </div>
            <div className="mt-8 max-w-[28rem] rounded-[22px] border border-white/50 bg-white/90 p-4 shadow-[0_24px_60px_rgba(20,55,130,0.2)] backdrop-blur">
              <InstallTabs className="max-w-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {featureCards.map((card) => (
              <div
                key={card.id}
                className="group relative overflow-hidden rounded-[24px] border border-[#e4ecfb] bg-white p-5 shadow-[0_12px_40px_rgba(21,59,138,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(21,59,138,0.14)]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2463eb]">
                  {card.id}
                </div>
                <div
                  className="mt-2 text-[3rem] font-semibold leading-none tracking-[-0.06em]"
                  style={{ color: card.accent }}
                >
                  {card.bigStat}
                </div>
                <h3 className="mt-3 text-base font-semibold text-[#0f172a]">{card.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#5c6a84]">{card.body}</p>
                <div className="mt-4 rounded-xl border border-[#e4ecfb] bg-[#f7faff] px-3 py-2 font-mono text-[11px] text-[#2463eb]">
                  {card.tag}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 rounded-[26px] border border-[#e4ecfb] bg-white/80 px-6 py-5 shadow-[0_16px_50px_rgba(16,45,102,0.07)] backdrop-blur">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#66738a]">
            Works with the stack you already use
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {ecosystem.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#edf2fb] bg-[#f8fbff] px-4 py-3 text-center text-sm font-semibold text-[#0f172a]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/* How it works — sticky scroll */
function HowItWorks() {
  return (
    <section className="relative border-b border-[#e3ecfb] bg-[#f6f8fc] py-24 md:py-36">
      <Container>
        <div className="grid gap-16 xl:grid-cols-[1fr_1fr] xl:gap-20">
          <div className="xl:sticky xl:top-24 xl:self-start">
            <Kicker>How Nub works</Kicker>
            <h2 className="mt-6 text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-[#0f172a]">
              A cleaner path
              <br />
              from command
              <br />
              <span className="text-[#2463eb]">to shipped.</span>
            </h2>
            <p className="mt-5 max-w-[28rem] text-pretty text-[1.05rem] leading-8 text-[#52607a]">
              Point Nub at your existing project. Keep your existing habits.
              Let the heavy lifting happen underneath.
            </p>
            <div className="mt-8 overflow-hidden rounded-[24px] border border-[#e4ecfb] bg-[#0f172a] shadow-[0_24px_60px_rgba(15,23,42,0.3)]">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="size-2.5 rounded-full bg-[#ff9b8a]" />
                <span className="size-2.5 rounded-full bg-[#ffd86b]" />
                <span className="size-2.5 rounded-full bg-[#74d7a7]" />
                <span className="ml-2 text-[11px] font-medium text-white/40">terminal</span>
              </div>
              <div className="space-y-2 p-4 font-mono text-sm">
                <div className="text-[#ff9b8a]">$ nub run build --filter web</div>
                <div className="text-white/40">loading workspace graph...</div>
                <div className="text-white/40">dispatching build script...</div>
                <div className="text-[#74d7a7]">done in 14.7ms</div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className={`rounded-[28px] border p-7 transition-all ${
                  i === 0
                    ? 'border-[#a8c6ff] bg-white shadow-[0_20px_50px_rgba(36,99,235,0.10)]'
                    : 'border-[#e7eef9] bg-white hover:border-[#a8c6ff] hover:shadow-[0_12px_36px_rgba(36,99,235,0.06)]'
                }`}
              >
                <div className="flex items-start gap-5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef4ff] text-base font-semibold text-[#2463eb]">
                    {step.id}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#0f172a]">{step.title}</h3>
                    <p className="mt-2 text-[0.95rem] leading-7 text-[#5d6b84]">{step.body}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="overflow-hidden rounded-[28px] border border-[#e4ecfb] bg-white shadow-[0_20px_50px_rgba(21,59,138,0.08)]">
              <div className="bg-[linear-gradient(135deg,#1f63ea_0%,#2563eb_100%)] px-6 py-4 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">execution path</p>
                <h3 className="mt-1 text-lg font-semibold">From command to shipped build</h3>
              </div>
              <div className="divide-y divide-[#e7eef9]">
                {[
                  ['Resolve entrypoint', 'tsconfig, env files, imports'],
                  ['Transpile in Rust', 'fast native TypeScript transformation'],
                  ['Run on Node', 'real Node process, flags, signals'],
                  ['Manage install + watch', 'workspace commands, safe deps'],
                ].map(([title, body], i) => (
                  <div key={title} className="flex items-start gap-4 px-6 py-4">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#eff5ff] text-xs font-semibold text-[#2463eb]">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#111b2b]">{title}</div>
                      <div className="text-xs leading-5 text-[#617089]">{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* Benchmarks — big font */
function Benchmarks() {
  const ref = useRef<HTMLDivElement>(null);
  useParallax(ref, 0.08);

  return (
    <section className="relative overflow-hidden border-b border-[#e3ecfb] bg-white py-24 md:py-36">
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none absolute -right-48 top-0 h-[600px] w-[600px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #2463eb 0%, transparent 70%)',
          transform: 'translateY(var(--parallax-y, 0px))',
          willChange: 'transform',
        }}
      />
      <Container className="relative">
        <div className="flex flex-col items-center text-center">
          <Kicker>Benchmarks</Kicker>
          <h2 className="mt-6 text-[clamp(2.4rem,5vw,4.2rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-[#0f172a]">
            Performance that
            <br />
            <span className="text-[#2463eb]">sits on the page.</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {benchmarkRows.map((item, i) => (
            <div
              key={item.label}
              className="group relative overflow-hidden rounded-[28px] border border-[#e4ecfb] bg-[#f8fbff] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#a8c6ff] hover:bg-white hover:shadow-[0_24px_60px_rgba(21,59,138,0.12)]"
            >
              <div
                className="text-[4.5rem] font-semibold leading-none tracking-[-0.07em]"
                style={{ color: i === 0 ? '#0f172a' : '#2463eb' }}
              >
                {item.stat}
              </div>
              <div className="text-[1.5rem] font-semibold tracking-[-0.04em] text-[#2463eb]">
                {item.unit}
              </div>
              <div className="mt-4 text-sm font-semibold text-[#0f172a]">{item.label}</div>
              <p className="mt-1.5 text-xs leading-5 text-[#65748f]">{item.note}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {[
            ['Cold start', 'fast'],
            ['Watch mode', 'native'],
            ['Lock-in', 'none'],
            ['Install trust', 'safe by default'],
          ].map(([label, state]) => (
            <div key={label} className="rounded-full border border-[#dce7fb] bg-[#f7faff] px-4 py-2 text-sm text-[#334155]">
              <span className="font-semibold text-[#0f172a]">{label}</span>
              <span className="mx-2 text-[#b8c7df]">·</span>
              <span className="text-[#2463eb]">{state}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* Feature grid */
function Features() {
  return (
    <section className="relative border-b border-[#e3ecfb] bg-[#f6f8fc] py-24 md:py-36">
      <Container>
        <div className="flex flex-col items-center text-center">
          <Kicker>What you can do</Kicker>
          <h2 className="mt-6 text-[clamp(2.4rem,5vw,4.2rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-[#0f172a]">
            Everything that usually
            <br />
            <span className="text-[#2463eb]">needs four tools.</span>
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-[1.05rem] leading-8 text-[#52607a]">
            Nub is not another runtime to learn. It is the fast layer around the Node workflow your team already knows.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {featureCards.map((card) => (
            <div
              key={card.id}
              className="group relative overflow-hidden rounded-[32px] border border-[#e4ecfb] bg-white p-8 shadow-[0_12px_40px_rgba(21,59,138,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(21,59,138,0.12)]"
            >
              <div
                className="text-[6rem] font-semibold leading-none tracking-[-0.06em] opacity-[0.08]"
                style={{ color: card.accent }}
              >
                {card.id}
              </div>
              <div className="-mt-6">
                <div className="inline-flex rounded-full border border-[#dce7fb] bg-[#f7faff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2463eb]">
                  included
                </div>
                <div
                  className="mt-4 text-[4rem] font-semibold leading-none tracking-[-0.07em]"
                  style={{ color: card.accent }}
                >
                  {card.bigStat}
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#0f172a]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#5c6a84]">{card.body}</p>
                <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#e4ecfb] bg-[#f8fbff] px-4 py-3">
                  <span className="font-mono text-sm text-[#2463eb]">{card.tag}</span>
                  <span className="text-xs text-[#94a3b8]">?</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* CTA */
function CTA() {
  return (
    <section className="relative py-24 md:py-36">
      <Container>
        <div className="relative overflow-hidden rounded-[40px] bg-[linear-gradient(135deg,#0f2d6a_0%,#1140a7_30%,#2563eb_60%,#5b9bff_100%)] px-10 py-14 text-white shadow-[0_40px_100px_rgba(19,59,153,0.35)] md:px-16 md:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                Ready to try it
              </div>
              <h2 className="mt-5 text-[clamp(2rem,5vw,3.8rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
                Install Nub and keep
                <br />
                the rest of your workflow
                <br />
                <span className="text-[#c7dcff]">exactly where it is.</span>
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">
                Faster startup, safer installs, real Node semantics without replacing anything.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#0f172a] transition hover:bg-[#dceeff]"
              >
                Read the docs ?
              </Link>
              <Link
                href="/blog/introducing-nub"
                className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Read the launch post
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function HomePageV2({ nodeMajor, nodeFull }: HomePageV2Props) {
  return (
    <main className="relative overflow-hidden bg-[#f6f8fc] text-[#0f172a]">
      <Hero nodeMajor={nodeMajor} nodeFull={nodeFull} />
      <HowItWorks />
      <Benchmarks />
      <Features />
      <CTA />
    </main>
  );
}

