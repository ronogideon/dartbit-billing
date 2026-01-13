
import { GoogleGenAI, Type } from "@google/genai";

// Always create a new instance of GoogleGenAI before making an API call to ensure use of the most up-to-date API key.

export const getNetworkInsights = async (clientData: any[], revenueData: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      // Analysis of network data is a complex task requiring gemini-3-pro-preview.
      model: 'gemini-3-pro-preview',
      contents: `Analyze this ISP data and provide 3 brief strategic insights for optimization: 
      Clients: ${JSON.stringify(clientData)}
      Revenue: ${JSON.stringify(revenueData)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              insight: { type: Type.STRING },
              impact: { type: Type.STRING }
            },
            required: ["title", "insight", "impact"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

export const generatePlanSuggestion = async (marketDemand: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      // Reasoning for new billing plans is a complex task.
      model: 'gemini-3-pro-preview',
      contents: `Generate a new ISP billing plan based on this demand: ${marketDemand}. Return speed, price, and marketing name.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            speed: { type: Type.STRING },
            price: { type: Type.NUMBER },
            description: { type: Type.STRING }
          },
          required: ["name", "speed", "price", "description"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Plan Suggestion Error:", error);
    return null;
  }
};
