const crypto = require('crypto');
const path = require('path');
const { getBucket } = require('../firebase');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function isAllowedMimeType(mimetype) {
  return ALLOWED_MIME_TYPES.includes(mimetype);
}

async function uploadImage(file) {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `uploads/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const bucket = getBucket();
  const blob = bucket.file(filename);

  await blob.save(file.buffer, {
    metadata: { contentType: file.mimetype },
    public: true,
  });

  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

module.exports = { uploadImage, isAllowedMimeType, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES };
