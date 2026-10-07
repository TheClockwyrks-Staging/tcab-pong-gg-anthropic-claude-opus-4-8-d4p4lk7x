import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudio } from "./audio.js";

class FakeParam {
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = "sine";
  connect = vi.fn(() => new FakeNode());
  start = vi.fn();
  stop = vi.fn();
}
class FakeCtx {
  currentTime = 0;
  state = "running";
  destination = {};
  resume = vi.fn();
  createOscillator = vi.fn(() => new FakeNode());
  createGain = vi.fn(() => new FakeNode());
}

afterEach(() => vi.unstubAllGlobals());

describe("audio", () => {
  it("plays nothing before it is armed", () => {
    let made = 0;
    vi.stubGlobal("window", {
      AudioContext: class {
        constructor() {
          made++;
        }
      },
    });
    const audio = createAudio();
    audio.play("score");
    expect(made).toBe(0);
  });

  it("opens a context on arm and plays cues when unmuted", () => {
    let ctx: FakeCtx | null = null;
    vi.stubGlobal("window", {
      AudioContext: class {
        constructor() {
          ctx = new FakeCtx();
          return ctx as unknown as AudioContext;
        }
      },
    });
    const audio = createAudio();
    audio.arm();
    audio.play("paddle-hit");
    expect(ctx!.createOscillator).toHaveBeenCalledTimes(1);
  });

  it("stays silent while muted", () => {
    let ctx: FakeCtx | null = null;
    vi.stubGlobal("window", {
      AudioContext: class {
        constructor() {
          ctx = new FakeCtx();
          return ctx as unknown as AudioContext;
        }
      },
    });
    const audio = createAudio();
    audio.arm();
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
    audio.play("wall-bounce");
    expect(ctx!.createOscillator).not.toHaveBeenCalled();
  });

  it("toggles the mute bit", () => {
    vi.stubGlobal("window", {});
    const audio = createAudio();
    expect(audio.isMuted()).toBe(false);
    expect(audio.toggleMuted()).toBe(true);
    expect(audio.toggleMuted()).toBe(false);
  });

  it("resumes a suspended context on a second arm", () => {
    const ctx = new FakeCtx();
    ctx.state = "suspended";
    vi.stubGlobal("window", {
      AudioContext: class {
        constructor() {
          return ctx as unknown as AudioContext;
        }
      },
    });
    const audio = createAudio();
    audio.arm();
    audio.arm();
    expect(ctx.resume).toHaveBeenCalled();
  });
});
