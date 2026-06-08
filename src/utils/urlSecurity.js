const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i
];

const isSafeRedirectUrl = (value) => {
  try {
    const parsedUrl = new URL(value);
    const protocolAllowed = ['http:', 'https:'].includes(parsedUrl.protocol);
    const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, '');
    const isPrivateHost = PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));

    return protocolAllowed && !isPrivateHost;
  } catch (error) {
    return false;
  }
};

module.exports = {
  isSafeRedirectUrl
};
