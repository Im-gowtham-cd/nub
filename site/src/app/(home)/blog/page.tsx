import Link from 'next/link';
import type { Metadata } from 'next';
import { blog } from '@/lib/source';

const blogOgImage = `/og?${new URLSearchParams({ title: 'Blog', eyebrow: 'Blog' }).toString()}`;

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Writing on Nub — the all-in-one toolkit for Node.js. Notes on the thesis, the toolchain, and what ships next.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: '/blog',
    title: 'Blog',
    description: 'Writing on Nub — the all-in-one toolkit for Node.js.',
    images: [{ url: blogOgImage, width: 1200, height: 630, alt: 'Nub Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog',
    description: 'Writing on Nub — the all-in-one toolkit for Node.js. Notes on the thesis, the toolchain, and what ships next.',
    images: [blogOgImage],
  },
};

function versionRank(url: string): number {
  const m = url.match(/nub-(\d+)-(\d+)-(\d+)/);
  if (!m) return 0;
  const [, major, minor, patch] = m;
  return Number(major) * 1_000_000 + Number(minor) * 1_000 + Number(patch);
}

export default function BlogIndex() {
  const posts = [...blog.getPages()].sort((a, b) => {
    const byDate =
      new Date(b.data.date ?? 0).getTime() -
      new Date(a.data.date ?? 0).getTime();
    if (byDate !== 0) return byDate;
    const byVersion = versionRank(b.url) - versionRank(a.url);
    return byVersion !== 0 ? byVersion : b.url.localeCompare(a.url);
  });

  return (
    <div className="relative overflow-hidden bg-[#f6f8fc] text-[#0f172a]">
      {/* Background Grid & Decorative Blur */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, #2463eb 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #2463eb 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#bfd7ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2463eb]">
            <span className="size-1.5 rounded-full bg-[#2463eb]" />
            Writing
          </div>
          <h1 className="mt-6 text-[clamp(2.8rem,6vw,4.5rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#0f172a]">
            The Nub <span className="text-[#2463eb]">Blog</span>
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-lg text-[#52607a]">
            Notes on the toolkit, the thesis, and what ships next.
          </p>
        </div>

        {/* Post Grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {posts.map((post, index) => (
            <Link
              key={post.url}
              href={post.url}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#e4ecfb] bg-white p-8 shadow-[0_12px_40px_rgba(21,59,138,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#a8c6ff] hover:shadow-[0_24px_60px_rgba(21,59,138,0.12)]"
            >
              {/* Big card index overlay */}
              <div className="absolute -right-2 -top-4 text-[5.5rem] font-semibold leading-none tracking-[-0.06em] text-[#2463eb] opacity-[0.06] pointer-events-none">
                0{index + 1}
              </div>

              <div>
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[#65748f]">
                  <time>{formatDate(post.data.date)}</time>
                  <span aria-hidden>·</span>
                  <span className="text-[#2463eb] font-semibold">{post.data.author}</span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold leading-snug tracking-[-0.03em] text-[#0f172a] transition group-hover:text-[#2463eb]">
                  {post.data.title}
                </h2>
                {post.data.description ? (
                  <p className="mt-3 text-sm leading-6 text-[#5c6a84]">
                    {post.data.description}
                  </p>
                ) : null}
              </div>

              <div className="mt-8 flex items-center gap-1.5 text-sm font-semibold text-[#2463eb]">
                <span>Read article</span>
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDate(date: string | Date | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
