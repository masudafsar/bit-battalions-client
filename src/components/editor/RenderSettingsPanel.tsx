import { useState } from "react";
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
  {
    id: "rivers",
    label: "Rivers",
    keys: [
      "riverSourceWidth",
      "riverMouthWidth",
      "riverDepth",
      "riverBankWidth",
      "riverMeander",
      "riverCornerSmoothing",
    ],
    help: "Streams widen downstream. Channel depth and soft banks reshape the terrain; corner smoothing removes the hex-grid zigzag.",
  },
] as const;
export default function RenderSettingsPanel({
  settings,
  onApply,
  onClose,
  live,
  onLiveChange,
  onPreview,
}: {
  settings: RenderSettings;
  onApply: (settings: RenderSettings) => void;
  onClose: () => void;
  live: boolean;
  onLiveChange: (live: boolean) => void;
  onPreview: (settings: RenderSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [activeTab, setActiveTab] = useState(0);
  const tab = tabs[activeTab];
  function changeDraft(next: RenderSettings) {
    setDraft(next);
    if (live) onPreview(normalizeSettings(next));
  }
  function withValue(key: keyof RenderSettings, value: number) {
    const next = { ...draft, [key]: value };
    if (key === "mountainMinHeight")
      next.mountainMaxHeight = Math.max(value, next.mountainMaxHeight);
    if (key === "mountainMaxHeight")
      next.mountainMinHeight = Math.min(value, next.mountainMinHeight);
    if (key === "riverSourceWidth")
      next.riverMouthWidth = Math.max(value, next.riverMouthWidth);
    if (key === "riverMouthWidth")
      next.riverSourceWidth = Math.min(value, next.riverSourceWidth);
    return next;
  }
  function update(key: keyof RenderSettings, value: number) {
    setDraft(withValue(key, value));
  }
  function finishUpdate(key: keyof RenderSettings, value: number) {
    const next = withValue(key, value);
    setDraft(next);
    if (live) onPreview(normalizeSettings(next));
  }
  return (
    <aside
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      aria-labelledby="render-settings-title"
      className="absolute inset-y-0 right-0 z-20 flex w-[min(85vw,380px)] flex-col overflow-hidden border-l border-line bg-paper text-ink shadow-lg lg:static lg:shrink-0 lg:shadow-none"
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
        className="flex gap-1 overflow-x-auto border-b border-line px-4 py-2"
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
            className={`min-w-16 flex-1 rounded-lg px-2 py-2 text-xs transition-colors ${activeTab === index ? "bg-selected font-semibold text-accent" : "text-muted hover:bg-selected/50"}`}
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
        className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
      >
        <p className="mb-4 text-xs leading-relaxed text-muted">
          {live ? "Changes apply when you release a control. Close when finished." : "Save to rebuild and keep these settings in this browser."}
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
                onBlur={(e) =>
                  finishUpdate("seed", Number(e.currentTarget.value))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="w-24 rounded-md border border-line bg-white px-2 py-1.5 text-right"
              />
              <button
                aria-label="Randomize seed"
                title="Randomize seed"
                onClick={() =>
                  changeDraft({
                    ...draft,
                    seed:
                      (Math.round(draft.seed) +
                        1 +
                        Math.floor(Math.random() * 999999)) %
                      1000000,
                  })
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
                  onPointerUp={(e) =>
                    finishUpdate(key, Number(e.currentTarget.value))
                  }
                  onKeyUp={(e) => {
                    if (
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                        "Home",
                        "End",
                        "PageUp",
                        "PageDown",
                      ].includes(e.key)
                    )
                      finishUpdate(key, Number(e.currentTarget.value));
                  }}
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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line p-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-accent">
          <input
            type="checkbox"
            role="switch"
            aria-label="Live preview"
            checked={live}
            onChange={(e) => {
              onLiveChange(e.target.checked);
              if (e.target.checked) onPreview(normalizeSettings(draft));
            }}
            className="peer sr-only"
          />
          <span className="flex h-5 w-9 items-center rounded-full bg-muted/30 p-0.5 transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
            <span className={`size-4 rounded-full bg-white shadow-sm transition-transform ${live ? "translate-x-4" : "translate-x-0"}`} />
          </span>
          Live
        </label>
        <button
          onClick={() => changeDraft({ ...DEFAULT_RENDER_SETTINGS })}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs text-muted hover:bg-selected"
        >
          <RotateCcw size={13} />
          Defaults
        </button>
        <button
          onClick={() => onApply(normalizeSettings(draft))}
          className="rounded-lg bg-accent px-4 py-2.5 text-xs text-white hover:bg-accent/90"
        >
          {live ? "Done" : "Save & rebuild"}
        </button>
      </div>
    </aside>
  );
}
