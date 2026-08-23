const { Router } = require('express');
const busboy = require('busboy');
const { requireAuth } = require('../middlewares/auth');
const { uploadImage, isAllowedMimeType, MAX_FILE_SIZE_BYTES } = require('../services/uploadService');

const router = Router();

// POST /uploads — multipart/form-data, field name "image". Same auth as
// writing posts (x-api-key or an allow-listed Firebase ID token).
//
// Parsed with busboy directly instead of multer's own request-piping,
// because the Cloud Functions runtime already buffers the raw request body
// into req.rawBody before Express ever sees it — by the time multer tries to
// read the live req stream, it's already been fully consumed, so busboy sees
// zero bytes and fails with "Unexpected end of form". Feeding it req.rawBody
// explicitly sidesteps that. Locally (server.js, no Cloud Functions wrapper)
// there's no rawBody, so it falls back to piping the live stream, which
// works fine there since nothing's consumed it yet.
router.post('/', requireAuth, (req, res) => {
  let bb;
  try {
    // Throws synchronously (not an 'error' event) when the request has no
    // valid multipart Content-Type/boundary — e.g. no file field at all.
    bb = busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 } });
  } catch (err) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada. Envie um arquivo no campo "image".' });
  }

  let fileInfo = null;
  let fileTypeError = null;
  let fileTooLarge = false;
  let responded = false;

  const respond = (status, body) => {
    if (responded) return;
    responded = true;
    res.status(status).json(body);
  };

  bb.on('file', (fieldname, fileStream, info) => {
    const { filename, mimeType } = info;
    if (!isAllowedMimeType(mimeType)) {
      fileTypeError = 'Tipo de arquivo não suportado. Envie JPEG, PNG, GIF ou WEBP.';
      fileStream.resume();
      return;
    }

    const chunks = [];
    fileStream.on('data', (chunk) => chunks.push(chunk));
    fileStream.on('limit', () => {
      fileTooLarge = true;
    });
    fileStream.on('end', () => {
      if (fileTooLarge || fileTypeError) return;
      fileInfo = { originalname: filename, mimetype: mimeType, buffer: Buffer.concat(chunks) };
    });
  });

  bb.on('error', (err) => {
    console.error('POST /uploads: malformed multipart body:', err);
    respond(400, { error: 'Requisição de upload inválida.' });
  });

  bb.on('finish', async () => {
    if (fileTypeError) return respond(400, { error: fileTypeError });
    if (fileTooLarge) {
      return respond(400, { error: `Imagem maior que o limite de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.` });
    }
    if (!fileInfo) {
      return respond(400, { error: 'Nenhuma imagem enviada. Envie um arquivo no campo "image".' });
    }

    try {
      const url = await uploadImage(fileInfo);
      respond(201, { url });
    } catch (uploadErr) {
      console.error('POST /uploads failed:', uploadErr);
      respond(500, { error: 'Falha ao enviar a imagem.' });
    }
  });

  if (req.rawBody) {
    bb.end(req.rawBody);
  } else {
    req.pipe(bb);
  }
});

module.exports = router;
