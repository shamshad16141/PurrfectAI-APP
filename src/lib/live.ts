import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface LiveSessionCallbacks {
  onTranscription?: (text: string, isUser: boolean) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onInterrupted?: () => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export class LiveVoiceSession {
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private audioQueue: Int16Array[] = [];
  private isPlaying = false;
  private nextStartTime = 0;

  constructor(private callbacks: LiveSessionCallbacks) {}

  async start() {
    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: () => {
            this.startStreaming();
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onerror: (error) => {
            this.callbacks.onError?.(error);
          },
          onclose: () => {
            this.callbacks.onClose?.();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are Luo Xiaohei, a cute black cat assistant. Keep responses short and cat-like.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });
    } catch (error) {
      this.callbacks.onError?.(error);
      this.stop();
    }
  }

  private startStreaming() {
    if (!this.audioContext || !this.mediaStream) return;

    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      }
      
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
      this.session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          const binaryString = atob(part.inlineData.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const pcmData = new Int16Array(bytes.buffer);
          this.queueAudio(pcmData);
        }
      }
    }

    if (message.serverContent?.interrupted) {
      this.stopPlayback();
      this.callbacks.onInterrupted?.();
    }

    if (message.serverContent?.turnComplete) {
      // Turn complete
    }

    // Handle transcriptions
    if (message.serverContent?.modelTurn?.parts) {
        const text = message.serverContent.modelTurn.parts.map(p => p.text).filter(Boolean).join("");
        if (text) this.callbacks.onTranscription?.(text, false);
    }
  }

  private queueAudio(pcmData: Int16Array) {
    this.audioQueue.push(pcmData);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playNext() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.callbacks.onAudioEnd?.();
      return;
    }

    this.isPlaying = true;
    this.callbacks.onAudioStart?.();
    const pcmData = this.audioQueue.shift()!;
    
    if (!this.audioContext) return;

    const audioBuffer = this.audioContext.createBuffer(1, pcmData.length, 16000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 0x7FFF;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    source.onended = () => {
      this.playNext();
    };
  }

  private stopPlayback() {
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;
  }

  stop() {
    this.session?.close();
    this.processor?.disconnect();
    this.source?.disconnect();
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
    
    this.session = null;
    this.processor = null;
    this.source = null;
    this.mediaStream = null;
    this.audioContext = null;
  }
}
