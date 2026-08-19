const { getDb } = require('../firebase');

const COLLECTION = 'posts';

async function getAllPosts() {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getPostById(id) {
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function createPost(data) {
  const db = getDb();
  const now = new Date().toISOString();
  const post = {
    title: data.title,
    content: data.content,
    slug: data.slug,
    published: data.published !== undefined ? Boolean(data.published) : false,
    description: data.description !== undefined ? data.description : '',
    tags: data.tags !== undefined ? data.tags : [],
    lang: data.lang !== undefined ? data.lang : 'pt',
    publishAt: data.publishAt !== undefined ? data.publishAt : null,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await db.collection(COLLECTION).add(post);
  return { id: ref.id, ...post };
}

async function updatePost(id, data) {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const updates = { updatedAt: new Date().toISOString() };
  if (data.title !== undefined) updates.title = data.title;
  if (data.content !== undefined) updates.content = data.content;
  if (data.slug !== undefined) updates.slug = data.slug;
  if (data.published !== undefined) updates.published = Boolean(data.published);
  if (data.description !== undefined) updates.description = data.description;
  if (data.tags !== undefined) updates.tags = data.tags;
  if (data.lang !== undefined) updates.lang = data.lang;
  if (data.publishAt !== undefined) updates.publishAt = data.publishAt;

  await ref.update(updates);
  return { id, ...doc.data(), ...updates };
}

async function deletePost(id) {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

// Publishes every post whose scheduled publishAt has passed and isn't
// published yet. Returns the list of posts that were just published.
async function publishDuePosts(now = new Date()) {
  const db = getDb();
  const nowIso = now.toISOString();
  const snapshot = await db
    .collection(COLLECTION)
    .where('published', '==', false)
    .where('publishAt', '<=', nowIso)
    .get();

  if (snapshot.empty) return [];

  const updatedAt = new Date().toISOString();
  const batch = db.batch();
  const published = [];
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { published: true, updatedAt });
    published.push({ id: doc.id, ...doc.data(), published: true, updatedAt });
  });
  await batch.commit();
  return published;
}

module.exports = { getAllPosts, getPostById, createPost, updatePost, deletePost, publishDuePosts };
