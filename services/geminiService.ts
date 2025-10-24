import { 
    GoogleGenAI, 
    Modality, 
    Chat,
    GenerateVideosOperation,
} from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a fallback for development; in a real environment, the key should always be present.
  // The UI should handle cases where the API fails due to a missing key.
  console.warn("API_KEY environment variable is not set. API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

/**
 * Decodes a base64 string into a Uint8Array.
 */
const decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};


/**
 * Writes a string to a DataView.
 */
const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
};

/**
 * Converts raw PCM audio data into a playable WAV file blob.
 * @param pcmData The raw audio data as a Uint8Array.
 * @param sampleRate The sample rate of the audio (e.g., 24000).
 * @returns A Blob representing the WAV file.
 */
const pcmToWav = (pcmData: Uint8Array, sampleRate: number): Blob => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.byteLength;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    const pcmBytes = new Uint8Array(pcmData.buffer);
    for (let i = 0; i < pcmBytes.length; i++) {
        view.setUint8(44 + i, pcmBytes[i]);
    }

    return new Blob([view], { type: 'audio/wav' });
};


const fileToGenerativePart = (base64: string) => {
    const match = base64.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid base64 string format");
    }
    const mimeType = match[1];
    const data = match[2];

    return {
        inlineData: {
            data,
            mimeType,
        },
    };
};

/**
 * Generates or edits an image using a base64 image string and a text prompt.
 * @param base64Image The base64 encoded image string (e.g., from a file reader).
 * @param prompt The text prompt for generation or editing.
 * @param isEdit A flag to indicate if this is an initial generation or a subsequent edit.
 * @returns A promise that resolves to the base64 string of the generated image.
 */
export const generateImage = async (base64Image: string, prompt: string, isEdit = false): Promise<string> => {
    try {
        const imagePart = fileToGenerativePart(base64Image);
        
        let fullPrompt: string;

        if (isEdit) {
            // For edits, instruct the model to preserve the person's likeness.
            fullPrompt = `${prompt}. Apply this edit while preserving the person's core facial features and likeness.`;
        } else {
            // For initial generation, use the existing detailed prompt.
            fullPrompt = `${prompt}. Ensure the person's facial features are preserved from the original image but place them in the described professional setting with appropriate attire. The final image should be a high-quality, realistic headshot.`;
        }

        const textPart = { text: fullPrompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageData = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageData}`;
            }
        }

        throw new Error("No image data was found in the API response.");

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Provide a more user-friendly error message
        if (error instanceof Error && error.message.includes('API key')) {
             throw new Error("The API key is invalid or missing. Please check your configuration.");
        }
        throw new Error("Failed to generate the image due to an API error. Please try again later.");
    }
};

/**
 * Generates speech from a text prompt.
 * @param prompt The text to convert to speech.
 * @returns A promise that resolves to an object URL for the generated audio.
 */
export const generateSpeech = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data found in the API response.");
        }

        const pcmData = decode(base64Audio);
        const wavBlob = pcmToWav(pcmData, 24000); // TTS model outputs at 24kHz

        return URL.createObjectURL(wavBlob);

    } catch (error) {
        console.error("Error calling Gemini TTS API:", error);
        if (error instanceof Error && error.message.includes('API key')) {
             throw new Error("The API key is invalid or missing. Please check your configuration.");
        }
        throw new Error("Failed to generate audio due to an API error.");
    }
};


/**
 * Creates a new chat session with the Gemini model.
 * @returns A Chat instance.
 */
export const createChatSession = (): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: 'You are a friendly and helpful AI assistant for a headshot photography app. You can answer questions about photography, style tips, or have a general conversation.',
        },
    });
};

/**
 * Generates a video using a base64 image, a text prompt, and aspect ratio.
 * @param base64Image The base64 encoded starting image.
 * @param prompt The text prompt for the video.
 * @param aspectRatio The desired aspect ratio ('16:9' or '9:16').
 * @param onProgress A callback to update the UI with progress messages.
 * @returns A promise that resolves to the object URL of the generated video.
 */
export const generateVideo = async (
    base64Image: string,
    prompt: string,
    aspectRatio: '16:9' | '9:16',
    onProgress: (message: string) => void
): Promise<string> => {
    try {
        // Always create a fresh instance to use the latest selected API key
        const freshAi = new GoogleGenAI({ apiKey: process.env.API_KEY! });

        const imagePart = fileToGenerativePart(base64Image);

        onProgress("Initiating video generation...");
        let operation: GenerateVideosOperation =
            await freshAi.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                image: {
                    imageBytes: imagePart.inlineData.data,
                    mimeType: imagePart.inlineData.mimeType,
                },
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: aspectRatio,
                },
            });

        onProgress("Generation in progress... This may take several minutes.");
        while (!operation.done) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            operation = await freshAi.operations.getVideosOperation({ operation: operation });
        }

        if (!operation.response?.generatedVideos?.[0]?.video?.uri) {
            throw new Error('Video generation finished but no video URI was found.');
        }

        const downloadLink = operation.response.generatedVideos[0].video.uri;
        
        onProgress("Downloading generated video...");
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }

        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error("Error calling Veo API:", error);
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                throw new Error("The API key is invalid or missing. Please select a valid key and try again.");
            }
            if (error.message.includes('not found')) {
                 throw new Error("API Key validation failed. Please re-select your API key and try again.");
            }
        }
        throw new Error("Failed to generate the video due to an API error. Please try again later.");
    }
};