
import { Type, GenerateContentResponse, Modality } from "@google/genai";

export class GeminiService {
  static async analyzeAudioToVisualPrompt(audioBase64: string, mimeType: string) {
    // This one is special as it sends base64 audio.
    // For now, we'll proxy it through a new server route or keep it as is if the key is provided.
    // Let's create a generic proxy approach.
    const response = await fetch('/api/gemini/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: [
          { inlineData: { data: audioBase64, mimeType: mimeType } },
          { text: `Analyze this audio sample for its emotional mood, rhythmic tempo, and atmospheric qualities. 
          Based on this analysis, describe a highly detailed cinematic visual scene that perfectly synchronizes with the sound's pacing and character. 
          Focus on color palette, lighting transitions, specific camera motions (e.g., fast cuts for high tempo, slow panning for low tempo), and the overall aesthetic energy. 
          Respond with ONLY the descriptive visual prompt for video generation.` }
        ]
      })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to analyze audio');
    }
    
    const data = await response.json();
    return data.text || "Cinematic visual matching the audio rhythm.";
  }

  static async requestVaultToken(service: string) {
    console.log(`[VAULT] Initiating secure handshake for ${service}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockToken = `atv_${service.toLowerCase()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[VAULT] Token acquired: ${mockToken.substring(0, 8)}...`);
    return mockToken;
  }

  static async generateText(prompt: string, useSearch: boolean = false) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch('/api/gemini/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, useSearch }),
        signal: controller.signal
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate text');
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async generateImage(prompt: string, model: string = 'gemini-2.5-flash-image') {
    const response = await fetch('/api/gemini/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate image');
    }

    const data = await response.json();
    return data.imageUrl;
  }

  static async analyzeImage(imageBase64: string, mimeType: string, customPrompt?: string) {
    const response = await fetch('/api/gemini/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: [
          { inlineData: { data: imageBase64, mimeType: mimeType } },
          { text: customPrompt || "Analyze this image in detail. Describe the subject, composition, lighting, and any notable details. If there is text, transcribe it. If there are people, describe their appearance and actions. Provide a comprehensive report." }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to analyze image');
    }

    const data = await response.json();
    return data.text;
  }

  static async generateVideo(
    prompt: string, 
    aspectRatio: '16:9' | '9:16' = '16:9',
    resolution: '720p' | '1080p' = '720p',
    duration: number = 5,
    style: string = 'Cinematic'
  ) {
    const response = await fetch('/api/gemini/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio, resolution, style })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate video');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}

export const AudioUtils = {
  encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  },
  decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes;
  },
  async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; }
    }
    return buffer;
  }
};
