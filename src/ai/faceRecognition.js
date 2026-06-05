import * as FileSystem from 'expo-file-system';
import { FACE_MATCH_THRESHOLD } from '../utils/constants';
 
// ── Face Recognition using pixel-based embedding ──────────────────────────────
// Uses a simplified approach compatible with Expo without native modules.
// For production, replace with a TFLite model via react-native-fast-tflite.
 
const EMBEDDING_SIZE = 128;
 
// Cosine similarity between two embedding vectors
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
};
 
// Euclidean distance between two embeddings
const euclideanDist = (a, b) => {
  if (!a || !b || a.length !== b.length) return Infinity;
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
};
 
// Generate a simple embedding from image URI using pixel sampling
// In production replace this with a real TFLite MobileFaceNet model
export const generateEmbedding = async (imageUri) => {
  try {
    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
 
    // Create a hash-based embedding from the base64 string
    // This is a placeholder — replace with TFLite inference in production
    const embedding = new Array(EMBEDDING_SIZE).fill(0);
    const step = Math.floor(base64.length / EMBEDDING_SIZE);
 
    for (let i = 0; i < EMBEDDING_SIZE; i++) {
      let val = 0;
      for (let j = 0; j < step; j++) {
        val += base64.charCodeAt(i * step + j);
      }
      embedding[i] = (val % 256) / 255.0;
    }
 
    // Normalise
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => v / (norm + 1e-10));
  } catch (e) {
    console.error('Embedding error:', e);
    return null;
  }
};
 
// Average multiple embeddings into one (for registration with 20 images)
export const averageEmbeddings = (embeddings) => {
  if (!embeddings || embeddings.length === 0) return null;
  const size = embeddings[0].length;
  const avg  = new Array(size).fill(0);
 
  embeddings.forEach(emb => {
    emb.forEach((v, i) => { avg[i] += v; });
  });
 
  const result = avg.map(v => v / embeddings.length);
 
  // Normalise the average
  const norm = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
  return result.map(v => v / (norm + 1e-10));
};
 
// Match a query embedding against all stored embeddings
// Returns best match or null
export const findMatch = (queryEmbedding, storedEmployees) => {
  if (!queryEmbedding || !storedEmployees || storedEmployees.length === 0) {
    return null;
  }
 
  let bestMatch = null;
  let bestScore = -Infinity;
 
  storedEmployees.forEach(employee => {
    if (!employee.embedding) return;
    const score = cosineSimilarity(queryEmbedding, employee.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = employee;
    }
  });
 
  // Return match only if above threshold
  if (bestScore >= FACE_MATCH_THRESHOLD) {
    return { ...bestMatch, confidence: Math.round(bestScore * 100) };
  }
 
  return null;
};