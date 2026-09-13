import { Component, type ReactNode } from "react";
export default class SceneBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="absolute inset-0 grid place-content-center p-12 text-center text-sm text-muted">
        The 3D renderer couldn’t start. Try a browser with WebGPU or WebGL2
        enabled, then reload.
      </div>
    ) : (
      this.props.children
    );
  }
}
