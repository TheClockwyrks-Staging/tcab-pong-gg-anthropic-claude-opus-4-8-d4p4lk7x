// The debug overlay: a list of named diagnostic sources, each a pure read, drawn
// as text in a corner of the canvas and toggled by the backtick key. It reads the
// game without changing it.

export interface DiagnosticSource {
  label: string;
  read: () => string;
}

export interface Overlay {
  /** Registers a diagnostic source shown while the overlay is visible. */
  register(label: string, read: () => string): void;
  /** Whether the overlay is currently visible. */
  isVisible(): boolean;
  /** Draws the overlay onto the given 2D context, in CSS pixels. */
  draw(ctx: CanvasRenderingContext2D): void;
  dispose(): void;
}

/** Creates the overlay and wires the Backquote toggle to the window. */
export function createOverlay(): Overlay {
  const sources: DiagnosticSource[] = [];
  let visible = false;

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === "Backquote") {
      visible = !visible;
    }
  };
  window.addEventListener("keydown", onKeyDown);

  return {
    register(label: string, read: () => string) {
      sources.push({ label, read });
    },
    isVisible: () => visible,
    draw(ctx: CanvasRenderingContext2D) {
      if (!visible) return;
      const lines = sources.map((s) => `${s.label}: ${s.read()}`);
      const pad = 8;
      const lineH = 16;
      const font = "12px monospace";
      ctx.save();
      ctx.font = font;
      let maxW = 0;
      for (const line of lines) {
        maxW = Math.max(maxW, ctx.measureText(line).width);
      }
      const boxW = maxW + pad * 2;
      const boxH = lines.length * lineH + pad * 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(8, 8, boxW, boxH);
      ctx.fillStyle = "#8fffc8";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      lines.forEach((line, i) => {
        ctx.fillText(line, 8 + pad, 8 + pad + i * lineH);
      });
      ctx.restore();
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
