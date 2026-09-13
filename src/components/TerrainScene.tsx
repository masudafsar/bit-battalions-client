import RiverSurface from "./scene/RiverSurface";
import { Canvas } from "@react-three/fiber";
import { WebGPURenderer } from "three/webgpu";
import type { Cell } from "../terrain";
import CameraRig from "./scene/CameraRig";
import SceneBoundary from "./scene/SceneBoundary";
import EditableGrid from "./scene/EditableGrid";
import ContinuousTerrain from "./scene/ContinuousTerrain";
import type { RenderSettings } from "../renderSettings";
export default function TerrainScene(props: {
  cells: Cell[];
  settings: RenderSettings;
  mode: "edit" | "preview";
  showGrid: boolean;
  riverMode: boolean;
  onPaint: (index: number, x: number, z: number, down: boolean) => void;
  onHover: (index: number | null) => void;
  navigate: boolean;
  cameraTool: "orbit" | "pan";
  reset: number;
  zoom: number;
  onBackend: (backend: string) => void;
}) {
  return (
    <SceneBoundary>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        camera={{ position: [22, 27, 30], fov: 39 }}
        gl={async (defaults) => {
          const renderer = new WebGPURenderer({
            canvas: defaults.canvas as HTMLCanvasElement,
            antialias: true,
            alpha: true,
          });
          await renderer.init();
          props.onBackend(
            (renderer.backend as unknown as { isWebGPUBackend?: boolean })
              .isWebGPUBackend
              ? "WebGPU"
              : "WebGL2 fallback",
          );
          return renderer;
        }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[-10, 25, 8]} intensity={3} />
        <directionalLight
          position={[15, 10, -15]}
          intensity={0.7}
          color="#c3dfe5"
        />
        {props.mode === "edit" ? (
          <EditableGrid {...props} />
        ) : (
          <ContinuousTerrain
            cells={props.cells}
            settings={props.settings}
            showGrid={props.showGrid}
          />
        )}
        <RiverSurface
          cells={props.cells}
          settings={props.settings}
          flat={props.mode === "edit"}
        />
        <CameraRig
          terrainSize={props.settings.terrainSize}
          reset={props.reset}
          zoom={props.zoom}
          navigate={props.navigate || props.mode === "preview"}
          cameraTool={props.cameraTool}
        />
      </Canvas>
    </SceneBoundary>
  );
}
