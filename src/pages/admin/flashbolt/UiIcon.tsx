import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpDown, BookOpen, Check, CircleHelp, Copy, ExternalLink, Folder, History, List, Mic, Minus, Pencil, Plus, Search, Shuffle, Sparkles, Volume2, X, Zap } from "lucide-react";

const icons = { "⇩": ArrowDownToLine, "←": ArrowLeft, "→": ArrowRight, "⇅": ArrowUpDown, "▱": BookOpen, "✓": Check, "◐": CircleHelp, "⧉": Copy, "↗": ExternalLink, "□": Folder, "◴": History, "▤": List, "◉": Mic, "−": Minus, "✎": Pencil, "＋": Plus, "⌕": Search, "⇄": Shuffle, "♪": Volume2, "◖": Volume2, "✦": Sparkles, "×": X, "◆": Zap };
export default function UiIcon({ symbol }: { symbol: keyof typeof icons }) {
  const Icon = icons[symbol];
  return <Icon className="flashbolt-ui-icon" aria-hidden="true" />;
}
