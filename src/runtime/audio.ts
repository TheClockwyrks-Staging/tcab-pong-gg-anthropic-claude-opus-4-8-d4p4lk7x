// Audio: four short synthesized cues played through the Web Audio API. The layer
// carries the mute bit, arms itself on the first real user gesture, and plays
// nothing while muted.

import type { Cue } from "../types.js";

interface CueSpec {
  freq: number;
  type: OscillatorType;
  duration: number;
  gain: number;
}

const CUES: Record<Cue, CueSpec> = {
  "paddle-hit": { freq: 440, type: "square", duration: 0.07, gain: 0.25 },
  "wall-bounce": { freq: 220, type: "triangle", duration: 0.06, gain: 0.2 },
  "obstacle-bounce": { freq: 330, type: "sawtooth", duration: 0.08, gain: 0.2 },
  score: { freq: 660, type: "sine", duration: 0.22, gain: 0.3 },
};

export interface Audio {
  /** Arms the audio context; call on a real user gesture. Safe to call often. */
  arm(): void;
  /** Plays a cue by name, unless muted or unarmed. */
  play(cue: Cue): void;
  /** Reads the mute bit. */
  isMuted(): boolean;
  /** Sets the mute bit. */
  setMuted(muted: boolean): void;
  /** Toggles the mute bit and returns its new value. */
  toggleMuted(): boolean;
}

/** Creates the audio layer. No context is opened until `arm` is first called. */
export function createAudio(): Audio {
  let ctx: AudioContext | null = null;
  let muted = false;

  const arm = (): void => {
    if (ctx) {
      if (ctx.state === "suspended") void ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
  };

  const play = (cue: Cue): void => {
    if (muted || !ctx) return;
    const spec = CUES[cue];
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, now);
    // A short pitch drop gives each blip a percussive edge.
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, spec.freq * 0.6),
      now + spec.duration,
    );
    gainNode.gain.setValueAtTime(spec.gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + spec.duration);
  };

  return {
    arm,
    play,
    isMuted: () => muted,
    setMuted: (m: boolean) => {
      muted = m;
    },
    toggleMuted: () => {
      muted = !muted;
      return muted;
    },
  };
}
