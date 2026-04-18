/**
 * instagram-publish.service.js
 *
 * Drop this file into: ravist-v1/backend/src/services/
 *
 * Called by the event controller when admin clicks "Publish to Instagram".
 * Talks to the ravist-ig-publish microservice running at localhost:3004.
 *
 * Usage:
 *   const igPublish = require('./instagram-publish.service');
 *
 *   // 1. Preview caption (admin edits this in the UI before publishing)
 *   const { caption } = await igPublish.previewCaption(event);
 *
 *   // 2. Publish with final caption
 *   const result = await igPublish.publish({ videoUrl, caption });
 */

const axios = require('axios');

const PUBLISHER_BASE = process.env.IG_PUBLISHER_URL || 'http://localhost:3004';
const TIMEOUT_MS     = 180_000;   // 3 min — video processing can take ~2 min

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.IG_PUBLISHER_API_KEY) {
    headers['X-API-Key'] = process.env.IG_PUBLISHER_API_KEY;
  }
  return headers;
}

/**
 * Generates a preview caption from event data.
 * Call this when the admin opens the "Publish to Instagram" modal
 * so the textarea is pre-filled and editable.
 *
 * @param {object} event  - Ravist event object from DB
 * @returns {Promise<{ caption: string }>}
 */
async function previewCaption(event) {
  const res = await axios.post(
    `${PUBLISHER_BASE}/api/preview-caption`,
    { event: _normaliseEvent(event) },
    { headers: getHeaders(), timeout: 10_000 }
  );

  if (!res.data?.success) {
    throw new Error(res.data?.error ?? 'preview-caption failed');
  }

  return { caption: res.data.caption };
}

/**
 * Publishes a Reel + Story to Instagram.
 *
 * @param {object} opts
 * @param {string} opts.videoUrl      S3 URL of the event poster/video
 * @param {string} opts.caption       Final caption (admin-edited)
 * @param {boolean} [opts.publishPost=true]
 * @param {boolean} [opts.publishStory=true]
 * @returns {Promise<{ post: object|null, story: object|null, errors: string[] }>}
 */
async function publish({ videoUrl, caption, publishPost = true, publishStory = true }) {
  if (!videoUrl) throw new Error('instagram-publish: videoUrl is required');
  if (!caption)  throw new Error('instagram-publish: caption is required');

  const res = await axios.post(
    `${PUBLISHER_BASE}/api/publish`,
    { videoUrl, caption, publishPost, publishStory },
    { headers: getHeaders(), timeout: TIMEOUT_MS }
  );

  if (!res.data?.success) {
    const err = new Error(res.data?.error ?? 'Instagram publish failed');
    err.details = res.data?.details;
    throw err;
  }

  return {
    post:   res.data.post  ?? null,
    story:  res.data.story ?? null,
    errors: res.data.errors ?? [],
  };
}

/**
 * Health check — call on startup to verify the microservice is reachable.
 */
async function healthCheck() {
  try {
    const res = await axios.get(`${PUBLISHER_BASE}/health`, { timeout: 3_000 });
    return res.data;
  } catch {
    return { status: 'unreachable', url: PUBLISHER_BASE };
  }
}

/**
 * Maps a Ravist DB event object to the shape the publisher expects.
 * Adjust field names here if your DB schema differs.
 */
function _normaliseEvent(event) {
  return {
    title:       event.title       ?? event.name,
    tagline:     event.tagline     ?? null,
    date:        event.date        ?? null,   // already-formatted string
    startTime:   event.startTime   ?? event.start_time ?? event.time ?? null,
    venue:       typeof event.venue === 'object'
                   ? event.venue?.name          // if venue is a populated object
                   : event.venue ?? null,
    description: event.description ?? null,
    ticketUrl:   event.ticketUrl   ?? event.ticket_url ?? null,
    genres:      event.genres      ?? [],
    artists:     Array.isArray(event.artists)
                   ? event.artists.map(a => typeof a === 'object' ? a.name : a)
                   : [],
  };
}

module.exports = { previewCaption, publish, healthCheck };
