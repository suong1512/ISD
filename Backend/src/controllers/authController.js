const authService = require('../services/authService');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const user = await authService.login(email, password);

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    return res.status(200).json({
      message: 'Login successful',
      data: user
    });
  } catch (error) {
    console.error('Error in login:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function getMe(req, res) {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({
        message: 'userId is required'
      });
    }

    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    return res.status(200).json({
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error in getMe:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

module.exports = {
  login,
  getMe
};
