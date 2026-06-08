const DEFAULT_JWT_SECRET = 'your_jwt_secret_here';

const validateEnvironment = () => {
  const { JWT_SECRET, NODE_ENV } = process.env;

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  if (NODE_ENV === 'production' && JWT_SECRET === DEFAULT_JWT_SECRET) {
    throw new Error('JWT_SECRET must be changed from the default placeholder in production');
  }
};

module.exports = {
  validateEnvironment
};
