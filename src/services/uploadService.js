const crypto = require('crypto');
const path = require('path');
const { getBucket } = require('../firebase');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const UPLOAD_PREFIX = 'uploads/';

function isAllowedMimeType(mimetype) {
  return ALLOWED_MIME_TYPES.includes(mimetype);
}

// A name is only ever "our" upload if it's exactly what uploadImage()
// generates — no slashes, no "..", nothing that could escape the uploads/
// prefix when building a storage path out of user input.
function isValidImageName(name) {
  return Boolean(name) && !name.includes('/') && !name.includes('..');
}

function publicUrl(bucket, filename) {
  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

async function uploadImage(file) {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `${UPLOAD_PREFIX}${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const bucket = getBucket();
  const blob = bucket.file(filename);

  await blob.save(file.buffer, {
    metadata: { contentType: file.mimetype },
    public: true,
  });

  return publicUrl(bucket, filename);
}

async function listImages() {
  const bucket = getBucket();
  const [files] = await bucket.getFiles({ prefix: UPLOAD_PREFIX });

  return files
    .map((file) => ({
      name: file.name.slice(UPLOAD_PREFIX.length),
      url: publicUrl(bucket, file.name),
      size: Number(file.metadata.size),
      contentType: file.metadata.contentType,
      createdAt: file.metadata.timeCreated,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function deleteImage(name) {
  if (!isValidImageName(name)) return false;

  const bucket = getBucket();
  const file = bucket.file(`${UPLOAD_PREFIX}${name}`);
  const [exists] = await file.exists();
  if (!exists) return false;

  await file.delete();
  return true;
}

module.exports = {
  uploadImage,
  listImages,
  deleteImage,
  isAllowedMimeType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
};
