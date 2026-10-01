const express = require('express');
const { body } = require('express-validator');
const {
  addComment,
  getCommentsByBlog,
  deleteComment,
} = require('../controllers/commentController');
const { protect } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validateMiddleware');

const router = express.Router();

const commentValidation = [
  body('blogId').notEmpty().withMessage('blogId is required'),
  body('content').trim().notEmpty().withMessage('Comment content cannot be empty'),
  validate,
];

router.post('/', protect, commentValidation, addComment);
router.get('/blog/:blogId', getCommentsByBlog);
router.delete('/:id', protect, deleteComment);

module.exports = router;
