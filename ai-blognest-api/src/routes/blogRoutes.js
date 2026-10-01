const express = require('express');
const { body } = require('express-validator');
const {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  toggleLike,
} = require('../controllers/blogController');
const { protect } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validateMiddleware');

const router = express.Router();

const blogValidation = [
  body('title').trim().notEmpty().withMessage('Blog title is required'),
  body('content').trim().notEmpty().withMessage('Blog content is required'),
  validate,
];

router.route('/')
  .get(getAllBlogs)
  .post(protect, blogValidation, createBlog);

router.route('/:id')
  .get(getBlogById)
  .put(protect, updateBlog)
  .delete(protect, deleteBlog);

router.post('/:id/like', protect, toggleLike);

module.exports = router;
