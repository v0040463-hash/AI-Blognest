const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

const getGenerativeModel = (modelName) => {
  const client = getGeminiClient();
  if (!client) return null;
  return client.getGenerativeModel({
    model: modelName || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  });
};

module.exports = {
  getGeminiClient,
  getGenerativeModel,
};
