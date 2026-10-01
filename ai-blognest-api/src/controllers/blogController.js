const Blog = require('../models/Blog');
const Comment = require('../models/Comment');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isDbConnected } = require('../config/db');
const { blogs, comments } = require('../utils/memoryStore');
const { notifyNewBlog, notifyBlogLiked } = require('../socket/socketHandler');

// Helper to create slug
const createSlug = (title) => {
  return (
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4)
  );
};

// Helper for reading time
const calculateReadingTime = (content) => {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

// @desc    Create a new blog
// @route   POST /api/blogs
// @access  Private (Author or Admin)
const createBlog = async (req, res, next) => {
  try {
    const { title, content, summary, category = 'General', tags = [], coverImage, status = 'published', aiGenerated = false, aiPrompt = '' } = req.body;

    const parsedTags = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [];
    const autoSummary = summary || content.slice(0, 160).replace(/\n/g, ' ') + '...';

    if (isDbConnected()) {
      const blog = await Blog.create({
        title,
        content,
        summary: autoSummary,
        category,
        tags: parsedTags,
        coverImage: coverImage || '',
        author: req.user._id,
        authorName: req.user.name,
        status,
        aiGenerated,
        aiPrompt,
      });

      // Real-time broadcast
      notifyNewBlog(blog);

      return successResponse(res, 201, 'Blog post created successfully.', blog);
    } else {
      // Memory Store Fallback
      const newBlog = {
        _id: 'blog_' + Date.now(),
        title,
        slug: createSlug(title),
        content,
        summary: autoSummary,
        category,
        tags: parsedTags,
        coverImage: coverImage || '',
        author: req.user._id,
        authorName: req.user.name,
        views: 0,
        likes: [],
        aiGenerated,
        aiPrompt,
        status,
        readingTime: calculateReadingTime(content),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      blogs.unshift(newBlog);

      // Real-time broadcast
      notifyNewBlog(newBlog);

      return successResponse(res, 201, 'Blog post created successfully (In-Memory mode).', newBlog);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all blogs with filtering, search, pagination
// @route   GET /api/blogs
// @access  Public
const getAllBlogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { category, tag, search, sort = 'newest' } = req.query;

    if (isDbConnected()) {
      const filter = { status: 'published' };

      if (category) {
        filter.category = new RegExp(category, 'i');
      }

      if (tag) {
        filter.tags = { $in: [new RegExp(tag, 'i')] };
      }

      if (search) {
        filter.$or = [
          { title: new RegExp(search, 'i') },
          { content: new RegExp(search, 'i') },
          { summary: new RegExp(search, 'i') },
        ];
      }

      let sortOptions = { createdAt: -1 };
      if (sort === 'popular') sortOptions = { views: -1, createdAt: -1 };
      if (sort === 'likes') sortOptions = { 'likes.length': -1, createdAt: -1 };

      const total = await Blog.countDocuments(filter);
      const blogList = await Blog.find(filter)
        .populate('author', 'name email avatar')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

      return successResponse(
        res,
        200,
        'Blogs retrieved successfully.',
        blogList,
        {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        }
      );
    } else {
      // Memory Store Fallback
      let result = blogs.filter((b) => b.status === 'published');

      if (category) {
        result = result.filter((b) => b.category.toLowerCase() === category.toLowerCase());
      }

      if (tag) {
        result = result.filter((b) =>
          b.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
        );
      }

      if (search) {
        const queryLower = search.toLowerCase();
        result = result.filter(
          (b) =>
            b.title.toLowerCase().includes(queryLower) ||
            b.content.toLowerCase().includes(queryLower) ||
            (b.summary && b.summary.toLowerCase().includes(queryLower))
        );
      }

      if (sort === 'popular') {
        result.sort((a, b) => b.views - a.views);
      } else if (sort === 'likes') {
        result.sort((a, b) => b.likes.length - a.likes.length);
      } else {
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      const total = result.length;
      const paginated = result.slice(skip, skip + limit);

      return successResponse(
        res,
        200,
        'Blogs retrieved successfully (In-Memory mode).',
        paginated,
        {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        }
      );
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get single blog by ID or Slug
// @route   GET /api/blogs/:id
// @access  Public
const getBlogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      let blog;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        blog = await Blog.findById(id).populate('author', 'name email avatar bio');
      } else {
        blog = await Blog.findOne({ slug: id }).populate('author', 'name email avatar bio');
      }

      if (!blog) {
        return errorResponse(res, 404, 'Blog post not found.');
      }

      // Increment views
      blog.views += 1;
      await blog.save();

      const commentsCount = await Comment.countDocuments({ blog: blog._id });

      return successResponse(res, 200, 'Blog post details retrieved.', {
        ...blog.toObject(),
        commentsCount,
      });
    } else {
      // Memory Store Fallback
      const blog = blogs.find((b) => b._id === id || b.slug === id);
      if (!blog) {
        return errorResponse(res, 404, 'Blog post not found.');
      }

      blog.views += 1;
      const commentsCount = comments.filter((c) => c.blog === blog._id).length;

      return successResponse(res, 200, 'Blog post details retrieved (In-Memory mode).', {
        ...blog,
        commentsCount,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update a blog post
// @route   PUT /api/blogs/:id
// @access  Private (Author or Admin)
const updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, summary, category, tags, coverImage, status } = req.body;

    if (isDbConnected()) {
      const blog = await Blog.findById(id);
      if (!blog) {
        return errorResponse(res, 404, 'Blog post not found.');
      }

      // Check authorization
      const isOwner = blog.author.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return errorResponse(res, 403, 'Forbidden: You are not authorized to update this blog.');
      }

      if (title) blog.title = title;
      if (content) {
        blog.content = content;
        blog.readingTime = calculateReadingTime(content);
      }
      if (summary !== undefined) blog.summary = summary;
      if (category) blog.category = category;
      if (tags) blog.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
      if (coverImage !== undefined) blog.coverImage = coverImage;
      if (status) blog.status = status;

      const updated = await blog.save();
      return successResponse(res, 200, 'Blog post updated successfully.', updated);
    } else {
      // Memory Store Fallback
      const index = blogs.findIndex((b) => b._id === id || b.slug === id);
      if (index === -1) {
        return errorResponse(res, 404, 'Blog post not found.');
      }

      const blog = blogs[index];
      const isOwner = blog.author === req.user._id;
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return errorResponse(res, 403, 'Forbidden: You are not authorized to update this blog.');
      }

      if (title) blog.title = title;
      if (content) {
        blog.content = content;
        blog.readingTime = calculateReadingTime(content);
      }
      if (summary !== undefined) blog.summary = summary;
      if (category) blog.category = category;
      if (tags) blog.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
      if (coverImage !== undefined) blog.coverImage = coverImage;
      if (status) blog.status = status;
      blog.updatedAt = new Date().toISOString();

      return successResponse(res, 200, 'Blog post updated successfully (In-Memory mode).', blog);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a blog post
// @route   DELETE /api/blogs/:id
// @access  Private (Author or Admin)
const deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const blog = await Blog.findById(id);
      if (!blog) {
        return errorResponse(res, 404, 'Blog post not found.');
      }

      const isOwner = blog.author.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return errorResponse(res, 403, 'Forbidden: You are not authorized to delete this blog.');
      }

      await blog.deleteOne();
      await Comment.deleteMany({ blog: blog._id });

      return successResponse(res, 200, 'Blog post and related comments deleted successfully.');
    } else {
      // Memory Store Fallback
      const index = blogs.findIndex((b) => b._id === id || b.slug === id);
      if (index === -1) {
        return errorResponse(res, 404, 'Blog post not found.');
      }

      const blog = blogs[index];
      const isOwner = blog.author === req.user._id;
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return errorResponse(res, 403, 'Forbidden: You are not authorized to delete this blog.');
      }

      const removed = blogs.splice(index, 1)[0];
      // remove comments
      for (let i = comments.length - 1; i >= 0; i--) {
        if (comments[i].blog === removed._id) {
          comments.splice(i, 1);
        }
      }

      return successResponse(res, 200, 'Blog post deleted successfully (In-Memory mode).');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Like or unlike a blog post
// @route   POST /api/blogs/:id/like
// @access  Private
const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    if (isDbConnected()) {
      const blog = await Blog.findById(id);
      if (!blog) {
        return errorResponse(res, 404, 'Blog post not found.');
      }

      const likeIndex = blog.likes.findIndex((l) => l.toString() === userId);
      let liked = false;

      if (likeIndex === -1) {
        blog.likes.push(userId);
        liked = true;
      } else {
        blog.likes.splice(likeIndex, 1);
        liked = false;
      }

      await blog.save();

      // Real-time broadcast
      notifyBlogLiked(blog._id.toString(), blog.likes.length, req.user);

      return successResponse(res, 200, liked ? 'Blog post liked.' : 'Blog post unliked.', {
        liked,
        likesCount: blog.likes.length,
      });
    } else {
      // Memory Store Fallback
      const blog = blogs.find((b) => b._id === id || b.slug === id);
      if (!blog) {
        return errorResponse(res, 404, 'Blog post not found.');
      }

      const likeIndex = blog.likes.indexOf(userId);
      let liked = false;

      if (likeIndex === -1) {
        blog.likes.push(userId);
        liked = true;
      } else {
        blog.likes.splice(likeIndex, 1);
        liked = false;
      }

      // Real-time broadcast
      notifyBlogLiked(blog._id, blog.likes.length, req.user);

      return successResponse(res, 200, liked ? 'Blog post liked.' : 'Blog post unliked.', {
        liked,
        likesCount: blog.likes.length,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  toggleLike,
};
