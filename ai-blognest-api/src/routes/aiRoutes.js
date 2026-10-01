const express = require('express');
const { body } = require('express-validator');
const {
  generateBlog,
  summarizeBlog,
  generateTitles,
} = require('../controllers/aiController');
const { validate } = require('../middlewares/validateMiddleware');

const router = express.Router();

router.post(
  '/generate-blog',
  [body('topic').trim().notEmpty().withMessage('Topic is required'), validate],
  generateBlog
);

router.post(
  '/summarize',
  [body('content').trim().notEmpty().withMessage('Content to summarize is required'), validate],
  summarizeBlog
);

router.post(
  '/generate-titles',
  [body('topic').trim().notEmpty().withMessage('Topic is required'), validate],
  generateTitles
);

module.exports = router;
