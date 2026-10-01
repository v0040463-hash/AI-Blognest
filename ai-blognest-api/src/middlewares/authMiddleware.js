const { verifyToken } = require('../utils/token');
const { errorResponse } = require('../utils/apiResponse');
const { isDbConnected } = require('../config/db');
const User = require('../models/User');
const { users } = require('../utils/memoryStore');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Access denied. No authorization token provided.');
  }

  try {
    const decoded = verifyToken(token);

    if (isDbConnected()) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return errorResponse(res, 401, 'User associated with this token no longer exists.');
      }
      req.user = user;
    } else {
      // Memory store fallback
      const user = users.find((u) => u._id === decoded.id || u.email === decoded.email);
      if (!user) {
        return errorResponse(res, 401, 'User associated with this token no longer exists.');
      }
      const { password, ...safeUser } = user;
      req.user = safeUser;
    }

    next();
  } catch (error) {
    return errorResponse(res, 401, 'Invalid or expired authorization token.');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Forbidden: Role '${req.user?.role || 'Guest'}' is not authorized to access this route.`
      );
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
