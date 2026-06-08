const Url = require('../models/url.model');
const generateCode = require('../utils/generateCode');
const createHttpError = require('../utils/httpError');

const CACHE_PREFIX = 'url:';

const buildCacheKey = (shortCode) => `${CACHE_PREFIX}${shortCode}`;

const getSecondsUntilExpiry = (expiresAt) => {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
};

const createShortUrl = async ({ originalUrl, customAlias, expiresInDays = 30, userId }) => {
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  let shortCode = customAlias || generateCode();

  if (customAlias && (await Url.exists({ shortCode }))) {
    throw createHttpError(409, 'Short code already exists');
  }

  if (!customAlias) {
    let hasAvailableCode = false;

    for (let attempts = 0; attempts < 5; attempts += 1) {
      const existingUrl = await Url.exists({ shortCode });

      if (!existingUrl) {
        hasAvailableCode = true;
        break;
      }

      shortCode = generateCode();
    }

    if (!hasAvailableCode) {
      throw createHttpError(500, 'Unable to generate a unique short code');
    }
  }

  return Url.create({
    originalUrl,
    shortCode,
    userId,
    expiresAt
  });
};

const findUrlByCode = (shortCode) => Url.findOne({ shortCode });

const incrementClickCount = (shortCode) => {
  Url.updateOne({ shortCode }, { $inc: { clickCount: 1 } }).catch((error) => {
    console.error('Click count increment failed:', error.message);
  });
};

const deleteUrlForOwner = async ({ shortCode, userId }) => {
  const url = await Url.findOne({ shortCode });

  if (!url) {
    throw createHttpError(404, 'Short URL not found');
  }

  if (url.userId.toString() !== userId.toString()) {
    throw createHttpError(403, 'You do not have permission to delete this URL');
  }

  await Url.deleteOne({ _id: url._id });
  return url;
};

const getOwnedUrl = async ({ shortCode, userId }) => {
  const url = await Url.findOne({ shortCode, userId });

  if (!url) {
    throw createHttpError(404, 'Short URL not found');
  }

  return url;
};

const getUrlsForUser = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [urls, total] = await Promise.all([
    Url.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Url.countDocuments({ userId })
  ]);

  return { urls, total };
};

module.exports = {
  buildCacheKey,
  createHttpError,
  createShortUrl,
  deleteUrlForOwner,
  findUrlByCode,
  getOwnedUrl,
  getSecondsUntilExpiry,
  getUrlsForUser,
  incrementClickCount
};
