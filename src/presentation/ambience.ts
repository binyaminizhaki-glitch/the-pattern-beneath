import { useEffect, useRef, useState } from 'react';

// Quiet, locally synthesized wind and a distant press. No requests, samples or autoplay.
export function useAmbience(press: boolean) {
  const [enabled, setEnabled] = useState(false);
  const audio = useRef<{ context: AudioContext; gain: GainNode } | null>(null);
  useEffect(() => {
    if (!enabled) {
      void audio.current?.context.suspend();
      return;
    }
    if (!audio.current) {
      const context = new AudioContext();
      const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
      const values = buffer.getChannelData(0);
      // Deterministic noise here is decorative audio only, independent of simulation RNG.
      for (let i = 0; i < values.length; i++) values[i] = Math.sin(i * 127.1) * Math.sin(i * 311.7);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 380;
      const gain = context.createGain();
      gain.gain.value = 0.025;
      source.connect(filter).connect(gain).connect(context.destination);
      source.start();
      audio.current = { context, gain };
    }
    void audio.current.context.resume();
    audio.current.gain.gain.setTargetAtTime(
      press ? 0.045 : 0.025,
      audio.current.context.currentTime,
      0.4,
    );
  }, [enabled, press]);
  useEffect(
    () => () => {
      void audio.current?.context.close();
    },
    [],
  );
  return { enabled, enable: () => setEnabled(true), toggle: () => setEnabled((value) => !value) };
}
