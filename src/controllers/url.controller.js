const { validationResult } = require('express-validator');
const {
  buildCacheKey,
  createHttpError,
  createShortUrl,
  deleteUrlForOwner,
  findUrlByCode,
  getOwnedUrl,
  getSecondsUntilExpiry,
  getUrlsForUser,
  incrementClickCount
} = require('../services/url.service');
const { deleteCache, getCache, setCache } = require('../services/cache.service');

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

const getValidationError = (req) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return errors.array().map((error) => error.msg).join(', ');
  }

  return null;
};

const serializeAnalytics = (url) => {
  const isExpired = new Date(url.expiresAt).getTime() < Date.now();

  return {
    originalUrl: url.originalUrl,
    shortCode: url.shortCode,
    clickCount: url.clickCount,
    createdAt: url.createdAt,
    expiresAt: url.expiresAt,
    isExpired
  };
};

const shorten = async (req, res, next) => {
  try {
    const validationError = getValidationError(req);
    if (validationError) {
      throw createHttpError(400, validationError);
    }

    const { originalUrl, customAlias, expiresInDays } = req.body;
    const url = await createShortUrl({
      originalUrl,
      customAlias,
      expiresInDays,
      userId: req.user._id
    });
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    return res.status(201).json({
      shortUrl: `${baseUrl}/${url.shortCode}`,
      shortCode: url.shortCode,
      expiresAt: url.expiresAt
    });
  } catch (error) {
    return next(error);
  }
};

const redirectToOriginalUrl = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const cacheKey = buildCacheKey(shortCode);
    const cachedUrl = await getCache(cacheKey);

    if (cachedUrl) {
      if (new Date(cachedUrl.expiresAt).getTime() < Date.now()) {
        await deleteCache(cacheKey);
        return res.status(410).json({ error: 'Short URL has expired' });
      }

      incrementClickCount(shortCode);
      return res.redirect(302, cachedUrl.originalUrl);
    }

    const url = await findUrlByCode(shortCode);

    if (!url) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    if (new Date(url.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: 'Short URL has expired' });
    }

    const ttlSeconds = getSecondsUntilExpiry(url.expiresAt);
    await setCache(
      cacheKey,
      {
        originalUrl: url.originalUrl,
        expiresAt: url.expiresAt
      },
      ttlSeconds
    );

    incrementClickCount(shortCode);
    return res.redirect(302, url.originalUrl);
  } catch (error) {
    return next(error);
  }
};

const deleteUrl = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    await deleteUrlForOwner({ shortCode, userId: req.user._id });
    await deleteCache(buildCacheKey(shortCode));

    return res.status(200).json({ message: 'Short URL deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const url = await getOwnedUrl({
      shortCode: req.params.shortCode,
      userId: req.user._id
    });

    return res.status(200).json(serializeAnalytics(url));
  } catch (error) {
    return next(error);
  }
};

const getMyUrls = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || DEFAULT_PAGE_LIMIT, 1), MAX_PAGE_LIMIT);
    const { urls, total } = await getUrlsForUser(req.user._id, { page, limit });

    return res.status(200).json({
      data: urls.map(serializeAnalytics),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  deleteUrl,
  getAnalytics,
  getMyUrls,
  redirectToOriginalUrl,
  shorten
};
