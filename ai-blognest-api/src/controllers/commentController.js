const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isDbConnected } = require('../config/db');
const { comments, blogs } = require('../utils/memoryStore');
const { notifyNewComment } = require('../socket/socketHandler');

// @desc    Add comment to a blog
// @route   POST /api/comments
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const { blogId, content } = req.body;

    if (!blogId || !content) {
      return errorResponse(res, 400, 'Blog ID and comment content are required.');
    }

    if (isDbConnected()) {
      const blog = await Blog.findById(blogId);
      if (!blog) {
        return errorResponse(res, 404, 'Target blog post not found.');
      }

      const comment = await Comment.create({
        blog: blog._id,
        user: req.user._id,
        userName: req.user.name,
        userAvatar: req.user.avatar || '',
        content,
      });

      // Real-time broadcast to all viewers of this blog
      notifyNewComment(blog._id.toString(), comment);

      return successResponse(res, 201, 'Comment added successfully.', comment);
    } else {
      // Memory Store Fallback
      const blog = blogs.find((b) => b._id === blogId || b.slug === blogId);
      if (!blog) {
        return errorResponse(res, 404, 'Target blog post not found.');
      }

      const newComment = {
        _id: 'comment_' + Date.now(),
        blog: blog._id,
        user: req.user._id,
        userName: req.user.name,
        userAvatar: req.user.avatar || '',
        content,
        createdAt: new Date().toISOString(),
      };

      comments.push(newComment);

      // Real-time broadcast
      notifyNewComment(blog._id, newComment);

      return successResponse(res, 201, 'Comment added successfully (In-Memory mode).', newComment);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get comments for a blog post
// @route   GET /api/comments/blog/:blogId
// @access  Public
const getCommentsByBlog = async (req, res, next) => {
  try {
    const { blogId } = req.params;

    if (isDbConnected()) {
      const commentList = await Comment.find({ blog: blogId })
        .populate('user', 'name avatar bio')
        .sort({ createdAt: -1 });

      return successResponse(res, 200, 'Comments retrieved successfully.', commentList);
    } else {
      // Memory Store Fallback
      const commentList = comments
        .filter((c) => c.blog === blogId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return successResponse(res, 200, 'Comments retrieved successfully (In-Memory mode).', commentList);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private (Comment Author or Admin)
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const comment = await Comment.findById(id);
      if (!comment) {
        return errorResponse(res, 404, 'Comment not found.');
      }

      const isOwner = comment.user.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return errorResponse(res, 403, 'Forbidden: You are not authorized to delete this comment.');
      }

      await comment.deleteOne();
      return successResponse(res, 200, 'Comment deleted successfully.');
    } else {
      // Memory Store Fallback
      const index = comments.findIndex((c) => c._id === id);
      if (index === -1) {
        return errorResponse(res, 404, 'Comment not found.');
      }

      const comment = comments[index];
      const isOwner = comment.user === req.user._id;
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return errorResponse(res, 403, 'Forbidden: You are not authorized to delete this comment.');
      }

      comments.splice(index, 1);
      return successResponse(res, 200, 'Comment deleted successfully (In-Memory mode).');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addComment,
  getCommentsByBlog,
  deleteComment,
};
