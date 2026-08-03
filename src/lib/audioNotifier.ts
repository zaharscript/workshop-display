class AudioNotifier {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private speechEnabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  private initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMutedStatus(): boolean {
    return this.isMuted;
  }

  public toggleSpeech(): boolean {
    this.speechEnabled = !this.speechEnabled;
    return this.speechEnabled;
  }

  public playChime(type: 'completed' | 'new_incoming' | 'alert' = 'completed') {
    if (this.isMuted) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      if (type === 'completed') {
        // High-pitch pleasant 3-tone chime (G5, C6, E6)
        const notes = [783.99, 1046.5, 1318.51];
        notes.forEach((freq, idx) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);

          gain.gain.setValueAtTime(0, now + idx * 0.15);
          gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.15 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.5);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.5);
        });
      } else if (type === 'new_incoming') {
        // Double tone intake bell
        const notes = [523.25, 659.25];
        notes.forEach((freq, idx) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gain.gain.setValueAtTime(0.2, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.4);
        });
      } else {
        // Alert chime
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (err) {
      console.warn('Audio play failed:', err);
    }
  }

  public speakAnnouncement(text: string) {
    if (this.isMuted || !this.speechEnabled) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop previous
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  }

  public announceCompletion(plateNumber: string, ownerName: string) {
    this.playChime('completed');
    setTimeout(() => {
      this.speakAnnouncement(`Attention: Car plate ${plateNumber}, for ${ownerName}, service completed. Ready for pickup.`);
    }, 600);
  }
}

export const audioNotifier = new AudioNotifier();
