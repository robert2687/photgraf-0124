
import { GoogleGenAI, Modality, Chat } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a fallback for development; in a real environment, the key should always be present.
  // The UI should handle cases where the API fails due to a missing key.
  console.warn("API_KEY environment variable is not set. API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

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
 * @returns A promise that resolves to the base64 string of the generated image.
 */
export const generateImage = async (base64Image: string, prompt: string): Promise<string> => {
    try {
        const imagePart = fileToGenerativePart(base64Image);
        
        const fullPrompt = prompt.includes("headshot") 
          ? `${prompt}. Ensure the person's facial features are preserved from the original image but place them in the described professional setting with appropriate attire. The final image should be a high-quality, realistic headshot.`
          : prompt;

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
