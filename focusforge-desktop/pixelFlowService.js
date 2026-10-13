// Pixel Flow AI Service for extracting tasks from text using Google Gemini API
const { GoogleGenAI } = require('@google/genai');

// JSON Schema for task extraction - matches our frontend Task interface subset
const taskJsonSchema = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task: { type: "string", description: "The task description/title" },
          subject: { type: "string", description: "Subject/category for the task" },
          priority: {
            type: "string",
            enum: ["High", "Medium", "Low"],
            description: "Priority level"
          },
          date: {
            type: ["string", "null"],
            description: "Date in YYYY-MM-DD format or null if not specified"
          },
          startTime: {
            type: ["string", "null"],
            description: "Start time in HH:MM format or null if not specified"
          },
          endTime: {
            type: ["string", "null"],
            description: "End time in HH:MM format or null if not specified"
          },
          isAmbiguousDate: {
            type: "boolean",
            description: "True if date was ambiguous/not calculable from today"
          }
        },
        required: ["task", "subject", "priority", "isAmbiguousDate"],
        additionalProperties: false
      }
    }
  },
  required: ["tasks"],
  additionalProperties: false
};

/**
 * Extract tasks from user input text using Gemini AI
 * @param {string} userInput - Raw text input from user
 * @returns {Promise<Array>} Array of task objects
 */
async function extractTasksFromText(userInput) {
  try {
    // Initialize AI client with API key from environment
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Get current date for context
    const currentDate = new Date().toISOString();

    // Construct prompt with explicit instructions
    const prompt = `
      Current date: ${currentDate}

      Extract actionable tasks from the following text. For each task:
      - task: description/title of the task
      - subject: subject or category (if not specified, use "General")
      - priority: "High", "Medium", or "Low" (if not specified, use "Medium")
      - date: in YYYY-MM-DD format, or null if not specified or not calculable from today's date
      - startTime: in HH:MM format, or null if not specified
      - endTime: in HH:MM format, or null if not specified
      - isAmbiguousDate: true if date was ambiguous/not calculable, false otherwise

      If a date is not explicit or cannot be calculated from today's date (${currentDate}),
      return null for the date and set isAmbiguousDate to true. Do not guess schedules.

      Text to analyze: "${userInput}"

      Return ONLY a JSON object matching the schema. Do not include any other text.
    `.trim();

    // Temporary: List available models to find the exact Gemma 4 model string
    try {
      const models = await ai.models.list();
      console.log('Available models:', models.map(m => m.name));
      // Log the first model's name for quick reference
      if (models.length > 0) {
        console.log('First model name:', models[0].name);
      }
    } catch (listError) {
      console.warn('Could not list models:', listError.message);
    }

    // Call Gemini API with structured output
    const response = await ai.models.generateContent({
      model: 'gemma-4-31b-it', // Updated to exact Gemma 4 model string (31B instruction-tuned)
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: taskJsonSchema
      }
    });

    // Parse and return the tasks array
    const result = JSON.parse(response.text);
    return result.tasks || [];
  } catch (error) {
    console.error('Error extracting tasks from text:', error);
    throw error;
  }
}

module.exports = { extractTasksFromText };