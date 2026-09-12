import { useEffect, useRef, useState } from "react";
import { Shuffle, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import {
  DEFAULT_RENDER_SETTINGS,
  normalizeSettings,
  settingControls,
  type RenderSettings,
} from "../../renderSettings";
const tabs = [
  {
    id: "terrain",
    label: "Terrain",
    keys: [
      "terrainSize",
      "noiseSize",
      "randomness",
      "landHeight",
      "landRoughness",
    ],
    help: "Larger noise size creates broader features. Seed controls the repeatable landscape variation.",
  },
  {
    id: "mountains",
    label: "Mountains",
    keys: ["mountainMinHeight", "mountainMaxHeight", "mountainRoughness"],
    help: "Peak heights are chosen within this range, above the ground. Slopes and saddles descend below the peaks.",
  },
  {
    id: "coast",
    label: "Coast",
    keys: ["beachAmount", "beachWidth"],
    help: "Blend gently sloping sandy beaches with rocky coastline sections.",
  },
  {
    id: "water",
    label: "Water",
    keys: ["seabedDepth", "seabedRoughness", "waterOpacity"],
    help: "Static transparent water reveals the procedural seabed. Lower opacity makes the bottom clearer.",
  },
] as const;
export default function RenderSettingsPanel({
  settings,
  onApply,
  onClose,
}: {
  settings: RenderSettings;
  onApply: (settings: RenderSettings) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [activeTab, setActiveTab] = useState(0);
  const tab = tabs[activeTab];
  function update(key: keyof RenderSettings, value: number) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (key === "mountainMinHeight")
        next.mountainMaxHeight = Math.max(value, next.mountainMaxHeight);
      if (key === "mountainMaxHeight")
        next.mountainMinHeight = Math.min(value, next.mountainMinHeight);
      return next;
    });
  }
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="render-settings-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/30"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2
          id="render-settings-title"
          className="flex items-center gap-2 font-display font-semibold"
        >
          <SlidersHorizontal size={17} />
          Render settings
        </h2>
        <button
          onClick={onClose}
          aria-label="Close render settings"
          className="rounded p-1 hover:bg-selected"
        >
          <X size={18} />
        </button>
      </div>
      <div
        role="tablist"
        aria-label="Render categories"
        className="flex gap-1 border-b border-line px-4 py-2"
      >
        {tabs.map((item, index) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`panel-${item.id}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => {
              let next: number;
              if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
              else if (e.key === "ArrowLeft")
                next = (index + tabs.length - 1) % tabs.length;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = tabs.length - 1;
              else return;
              e.preventDefault();
              setActiveTab(next);
              document.getElementById(`tab-${tabs[next].id}`)?.focus();
            }}
            className={`flex-1 rounded-lg px-2 py-2 text-xs transition-colors ${activeTab === index ? "bg-selected font-semibold text-accent" : "text-muted hover:bg-selected/50"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${tab.id}`}
        aria-labelledby={`tab-${tab.id}`}
        tabIndex={0}
        className="max-h-[calc(90dvh-205px)] min-h-64 overflow-y-auto px-5 py-4"
      >
        <p className="mb-4 text-xs leading-relaxed text-muted">
          Save to rebuild and keep these settings in this browser.
        </p>
        {activeTab === 0 && (
          <div className="mb-5 flex items-center justify-between gap-2 text-xs">
            <label htmlFor="terrain-seed">Random seed</label>
            <div className="flex items-center gap-2">
              <input
                id="terrain-seed"
                type="number"
                min={0}
                max={999999}
                step={1}
                value={draft.seed}
                onChange={(e) => update("seed", Number(e.target.value))}
                className="w-24 rounded-md border border-line bg-white px-2 py-1.5 text-right"
              />
              <button
                aria-label="Randomize seed"
                title="Randomize seed"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    seed:
                      (Math.round(d.seed) +
                        1 +
                        Math.floor(Math.random() * 999999)) %
                      1000000,
                  }))
                }
                className="rounded-md border border-line p-2 text-accent hover:bg-selected"
              >
                <Shuffle size={15} />
              </button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {settingControls
            .filter((control) =>
              (tab.keys as readonly string[]).includes(control.key),
            )
            .map(({ key, label, min, max, step }) => (
              <label key={key} className="block text-xs">
                <span className="mb-2 flex justify-between">
                  <span>{label}</span>
                  <output className="tabular-nums text-accent">
                    {draft[key].toFixed(key === "terrainSize" ? 0 : 2)}
                  </output>
                </span>
                <input
                  aria-label={label}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={draft[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                  className="block h-1.5 w-full cursor-pointer accent-accent"
                />
              </label>
            ))}
        </div>
        <p className="mt-5 text-[10px] leading-relaxed text-muted">
          {activeTab === 0 &&
            "Size is the radius in hex cells (7–30). New cells start as water; shrinking removes the outer cells and can be undone. "}
          {tab.help}
        </p>
      </div>
      <div className="flex justify-between gap-2 border-t border-line p-4">
        <button
          onClick={() => setDraft({ ...DEFAULT_RENDER_SETTINGS })}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs text-muted hover:bg-selected"
        >
          <RotateCcw size={13} />
          Defaults
        </button>
        <button
          onClick={() => onApply(normalizeSettings(draft))}
          className="rounded-lg bg-accent px-4 py-2.5 text-xs text-white hover:bg-accent/90"
        >
          Save & rebuild
        </button>
      </div>
    </dialog>
  );
}
