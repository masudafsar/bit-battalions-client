import { X } from "lucide-react";
export default function EditorHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute bottom-24 right-5 rounded-xl border border-line bg-paper p-6 text-[11px] shadow-lg">
      <button
        onClick={onClose}
        aria-label="Close help"
        className="absolute right-2 top-2 text-muted"
      >
        <X size={15} />
      </button>
      <strong>Make yourself at home</strong>
      <p className="mt-3 leading-loose text-muted">
        Left drag · Selected paint / orbit / pan tool
        <br />
        Right drag · Orbit camera
        <br />
        Middle drag · Pan
        <br />
        Scroll / pinch · Zoom
        <br />1 / 2 / 3 · Pick terrain
        <br />B / H / P · Paint / orbit / pan
        <br />⌘ / Ctrl + Z · Undo
      </p>
    </div>
  );
}
