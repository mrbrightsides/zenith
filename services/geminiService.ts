
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";

export class GeminiService {
  private static getClient() {
    return new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  }

  static async analyzeAudioToVisualPrompt(audioBase64: string, mimeType: string) {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { data: audioBase64, mimeType: mimeType } },
              { text: `Analyze this audio sample for its emotional mood, rhythmic tempo, and atmospheric qualities. 
              Based on this analysis, describe a highly detailed cinematic visual scene that perfectly synchronizes with the sound's pacing and character. 
              Focus on color palette, lighting transitions, specific camera motions (e.g., fast cuts for high tempo, slow panning for low tempo), and the overall aesthetic energy. 
              Respond with ONLY the descriptive visual prompt for video generation.` }
            ]
          }
        ]
      });
      return response.text || "Cinematic visual matching the audio rhythm.";
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio?.openSelectKey();
      }
      throw error;
    }
  }

  static async generateText(prompt: string, useSearch: boolean = false) {
    const ai = this.getClient();
    const config: any = {
      thinkingConfig: { thinkingBudget: 16384 }
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Source',
      uri: chunk.web?.uri
    })).filter((s: any) => s.uri) || [];

    return {
      text: response.text || '',
      sources
    };
  }

  static async generateImage(prompt: string, model: string = 'gemini-2.5-flash-image') {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No image generated');
  }

  static async generateVideo(
    prompt: string, 
    aspectRatio: '16:9' | '9:16' = '16:9',
    resolution: '720p' | '1080p' = '720p',
    duration: number = 5,
    style: string = 'Cinematic'
  ) {
    const ai = this.getClient();
    
    // Enrich prompt with style and duration intent
    const enrichedPrompt = `${style} style video: ${prompt}. Production quality: High. Motion: Consistent and fluid.`;

    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: enrichedPrompt,
        config: {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio?.openSelectKey();
      }
      throw error;
    }
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
