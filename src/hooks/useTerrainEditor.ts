import { selectRiverCorner, dragRiverCorners, removeRiverAt } from "../river";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  generate,
  loadMap,
  resizeMap,
  mapRadius,
  type Cell,
  type Terrain,
} from "../terrain";
import { normalizeSettings, type RenderSettings } from "../renderSettings";
export function useTerrainEditor() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(() => {
    try {
      return normalizeSettings(
        JSON.parse(localStorage.getItem("hexterra-render-v1") || "null"),
      );
    } catch {
      return normalizeSettings(null);
    }
  });
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [cells, setCells] = useState(() => loadMap(renderSettings.terrainSize));
  const [terrain, setTerrain] = useState<Terrain>("land");
  const [paintTool, setPaintTool] = useState<"terrain" | "river">("terrain");
  const [riverAction, setRiverAction] = useState<"draw" | "erase">("draw");
  const [riverDraft, updateRiverDraft] = useState<string[]>([]);
  const draftRef = useRef<string[]>([]);
  const riverPointer = useRef<{ x: number; z: number } | null>(null);
  const setRiverDraft = useCallback((path: string[]) => {
    draftRef.current = path;
    updateRiverDraft(path);
    if (!path.length) riverPointer.current = null;
  }, []);
  const [brush, setBrush] = useState(1);
  const [cameraTool, setCameraTool] = useState<"orbit" | "pan">("orbit");
  const [navigate, setNavigate] = useState(false);
  const [reset, setReset] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [backend, setBackend] = useState("Starting renderer");
  const [hover, setHover] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [history, setHistory] = useState<{ past: Cell[][]; future: Cell[][] }>({
    past: [],
    future: [],
  });
  const stroke = useRef(false);
  const current = useRef(cells);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("hexterra-map-v1", JSON.stringify(cells));
        localStorage.setItem(
          "hexterra-render-v1",
          JSON.stringify(renderSettings),
        );
        setSaveError(false);
      } catch {
        setSaveError(true);
        setNotice("Local storage unavailable. Export to save your map.");
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [cells, renderSettings]);
  useEffect(() => {
    const end = () => {
      stroke.current = false;
      riverPointer.current = null;
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("blur", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("blur", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  const undo = useCallback(() => {
    if (!history.past.length) return;
    setRiverDraft([]);
    const previous = history.past[history.past.length - 1];
    setHistory({
      past: history.past.slice(0, -1),
      future: [current.current, ...history.future],
    });
    current.current = previous;
    setCells(previous);
    setHover(null);
    setRenderSettings((s) => ({ ...s, terrainSize: mapRadius(previous) }));
  }, [history, setRiverDraft]);
  const redo = useCallback(() => {
    if (!history.future.length) return;
    setRiverDraft([]);
    const next = history.future[0];
    setHistory({
      past: [...history.past, current.current],
      future: history.future.slice(1),
    });
    current.current = next;
    setCells(next);
    setHover(null);
    setRenderSettings((s) => ({ ...s, terrainSize: mapRadius(next) }));
  }, [history, setRiverDraft]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setRiverDraft([]);
        return;
      }
      if (settingsOpen) return;
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      const shortcuts: Record<string, Terrain> = {
        "1": "water",
        "2": "land",
        "3": "mountain",
      };
      if (shortcuts[e.key]) {
        setPaintTool("terrain");
        setTerrain(shortcuts[e.key]);
        setMode("edit");
        setNavigate(false);
      }
      if (e.key.toLowerCase() === "b") {
        setPaintTool("terrain");
        setMode("edit");
        setNavigate(false);
      }
      if (e.key.toLowerCase() === "h" || e.key.toLowerCase() === "p") {
        setNavigate(true);
        setCameraTool(e.key.toLowerCase() === "p" ? "pan" : "orbit");
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undo, redo, settingsOpen, setRiverDraft]);
  function paint(index: number, x: number, z: number, down: boolean) {
    if (mode !== "edit" || navigate) return;
    const center = current.current[index];
    let next: Cell[];
    if (paintTool === "river" && riverAction === "erase") {
      if (!down) return;
      setRiverDraft([]);
      const result = removeRiverAt(current.current, x, z, renderSettings);
      next = result.cells;
      setNotice(
        result.removed
          ? `Deleted ${result.removed} river path${result.removed === 1 ? "" : "s"}. Undo to restore.`
          : "Click directly on a river to delete it.",
      );
    } else if (paintTool === "river") {
      if (!down && !riverPointer.current) return;
      const result = down
        ? selectRiverCorner(
            current.current,
            index,
            x,
            z,
            draftRef.current,
            renderSettings,
          )
        : dragRiverCorners(
            current.current,
            riverPointer.current!,
            { x, z },
            draftRef.current,
            renderSettings,
          );
      if (down || result.cells !== current.current) setNotice(result.message);
      if (result.draft !== draftRef.current) setRiverDraft(result.draft);
      riverPointer.current = result.draft.length ? { x, z } : null;
      next = result.cells;
    } else {
      setRiverDraft([]);
      next = current.current.map((c) =>
        Math.max(
          Math.abs(c.q - center.q),
          Math.abs(c.r - center.r),
          Math.abs(c.q + c.r - center.q - center.r),
        ) < brush
          ? { ...c, type: terrain }
          : c,
      );
    }
    if (
      next.every(
        (c, i) =>
          c.type === current.current[i].type &&
          c.riverPath === current.current[i].riverPath,
      )
    )
      return;
    if (!stroke.current) {
      const before = current.current;
      setHistory((h) => ({ past: [...h.past.slice(-49), before], future: [] }));
      stroke.current = true;
    }
    current.current = next;
    setCells(next);
  }
  function applySettings(value: RenderSettings) {
    setRiverDraft([]);
    const settings = normalizeSettings(value);
    if (settings.terrainSize !== renderSettings.terrainSize) {
      const before = current.current;
      setHistory((h) => ({ past: [...h.past.slice(-49), before], future: [] }));
      const next = resizeMap(before, settings.terrainSize);
      current.current = next;
      setCells(next);
      setHover(null);
      stroke.current = false;
    }
    setRenderSettings(settings);
  }
  function regenerate() {
    setRiverDraft([]);
    const before = current.current;
    setHistory((h) => ({ past: [...h.past.slice(-49), before], future: [] }));
    const seed =
      (renderSettings.seed + 1 + Math.floor(Math.random() * 999999)) % 1000000;
    const next = generate(seed, renderSettings.terrainSize);
    setRenderSettings((s) => ({ ...s, seed }));
    setHover(null);
    stroke.current = false;
    current.current = next;
    setCells(next);
    setNotice("A new landscape is ready to explore.");
  }
  return {
    riverAction,
    setRiverAction: (action: "draw" | "erase") => {
      setRiverDraft([]);
      setRiverAction(action);
    },
    riverDraft,
    cancelRiver: () => setRiverDraft([]),
    renderSettings,
    applySettings,
    settingsOpen,
    setSettingsOpen,
    cells,
    terrain,
    setTerrain,
    paintTool,
    setPaintTool,
    brush,
    setBrush,
    cameraTool,
    setCameraTool,
    navigate,
    setNavigate,
    reset,
    setReset,
    zoom,
    setZoom,
    backend,
    setBackend,
    hover,
    setHover,
    notice,
    setNotice,
    saveError,
    history,
    undo,
    redo,
    paint,
    regenerate,
    mode,
    setMode,
  };
}
export type TerrainEditor = ReturnType<typeof useTerrainEditor>;
