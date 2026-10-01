const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/token');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isDbConnected } = require('../config/db');
const { users } = require('../utils/memoryStore');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'author', bio } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return errorResponse(res, 400, 'User with this email already exists.');
      }

      const user = await User.create({
        name,
        email: normalizedEmail,
        password,
        role,
        bio: bio || '',
      });

      const token = generateToken({ id: user._id, email: user.email, role: user.role });

      return successResponse(
        res,
        201,
        'User registered successfully.',
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            bio: user.bio,
            avatar: user.avatar,
            createdAt: user.createdAt,
          },
          token,
        }
      );
    } else {
      // Memory Store Fallback
      const existingUser = users.find((u) => u.email === normalizedEmail);
      if (existingUser) {
        return errorResponse(res, 400, 'User with this email already exists.');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        _id: 'user_' + Date.now(),
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        bio: bio || '',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      users.push(newUser);

      const token = generateToken({ id: newUser._id, email: newUser.email, role: newUser.role });

      return successResponse(
        res,
        201,
        'User registered successfully (In-Memory mode).',
        {
          user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            bio: newUser.bio,
            avatar: newUser.avatar,
            createdAt: newUser.createdAt,
          },
          token,
        }
      );
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail }).select('+password');
      if (!user) {
        return errorResponse(res, 401, 'Invalid email or password.');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return errorResponse(res, 401, 'Invalid email or password.');
      }

      const token = generateToken({ id: user._id, email: user.email, role: user.role });

      return successResponse(res, 200, 'Login successful.', {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          bio: user.bio,
          avatar: user.avatar,
        },
        token,
      });
    } else {
      // Memory Store Fallback
      const user = users.find((u) => u.email === normalizedEmail);
      if (!user) {
        return errorResponse(res, 401, 'Invalid email or password.');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return errorResponse(res, 401, 'Invalid email or password.');
      }

      const token = generateToken({ id: user._id, email: user.email, role: user.role });

      return successResponse(res, 200, 'Login successful (In-Memory mode).', {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          bio: user.bio,
          avatar: user.avatar,
        },
        token,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    return successResponse(res, 200, 'User profile fetched successfully.', {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        bio: req.user.bio,
        avatar: req.user.avatar,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, avatar } = req.body;

    if (isDbConnected()) {
      const user = await User.findById(req.user._id);
      if (!user) {
        return errorResponse(res, 404, 'User not found.');
      }

      if (name) user.name = name;
      if (bio !== undefined) user.bio = bio;
      if (avatar) user.avatar = avatar;

      const updatedUser = await user.save();

      return successResponse(res, 200, 'Profile updated successfully.', {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          bio: updatedUser.bio,
          avatar: updatedUser.avatar,
        },
      });
    } else {
      // Memory Store Fallback
      const userIndex = users.findIndex((u) => u._id === req.user._id);
      if (userIndex === -1) {
        return errorResponse(res, 404, 'User not found.');
      }

      if (name) users[userIndex].name = name;
      if (bio !== undefined) users[userIndex].bio = bio;
      if (avatar) users[userIndex].avatar = avatar;
      users[userIndex].updatedAt = new Date().toISOString();

      const updated = users[userIndex];
      return successResponse(res, 200, 'Profile updated successfully.', {
        user: {
          id: updated._id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          bio: updated.bio,
          avatar: updated.avatar,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};
