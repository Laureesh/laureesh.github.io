import { useEffect, useState } from "react";
import type { ProjectShowcaseItem } from "../data/projectShowcase";
import {
  getPublicBlogPostBySlug,
  listPublicBlogPosts,
  listPublicSiteLinks,
  listPublicSiteProjects,
  type PublicSiteLink,
  type ResolvedBlogPost,
} from "../services/cmsContent";
import {
  getDefaultPageContent,
  getResolvedPageContent,
  type EditablePageKey,
  type ResolvedPageContent,
} from "../services/pageContent";

export function usePublicBlogPosts() {
  const [posts, setPosts] = useState<ResolvedBlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const nextPosts = await listPublicBlogPosts();

      if (!cancelled) {
        setPosts(nextPosts);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { posts, loading };
}

export function usePublicBlogPost(slug?: string) {
  const [post, setPost] = useState<ResolvedBlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!slug) {
      setPost(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      setLoading(true);
      const nextPost = await getPublicBlogPostBySlug(slug);

      if (!cancelled) {
        setPost(nextPost);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { post, loading };
}

export function usePublicSiteProjects() {
  const [projects, setProjects] = useState<ProjectShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const nextProjects = await listPublicSiteProjects();

      if (!cancelled) {
        setProjects(nextProjects);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { projects, loading };
}

export function usePublicSiteLinks(category?: string) {
  const [links, setLinks] = useState<PublicSiteLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const nextLinks = await listPublicSiteLinks(category);

      if (!cancelled) {
        setLinks(nextLinks);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [category]);

  return { links, loading };
}

export function usePageContent(pageKey: EditablePageKey) {
  const [content, setContent] = useState<ResolvedPageContent>(() => getDefaultPageContent(pageKey));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setContent(getDefaultPageContent(pageKey));

    void (async () => {
      setLoading(true);
      const nextContent = await getResolvedPageContent(pageKey);

      if (!cancelled) {
        setContent(nextContent);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  return { content, loading };
}
