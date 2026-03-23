import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Info, Copy, Check, Tag, FileText, Hash } from "lucide-react";
import "./YTTags.css";

export default function YTTags() {
  const [artist, setArtist] = useState("");
  const [songName, setSongName] = useState("");
  const [features, setFeatures] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const canGenerate = artist.trim() && songName.trim();

  const handleGenerate = () => {
    if (canGenerate) setGenerated(true);
  };

  const a = artist.trim();
  const s = songName.trim();
  const f = features.trim();
  const al = album.trim() || "single";
  const g = genre.trim();

  const titleText = f
    ? `${a} - ${s} ft. ${f} (Lyrics In Description)`
    : `${a} - ${s} (Lyrics In Description)`;

  const searchTags = [
    `${a} ${s} 1 Hour Loop`,
    `${a} ${s} 1 Hour`,
    `${a} 1 Hour Loop`,
    `${s} 1 Hour Loop`,
    `${a} 1 Hour`,
    `${s} 1 Hour`,
    `${a}`,
    `1 Hour Loops`,
    `1 Hour Version`,
    `1 Hour Music`,
    `${a} ${s}`,
    `${s} 1 Hour Version`,
    `${s}`,
    `${s} Lyrics`,
    `${al}`,
    `${a} ${s} Lyrics`,
    `${a} ${al}`,
  ].join(",\n");

  const featureStr = f ? ` ft. ${f}` : "";
  const descTags = `🎧 ${a} - ${s}${featureStr} (Audio with Lyrics In Description)
⏬ Download / Stream: [LINK]
🔔 Turn on notifications to stay updated with new uploads!

${a}
${a} audio
${a} ${s}
${a} ${s} audio
${s}
${s} audio
${s} ${a}
${s} ${a} audio${f ? `
${a} ${f}
${a} ${f} audio
${a} ${f} ${s}
${a} ${f} ${s} audio` : ""}

🎵 REQUEST A SONG ➔ [FORM LINK]

👉 Connect to ${a}'s Socials
.........

🎤 Lyrics: ${a} - ${s}
PASTE_LYRICS

.........

#${a.replace(/\s+/g, "")} #${s.replace(/\s+/g, "")}${f ? ` #${f.replace(/\s+/g, "")}` : ""} #${al.replace(/\s+/g, "")}${g ? ` #${g.replace(/\s+/g, "")}` : ""} #lyrics #audio`;

  const lyricTags = [
    `${a}`,
    `${a} audio`,
    `${a} ${s}`,
    `${a} ${s} audio`,
    `${s}`,
    `${s} audio`,
    `${s} ${a}`,
    `${s} ${a} audio`,
    ...(f ? [
      `${a} ${f}`,
      `${a} ${f} audio`,
      `${a} ${f} ${s}`,
      `${a} ${f} ${s} audio`,
      `${f}`,
      `${f} audio`,
      `${f} ${s}`,
      `${f} ${s} audio`,
    ] : []),
  ].join(",\n");

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  return (
    <div className="yttags">
      <div className="yt-container">
        <div className="yt-header">
          <h1>YouTube <span>Tag</span> Generator</h1>
          <p>Generate optimized tags, descriptions, and hashtags for YouTube videos</p>
        </div>

        <div className="yt-info-banner">
          <Info size={18} style={{ flexShrink: 0, color: "#ff0033" }} />
          <span>
            <strong>Interactive Demo</strong> — This is a recreation of the YouTube Tag Generator tool originally built with vanilla HTML, CSS &amp; JavaScript.
            <Link to="/projects">
              <ArrowLeft size={14} style={{ verticalAlign: "middle" }} /> Back to Projects
            </Link>
          </span>
        </div>

        <div className="yt-form">
          <div className="yt-field">
            <label>Artist *</label>
            <input
              type="text"
              placeholder="e.g. drake"
              value={artist}
              onChange={(e) => { setArtist(e.target.value); setGenerated(false); }}
            />
          </div>
          <div className="yt-field">
            <label>Song Name *</label>
            <input
              type="text"
              placeholder="e.g. gods plan"
              value={songName}
              onChange={(e) => { setSongName(e.target.value); setGenerated(false); }}
            />
          </div>
          <div className="yt-field">
            <label>Featured Artists</label>
            <input
              type="text"
              placeholder="e.g. lil baby"
              value={features}
              onChange={(e) => { setFeatures(e.target.value); setGenerated(false); }}
            />
          </div>
          <div className="yt-field">
            <label>Album</label>
            <input
              type="text"
              placeholder="e.g. scorpion (or leave blank for 'single')"
              value={album}
              onChange={(e) => { setAlbum(e.target.value); setGenerated(false); }}
            />
          </div>
          <div className="yt-field">
            <label>Genre</label>
            <input
              type="text"
              placeholder="e.g. hip hop"
              value={genre}
              onChange={(e) => { setGenre(e.target.value); setGenerated(false); }}
            />
          </div>
        </div>

        <div className="yt-generate">
          <button onClick={handleGenerate} disabled={!canGenerate}>
            Generate Tags
          </button>
        </div>

        {generated ? (
          <>
            <div className="yt-title-preview">
              <h3>Video Title Preview</h3>
              <p>{titleText}</p>
            </div>

            <div className="yt-outputs">
              <OutputBlock
                title="Search Tags"
                icon={<Tag size={16} />}
                text={searchTags}
                id="search"
                copied={copied}
                onCopy={copyToClipboard}
              />
              <OutputBlock
                title="Description & Tags"
                icon={<FileText size={16} />}
                text={descTags}
                id="desc"
                copied={copied}
                onCopy={copyToClipboard}
                rows={20}
              />
              <OutputBlock
                title="Lyric Video Tags"
                icon={<Hash size={16} />}
                text={lyricTags}
                id="lyric"
                copied={copied}
                onCopy={copyToClipboard}
              />
            </div>
          </>
        ) : (
          <div className="yt-empty">
            Fill in Artist and Song Name, then click Generate Tags to see results.
          </div>
        )}
      </div>
    </div>
  );
}

function OutputBlock({
  title, icon, text, id, copied, onCopy, rows = 10,
}: {
  title: string;
  icon: React.ReactNode;
  text: string;
  id: string;
  copied: string | null;
  onCopy: (text: string, id: string) => void;
  rows?: number;
}) {
  const isCopied = copied === id;
  return (
    <div className="yt-output-block">
      <div className="yt-output-header">
        <h3>{icon} {title}</h3>
        <button
          className={`yt-copy-btn ${isCopied ? "copied" : ""}`}
          onClick={() => onCopy(text, id)}
        >
          {isCopied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>
      <div className="yt-output-body">
        <textarea readOnly value={text} rows={rows} />
      </div>
    </div>
  );
}
