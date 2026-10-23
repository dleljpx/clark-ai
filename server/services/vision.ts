interface VisionResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: {
        vertices: Array<{ x: number; y: number }>;
      };
    }>;
    error?: {
      code: number;
      message: string;
    };
  }>;
}

export async function extractTextFromImage(imageBase64: string): Promise<string> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  
  if (!apiKey) {
    throw new Error("Google Cloud Vision API key not configured");
  }

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageBase64
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Vision API request failed: ${response.status} ${response.statusText}`);
    }

    const result: VisionResponse = await response.json();
    
    if (result.responses[0]?.error) {
      const error = result.responses[0].error;
      throw new Error(`Vision API Error: ${error.message} (Code: ${error.code})`);
    }

    const textAnnotations = result.responses[0]?.textAnnotations;
    
    if (!textAnnotations || textAnnotations.length === 0) {
      return "No text found in image";
    }

    // The first annotation contains all detected text
    return textAnnotations[0].description || "No text found in image";
    
  } catch (error: any) {
    if (error.message?.includes('API key')) {
      throw new Error("Invalid Google Cloud Vision API key. Please check your configuration.");
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      throw new Error("Vision API access denied. Please check your API key permissions.");
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
      throw new Error("Vision API quota exceeded. Please try again later.");
    } else {
      throw new Error("Failed to extract text from image. Please try again.");
    }
  }
}