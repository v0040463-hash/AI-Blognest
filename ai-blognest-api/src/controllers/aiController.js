const { getGenerativeModel } = require('../config/ai');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// High-quality simulated response generator for out-of-the-box testing without an API key
const generateSimulatedBlog = (topic, tone = 'informative', category = 'Technology') => {
  const cleanTopic = topic.trim();
  return {
    title: `The Future of ${cleanTopic}: Trends, Insights & Strategies`,
    summary: `An in-depth exploration of ${cleanTopic}, examining practical applications, emerging trends, and actionable strategies for modern developers and creators.`,
    content: `## Introduction\n\nIn recent years, **${cleanTopic}** has emerged as one of the most transformative concepts in modern technology. Whether you are building real-time applications or architecting high-throughput distributed systems, understanding ${cleanTopic} is essential.\n\n## Why ${cleanTopic} Matters\n\n1. **Scalability & Performance**: Optimizes workflow bottlenecks and accelerates execution.\n2. **Enhanced User Experience**: Enables seamless, intelligent interactions in real-time.\n3. **Future-Proofing**: Keeps software engineering stacks aligned with next-generation standards.\n\n## Key Architectural Patterns\n\nWhen implementing solutions around ${cleanTopic}, consider adopting modular services, decoupled messaging queues, and automated validation layers.\n\n\`\`\`javascript\n// Sample implementation concept\nconst solution = async (input) => {\n  console.log('Processing ${cleanTopic}...', input);\n  return { status: 'success', data: input };\n};\n\`\`\`\n\n## Conclusion\n\nAs the industry continues to evolve, embracing ${cleanTopic} will unlock unprecedented possibilities. Start small, iterate rapidly, and measure results continuously.`,
    tags: [cleanTopic.replace(/\s+/g, ''), 'Technology', 'AI', 'Innovation', 'WebDev'],
    category: category || 'Technology',
    readingTime: 3,
    provider: 'AI BlogNest Simulator (Add GEMINI_API_KEY in .env for live Gemini output)',
  };
};

// @desc    Generate a complete blog post with AI
// @route   POST /api/ai/generate-blog
// @access  Public / Protected
const generateBlog = async (req, res, next) => {
  try {
    const { topic, tone = 'informative', category = 'Technology', targetAudience = 'Tech enthusiasts' } = req.body;

    if (!topic || topic.trim() === '') {
      return errorResponse(res, 400, 'Topic is required for blog generation.');
    }

    const model = getGenerativeModel();

    if (!model) {
      // Graceful fallback simulation
      const simulated = generateSimulatedBlog(topic, tone, category);
      return successResponse(res, 200, 'Blog post generated successfully (Simulation mode).', simulated);
    }

    const prompt = `
You are an expert technical writer and SEO copywriter for AI BlogNest.
Write a comprehensive, engaging, and professional blog post on the topic: "${topic}".
Tone: ${tone}
Category: ${category}
Target Audience: ${targetAudience}

Respond ONLY with a valid JSON object strictly matching this schema, without backticks or markdown fences around the json:
{
  "title": "A catchy, SEO-optimized title",
  "summary": "A 2-3 sentence engaging summary",
  "content": "Full markdown content with headers (##), bullet points, and code snippets if applicable",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "category": "${category}"
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    let parsedData;
    try {
      const sanitized = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(sanitized);
    } catch (parseError) {
      // If AI didn't format strictly as JSON, parse cleanly
      parsedData = {
        title: `Comprehensive Guide to ${topic}`,
        summary: `Explore the key concepts and actionable takeaways of ${topic}.`,
        content: responseText,
        tags: [topic.replace(/\s+/g, ''), 'AI', 'Technology'],
        category,
      };
    }

    const wordCount = (parsedData.content || '').split(/\s+/).filter(Boolean).length;
    parsedData.readingTime = Math.max(1, Math.ceil(wordCount / 200));
    parsedData.provider = 'Google Gemini AI';

    return successResponse(res, 200, 'Blog post generated successfully with Gemini AI.', parsedData);
  } catch (error) {
    console.error('[Gemini AI Error]:', error.message);
    // If Gemini API fails (e.g. quota or invalid key), provide simulated fallback gracefully
    const fallback = generateSimulatedBlog(req.body.topic || 'Software Development', req.body.tone, req.body.category);
    return successResponse(
      res,
      200,
      'Blog generated with fallback simulator (Gemini API returned error: ' + error.message + ')',
      fallback
    );
  }
};

// @desc    Summarize existing blog content
// @route   POST /api/ai/summarize
// @access  Public
const summarizeBlog = async (req, res, next) => {
  try {
    const { content, maxSentences = 3 } = req.body;

    if (!content || content.trim() === '') {
      return errorResponse(res, 400, 'Content is required for summarization.');
    }

    const model = getGenerativeModel();

    if (!model) {
      // Fallback summary
      const sentences = content.split(/[.?!]\s+/).filter(Boolean);
      const summaryText = sentences.slice(0, maxSentences).join('. ') + '.';
      return successResponse(res, 200, 'Summary generated successfully (Simulation mode).', {
        summary: summaryText || 'A concise review of the presented material.',
        keyTakeaways: [
          'Core concept breakdown and analysis.',
          'Key implementation takeaways.',
          'Future outlook and summary.',
        ],
        provider: 'AI BlogNest Simulator',
      });
    }

    const prompt = `
Summarize the following blog post content in ${maxSentences} concise sentences, followed by 3 bulleted key takeaways.
Content:
"""
${content}
"""

Format your response as valid JSON:
{
  "summary": "Concise paragraph summary",
  "keyTakeaways": ["Point 1", "Point 2", "Point 3"]
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    let parsed;
    try {
      const sanitized = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(sanitized);
    } catch (e) {
      parsed = {
        summary: responseText,
        keyTakeaways: [],
      };
    }

    parsed.provider = 'Google Gemini AI';
    return successResponse(res, 200, 'Summary generated successfully.', parsed);
  } catch (error) {
    console.error('[Gemini Summarize Error]:', error.message);
    return successResponse(res, 200, 'Summary generated with fallback.', {
      summary: req.body.content.slice(0, 180) + '...',
      keyTakeaways: ['Primary takeaway from the article', 'Practical implementation considerations'],
      provider: 'AI BlogNest Simulator (Fallback)',
    });
  }
};

// @desc    Generate Catchy Blog Titles and SEO Keywords
// @route   POST /api/ai/generate-titles
// @access  Public
const generateTitles = async (req, res, next) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return errorResponse(res, 400, 'Topic is required.');
    }

    const model = getGenerativeModel();

    if (!model) {
      return successResponse(res, 200, 'Titles generated (Simulation mode).', {
        topic,
        titles: [
          `Mastering ${topic}: From Novice to Pro in 2026`,
          `Why ${topic} Is Changing Everything You Know About Tech`,
          `The Ultimate Developer's Roadmap to ${topic}`,
          `10 Common Mistakes When Implementing ${topic} (And How to Fix Them)`,
          `${topic} Explained Simply: What You Need to Know`,
        ],
        keywords: [topic.toLowerCase(), 'tutorial', 'guide', 'best practices', '2026'],
      });
    }

    const prompt = `Generate 5 catchy, high-converting blog post titles and 5 SEO keywords for the topic: "${topic}".
Output as JSON:
{
  "titles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"],
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const sanitized = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(sanitized);

    return successResponse(res, 200, 'Titles generated successfully.', parsed);
  } catch (error) {
    return successResponse(res, 200, 'Titles generated with fallback.', {
      topic: req.body.topic,
      titles: [
        `The Complete Guide to ${req.body.topic}`,
        `Modern Insights on ${req.body.topic}`,
        `Building with ${req.body.topic}: Practical Steps`,
      ],
      keywords: [req.body.topic, 'guide', 'ai'],
    });
  }
};

module.exports = {
  generateBlog,
  summarizeBlog,
  generateTitles,
};
