'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { BlogCardPost } from '@/lib/blog-sections';

export type BlogHubData = {
  /** Every published post, newest first */
  posts: BlogCardPost[];
  tags: Array<{ tag: string; count: number }>;
  activeTag: string | null;
  query: string;
  /** Posts the page's Featured section shows, so the feed can skip them */
  featuredIds: number[];
};

const EMPTY: BlogHubData = { posts: [], tags: [], activeTag: null, query: '', featuredIds: [] };

const BlogHubContext = createContext<BlogHubData>(EMPTY);

export function BlogHubProvider({ value, children }: { value: BlogHubData; children: ReactNode }) {
  return <BlogHubContext.Provider value={value}>{children}</BlogHubContext.Provider>;
}

/** Hub data for blog_* sections; outside /blog (e.g. admin preview elsewhere) the sections render empty states. */
export function useBlogHub(): BlogHubData {
  return useContext(BlogHubContext);
}
