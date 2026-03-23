import { useMemo, useState } from "react";
import { Heart, Lightbulb, ThumbsUp } from "lucide-react";
import type { BlogReactionSeeds } from "../data/blogPosts";

type ReactionKey = keyof BlogReactionSeeds;

const reactionMeta: Record<
  ReactionKey,
  {
    label: string;
    icon: typeof Heart;
  }
> = {
  heart: {
    label: "Heart",
    icon: Heart,
  },
  insightful: {
    label: "Insightful",
    icon: Lightbulb,
  },
  useful: {
    label: "Useful",
    icon: ThumbsUp,
  },
};

function getReactionStorageKey(slug: string) {
  return `portfolio-blog-reactions:${slug}`;
}

function getStoredReactions(slug: string) {
  if (typeof window === "undefined") {
    return [] as ReactionKey[];
  }

  try {
    const raw = window.localStorage.getItem(getReactionStorageKey(slug));
    return raw ? (JSON.parse(raw) as ReactionKey[]) : [];
  } catch {
    return [] as ReactionKey[];
  }
}

interface BlogReactionsProps {
  slug: string;
  seeds: BlogReactionSeeds;
}

export default function BlogReactions({ slug, seeds }: BlogReactionsProps) {
  const [selectedReactions, setSelectedReactions] = useState<ReactionKey[]>(
    () => getStoredReactions(slug),
  );

  const counts = useMemo(
    () =>
      (Object.keys(seeds) as ReactionKey[]).reduce(
        (accumulator, reaction) => ({
          ...accumulator,
          [reaction]: seeds[reaction] + (selectedReactions.includes(reaction) ? 1 : 0),
        }),
        {} as Record<ReactionKey, number>,
      ),
    [seeds, selectedReactions],
  );

  const toggleReaction = (reaction: ReactionKey) => {
    setSelectedReactions((current) => {
      const next = current.includes(reaction)
        ? current.filter((item) => item !== reaction)
        : [...current, reaction];

      window.localStorage.setItem(getReactionStorageKey(slug), JSON.stringify(next));
      return next;
    });
  };

  return (
    <section className="card blog-reactions">
      <div>
        <p className="blog-surface-label">Reactions</p>
        <h3>Was this post useful?</h3>
      </div>
      <div className="blog-reaction-list">
        {(Object.keys(reactionMeta) as ReactionKey[]).map((reaction) => {
          const Icon = reactionMeta[reaction].icon;
          const active = selectedReactions.includes(reaction);

          return (
            <button
              key={reaction}
              type="button"
              className={`blog-reaction-btn ${active ? "active" : ""}`}
              onClick={() => toggleReaction(reaction)}
            >
              <Icon size={16} />
              <span>{reactionMeta[reaction].label}</span>
              <strong>{counts[reaction]}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
