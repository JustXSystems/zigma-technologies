'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ResourcePost } from '@/lib/resources';

export type BlogPostsData = {
  posts: ResourcePost[];
  allPosts: ResourcePost[];
  tags: string[];
  activeTag: string | null;
  query: string | null;
};

const BlogPostsContext = createContext<BlogPostsData | null>(null);

export function BlogPostsProvider({ value, children }: { value: BlogPostsData; children: ReactNode }) {
  return <BlogPostsContext.Provider value={value}>{children}</BlogPostsContext.Provider>;
}

export function useBlogPosts(): BlogPostsData {
  const ctx = useContext(BlogPostsContext);
  if (ctx) return ctx;
  return { posts: [], allPosts: [], tags: [], activeTag: null, query: null };
}
