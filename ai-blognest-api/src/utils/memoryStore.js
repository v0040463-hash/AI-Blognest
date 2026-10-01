const bcrypt = require('bcryptjs');

// In-Memory store as a robust fallback when MongoDB is not connected
const users = [];
const blogs = [];
const comments = [];

// Seed default admin and sample blogs
const initializeSeedData = async () => {
  if (users.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    const defaultUser = {
      _id: 'user_default_001',
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      role: 'author',
      bio: 'Tech enthusiast and AI blog author.',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=John',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(defaultUser);

    blogs.push({
      _id: 'blog_default_001',
      title: 'Getting Started with Real-Time AI Apps in 2026',
      slug: 'getting-started-with-real-time-ai-apps-in-2026',
      content: 'Artificial Intelligence and real-time streaming architectures are reshaping the modern web development landscape. Learn how WebSockets and generative LLMs create dynamic reactive interfaces.',
      summary: 'A comprehensive guide into building reactive AI-powered web applications using Node.js and Gemini.',
      category: 'Technology',
      tags: ['AI', 'NodeJS', 'RealTime', 'WebSockets'],
      author: defaultUser._id,
      authorName: defaultUser.name,
      views: 42,
      likes: [defaultUser._id],
      aiGenerated: true,
      aiPrompt: 'Overview of modern AI and WebSockets',
      status: 'published',
      readingTime: 3,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    });

    blogs.push({
      _id: 'blog_default_002',
      title: 'Microservices vs Monoliths: A Practical Guide',
      slug: 'microservices-vs-monoliths-a-practical-guide',
      content: 'Choosing the right architecture depends on team size, complexity, and deployment velocity. In this post, we explore when to stay monolithic and when to decouple.',
      summary: 'Practical architectural considerations for deciding between monolithic and microservice systems.',
      category: 'Engineering',
      tags: ['Architecture', 'Backend', 'SystemDesign'],
      author: defaultUser._id,
      authorName: defaultUser.name,
      views: 28,
      likes: [],
      aiGenerated: false,
      status: 'published',
      readingTime: 4,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    });

    comments.push({
      _id: 'comment_default_001',
      blog: 'blog_default_001',
      user: defaultUser._id,
      userName: defaultUser.name,
      userAvatar: defaultUser.avatar,
      content: 'Great breakdown of the real-time AI concepts!',
      createdAt: new Date().toISOString(),
    });
  }
};

initializeSeedData();

module.exports = {
  users,
  blogs,
  comments,
  initializeSeedData,
};
