import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileVideo2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Upload,
  Youtube,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import ffmpegWorkerUrl from "@ffmpeg/ffmpeg/worker?url";
import ffmpegCoreUrl from "@ffmpeg/core?url";
import ffmpegWasmUrl from "@ffmpeg/core/wasm?url";
import "./MediaConverter.css";

type EngineState = "idle" | "loading" | "ready" | "error";
type ConvertState = "idle" | "running" | "done" | "error";

const MAX_LOG_LINES = 8;

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function sanitizeFileStem(name: string) {
  return name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "converted-video";
}

export default function MediaConverter() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const listenersBoundRef = useRef(false);
  const [engineState, setEngineState] = useState<EngineState>("idle");
  const [engineMessage, setEngineMessage] = useState("Load the browser converter to start transcoding WebM files into MP4.");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [convertState, setConvertState] = useState<ConvertState>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Choose a local `.webm` file to begin.");
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("converted-video.mp4");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  useEffect(() => {
    return () => {
      ffmpegRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  async function ensureEngineLoaded() {
    if (ffmpegRef.current?.loaded) {
      return ffmpegRef.current;
    }

    setEngineState("loading");
    setEngineMessage("Loading FFmpeg/WASM into your browser. This can take a moment the first time.");
    setErrorMessage(null);

    const ffmpeg = ffmpegRef.current ?? new FFmpeg();
    ffmpegRef.current = ffmpeg;

    if (!listenersBoundRef.current) {
      ffmpeg.on("log", ({ message }) => {
        setLogs((current) => [...current.slice(-(MAX_LOG_LINES - 1)), message]);
      });

      ffmpeg.on("progress", ({ progress: nextProgress }) => {
        setProgress(Math.max(0, Math.min(1, nextProgress)));
      });

      listenersBoundRef.current = true;
    }

    try {
      await ffmpeg.load({
        classWorkerURL: ffmpegWorkerUrl,
        coreURL: ffmpegCoreUrl,
        wasmURL: ffmpegWasmUrl,
      });
      setEngineState("ready");
      setEngineMessage("Browser converter loaded. You can convert local WebM files now.");
      return ffmpeg;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load the FFmpeg engine.";
      setEngineState("error");
      setEngineMessage("The browser converter could not be loaded.");
      setErrorMessage(message);
      throw error;
    }
  }

  async function handleConvert() {
    if (!selectedFile) {
      setErrorMessage("Pick a `.webm` file before starting the conversion.");
      return;
    }

    setConvertState("running");
    setProgress(0);
    setLogs([]);
    setErrorMessage(null);
    setStatusMessage("Preparing the conversion workspace.");

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    const ffmpeg = await ensureEngineLoaded();
    const inputName = `${sanitizeFileStem(selectedFile.name)}.webm`;
    const outputName = `${sanitizeFileStem(selectedFile.name)}.mp4`;

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));
      setStatusMessage("Converting to MP4 in your browser.");

      const preferredExitCode = await ffmpeg.exec([
        "-i",
        inputName,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputName,
      ]);

      if (preferredExitCode !== 0) {
        setStatusMessage("Primary conversion profile failed. Trying a fallback MP4 profile.");

        await ffmpeg.exec([
          "-i",
          inputName,
          "-c:v",
          "mpeg4",
          "-q:v",
          "5",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          outputName,
        ]);
      }

      const output = await ffmpeg.readFile(outputName);
      const bytes = output instanceof Uint8Array ? output : new Uint8Array();
      const plainBytes = new Uint8Array(bytes.byteLength);
      plainBytes.set(bytes);
      const blob = new Blob([plainBytes], { type: "video/mp4" });
      const nextUrl = URL.createObjectURL(blob);
      setDownloadUrl(nextUrl);
      setDownloadName(outputName);
      setConvertState("done");
      setProgress(1);
      setStatusMessage("Conversion finished. Your MP4 download is ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Conversion failed.";
      setConvertState("error");
      setErrorMessage(message);
      setStatusMessage("The browser could not finish this conversion.");
    }
  }

  function handleFileSelection(file: File | null) {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    setSelectedFile(file);
    setConvertState("idle");
    setProgress(0);
    setLogs([]);
    setErrorMessage(null);
    setStatusMessage(file ? "File selected. Load the engine or start conversion." : "Choose a local `.webm` file to begin.");
  }

  return (
    <div className="media-converter-page">
      <div className="media-converter-shell">
        <header className="media-converter-hero">
          <div className="media-converter-kicker">Browser Utility</div>
          <h1>Media Converter</h1>
          <p>
            Convert local WebM files into MP4 directly in the browser with FFmpeg/WASM.
            The YouTube section stays intentionally limited so this page does not act like a downloader.
          </p>
          <div className="media-converter-actions">
            <Link to="/projects" className="media-converter-backlink">
              <ArrowLeft size={16} /> Back to Projects
            </Link>
            <button
              type="button"
              className="media-converter-secondary"
              onClick={() => {
                void ensureEngineLoaded();
              }}
              disabled={engineState === "loading"}
            >
              {engineState === "loading" ? <Loader2 size={16} className="spin" /> : <FileVideo2 size={16} />}
              {engineState === "ready" ? "Engine Loaded" : "Load Converter Engine"}
            </button>
          </div>
        </header>

        <section className="media-converter-grid">
          <article className="media-converter-card media-converter-card--primary">
            <div className="media-converter-card-head">
              <div>
                <p className="media-converter-label">WebM to MP4</p>
                <h2>Local file conversion</h2>
              </div>
              <span className={`media-converter-badge media-converter-badge--${engineState}`}>
                {engineState === "idle" && "Engine idle"}
                {engineState === "loading" && "Loading"}
                {engineState === "ready" && "Ready"}
                {engineState === "error" && "Load error"}
              </span>
            </div>

            <p className="media-converter-copy">{engineMessage}</p>

            <label className="media-converter-dropzone">
              <input
                type="file"
                accept="video/webm,.webm"
                onChange={(event) => {
                  handleFileSelection(event.target.files?.[0] ?? null);
                }}
              />
              <Upload size={22} />
              <strong>{selectedFile ? selectedFile.name : "Choose a WebM file"}</strong>
              <span>
                {selectedFile
                  ? `${formatBytes(selectedFile.size)} • ${selectedFile.type || "video/webm"}`
                  : "Pick a local file. Conversion happens in your browser tab."}
              </span>
            </label>

            <div className="media-converter-toolbar">
              <button
                type="button"
                className="media-converter-primary"
                onClick={() => {
                  void handleConvert();
                }}
                disabled={!selectedFile || convertState === "running"}
              >
                {convertState === "running" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                {convertState === "running" ? "Converting" : "Convert to MP4"}
              </button>
              {downloadUrl ? (
                <a href={downloadUrl} download={downloadName} className="media-converter-download">
                  <Download size={16} /> Download MP4
                </a>
              ) : null}
            </div>

            <div className="media-converter-status">
              <div className="media-converter-status-row">
                <span>{statusMessage}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="media-converter-progress">
                <span style={{ width: `${Math.max(progress * 100, convertState === "running" ? 8 : 0)}%` }} />
              </div>
            </div>

            {errorMessage ? (
              <div className="media-converter-alert media-converter-alert--error">
                <AlertTriangle size={18} />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {downloadUrl ? (
              <div className="media-converter-alert media-converter-alert--success">
                <CheckCircle2 size={18} />
                <span>Your MP4 file is ready to download.</span>
              </div>
            ) : null}

            <div className="media-converter-logpanel">
              <div className="media-converter-loghead">
                <span>Recent FFmpeg log</span>
                <span>{logs.length ? `${logs.length} lines` : "Waiting"}</span>
              </div>
              <div className="media-converter-logbody">
                {logs.length ? (
                  logs.map((line, index) => (
                    <p key={`${line}-${index}`}>{line}</p>
                  ))
                ) : (
                  <p>No conversion logs yet.</p>
                )}
              </div>
            </div>
          </article>

          <article className="media-converter-card media-converter-card--warning">
            <div className="media-converter-card-head">
              <div>
                <p className="media-converter-label">YouTube to MP4</p>
                <h2>Not supported here</h2>
              </div>
              <span className="media-converter-badge media-converter-badge--restricted">Restricted</span>
            </div>

            <p className="media-converter-copy">
              This page does not download or convert YouTube videos. That avoids shipping a tool that could violate platform
              rules or be used on content without permission.
            </p>

            <div className="media-converter-youtube-box">
              <label htmlFor="youtube-url">YouTube link</label>
              <div className="media-converter-youtube-field">
                <Youtube size={18} />
                <input
                  id="youtube-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                />
              </div>
              <div className="media-converter-alert media-converter-alert--notice">
                <ShieldAlert size={18} />
                <span>
                  {youtubeUrl.trim()
                    ? "Link detected, but direct YouTube downloading is intentionally disabled in this app."
                    : "Paste a link if you want to test the UI, but downloads remain disabled."}
                </span>
              </div>
            </div>

            <div className="media-converter-guidance">
              <h3>What this page is for</h3>
              <ul>
                <li>Converting local `.webm` files you already have permission to use.</li>
                <li>Keeping the entire conversion process inside the browser when possible.</li>
                <li>Making it obvious where the app draws the line on unsupported media sources.</li>
              </ul>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
