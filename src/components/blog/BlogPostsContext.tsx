'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_BLOG_SETTINGS, type BlogHubTemplate } from '@/lib/blog-design';
import type { BlogCardPost } from '@/lib/blog-sections';

export type BlogHubData = {
  /** Every published post, newest first */
  posts: BlogCardPost[];
  tags: Array<{ tag: string; count: number }>;
  activeTag: string | null;
  query: string;
  /** Posts the page's Featured section shows, so the feed can skip them */
  featuredIds: number[];
  /** Blog template from Admin → Blog → Design; sections without their own variant follow it */
  template: BlogHubTemplate;
  /** Byline for posts without an author */
  defaultAuthor: string;
};

const EMPTY: BlogHubData = {
  posts: [],
  tags: [],
  activeTag: null,
  query: '',
  featuredIds: [],
  template: DEFAULT_BLOG_SETTINGS.hubTemplate,
  defaultAuthor: DEFAULT_BLOG_SETTINGS.author.name,
};

const BlogHubContext = createContext<BlogHubData>(EMPTY);

export function BlogHubProvider({ value, children }: { value: BlogHubData; children: ReactNode }) {
  return <BlogHubContext.Provider value={value}>{children}</BlogHubContext.Provider>;
}

/** Hub data for blog_* sections; outside /blog (e.g. admin preview elsewhere) the sections render empty states. */
export function useBlogHub(): BlogHubData {
  return useContext(BlogHubContext);
}
