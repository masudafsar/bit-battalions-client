import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";

export default function FullscreenButton() {
  const [active, setActive] = useState(Boolean(document.fullscreenElement));
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => {
      setActive(Boolean(document.fullscreenElement));
      setError("");
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 4500);
    return () => clearTimeout(timer);
  }, [error]);
  async function toggle() {
    try {
      setError("");
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setError("Fullscreen is unavailable in this browser window.");
    }
  }
  const label = active ? "Exit fullscreen" : "Enter fullscreen";
  const Icon = active ? Minimize : Maximize;
  return (
    <div className="relative flex">
      <button
        onClick={toggle}
        aria-label={label}
        aria-pressed={active}
        title={label}
        className="rounded-lg border border-line p-2.5 text-accent hover:bg-selected"
      >
        <Icon size={15} />
      </button>
      {error && (
        <span
          role="status"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-line bg-paper p-3 text-xs text-ink shadow-lg"
        >
          {error}
        </span>
      )}
    </div>
  );
}
