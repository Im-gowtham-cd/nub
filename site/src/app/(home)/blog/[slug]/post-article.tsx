import Link from 'next/link';
import type { Metadata } from 'next';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import { blog } from '@/lib/source';
import { getMDXComponents } from '../../../../../mdx-components';
import { BlogTOC } from './blog-toc';

type BlogPage = NonNullable<ReturnType<typeof blog.getPage>>;

export function PostArticle({
  page,
  titleOverride,
}: {
  page: BlogPage;
  titleOverride?: string;
}) {
  const MDXContent = page.data.body;
  const hasToc = page.data.toc.length > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f8fc] text-[#0f172a]">
      {/* Background Dot Grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, #2463eb 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative mx-auto w-full min-w-0 max-w-3xl px-6 py-16 md:py-24 xl:grid xl:max-w-6xl xl:grid-cols-[minmax(0,1fr)_16rem] xl:gap-12">
        <div className="min-w-0 xl:max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#bfd7ff] bg-white/80 px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-[#2463eb] transition hover:bg-white hover:shadow-sm"
          >
            ← Back to Blog
          </Link>

          <header className="mt-8 rounded-[28px] border border-[#e4ecfb] bg-white p-8 shadow-[0_12px_40px_rgba(21,59,138,0.06)] md:p-10">
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-[#2463eb]">
              <time className="font-semibold">{formatDate(page.data.date)}</time>
              <span aria-hidden className="text-[#94a3b8]">
                ·
              </span>
              <span className="text-[#52607a] font-medium">{page.data.author}</span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.12] tracking-[-0.03em] text-[#0f172a] md:text-4xl lg:text-5xl">
              {titleOverride ?? page.data.title}
            </h1>
            {page.data.description ? (
              <p className="mt-4 text-lg leading-relaxed text-[#52607a]">
                {page.data.description}
              </p>
            ) : null}
          </header>

          {hasToc ? (
            <InlineTOC items={page.data.toc} className="mt-8 rounded-2xl border border-[#e4ecfb] bg-white p-6 xl:hidden" />
          ) : null}

          <article className="prose blog-prose mt-10 rounded-[28px] border border-[#e4ecfb] bg-white p-8 shadow-[0_12px_40px_rgba(21,59,138,0.04)] md:p-12">
            <MDXContent components={getMDXComponents()} />
          </article>
        </div>

        {/* Sticky right-gutter TOC */}
        {hasToc ? (
          <aside className="sticky top-28 hidden h-[calc(100vh-8rem)] flex-col overflow-hidden xl:flex">
            <div className="rounded-[24px] border border-[#e4ecfb] bg-white p-6 shadow-[0_12px_40px_rgba(21,59,138,0.06)]">
              <BlogTOC toc={page.data.toc} />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export function postMetadata(page: BlogPage, titleOverride?: string): Metadata {
  const { description, date, author } = page.data;
  const title = titleOverride ?? page.data.title;
  const ogImage = `/og?${new URLSearchParams({ title, eyebrow: 'Blog' }).toString()}`;

  return {
    title,
    description,
    alternates: { canonical: page.url },
    openGraph: {
      type: 'article',
      url: page.url,
      title,
      description,
      publishedTime: date ? new Date(date).toISOString() : undefined,
      authors: author ? [author] : undefined,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

function formatDate(date: string | Date | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}