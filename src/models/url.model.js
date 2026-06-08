const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
      trim: true
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Url', urlSchema);
