/**
 * instagram-publisher.service.js
 *
 * Publishes a Reel + Story to Instagram via the official Graph API.
 *
 * Reel flow:
 *   1. POST /{ig-user-id}/media  (media_type=REELS, video_url, caption)
 *      → returns container_id
 *   2. Poll /{container_id}?fields=status_code until FINISHED
 *   3. POST /{ig-user-id}/media_publish (creation_id=container_id)
 *      → returns published media_id
 *
 * Story flow: identical but media_type=STORIES, no caption.
 *
 * Both run in parallel — if one fails the other still publishes.
 */

const axios = require('axios');

const GRAPH_BASE        = 'https://graph.facebook.com/v19.0';
const TIMEOUT_MS        = 20_000;
const POLL_INTERVAL_MS  = 5_000;   // poll every 5s
const POLL_MAX_ATTEMPTS = 24;      // 24 × 5s = 2 minutes max

// ─── Config ───────────────────────────────────────────────────────────────────

function getConfig() {
  const token    = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!token)    throw new Error('Missing INSTAGRAM_PAGE_ACCESS_TOKEN in .env');
  if (!igUserId) throw new Error('Missing INSTAGRAM_BUSINESS_ACCOUNT_ID in .env');
  return { token, igUserId };
}

// ─── Caption builder ──────────────────────────────────────────────────────────

/**
 * Builds a structured caption from Ravist event fields.
 * Matches the data shape from ravist-v1 backend event model.
 *
 * @param {object} event
 * @param {string} event.title
 * @param {string} [event.tagline]
 * @param {string} [event.date]          - formatted date string e.g. "Sunday, April 12"
 * @param {string} [event.startTime]     - e.g. "7:00 PM"
 * @param {string} [event.venue]         - venue name string
 * @param {string} [event.description]   - Ravist-voice description (already AI-written)
 * @param {string} [event.ticketUrl]
 * @param {string[]} [event.genres]      - used as hashtags
 * @param {string[]} [event.artists]     - artist names
 */
function buildCaption(event) {
  const lines = [];

  // ── Header ────────────────────────────────────────────────────────────────
  if (event.title)   lines.push(event.title);
  if (event.tagline) lines.push(event.tagline);

  lines.push('');

  // ── Event details ─────────────────────────────────────────────────────────
  if (event.date)      lines.push(`📅  ${event.date}`);
  if (event.startTime) lines.push(`🕐  ${event.startTime}`);
  if (event.venue)     lines.push(`📍  ${event.venue}`);

  // ── Artists ───────────────────────────────────────────────────────────────
  if (event.artists?.length) {
    lines.push('');
    lines.push(event.artists.join(' + '));
  }

  // ── Description (already written in Ravist voice by AI) ──────────────────
  if (event.description) {
    lines.push('');
    lines.push(event.description);
  }

  // ── CTA ───────────────────────────────────────────────────────────────────
  if (event.ticketUrl) {
    lines.push('');
    lines.push('🎟  Tickets → link in bio');
  }

  // ── Hashtags from genres ──────────────────────────────────────────────────
  if (event.genres?.length) {
    lines.push('');
    const tags = event.genres
      .map(g => '#' + g.toLowerCase().replace(/\s+/g, ''))
      .join(' ');
    lines.push(tags);
  }

  return lines.join('\n').trim();
}

// ─── Polling ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Polls container status until FINISHED or throws on ERROR/timeout.
 */
async function waitForContainer(containerId, token) {
  console.log(`[publisher] Polling container ${containerId}`);

  for (let i = 1; i <= POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const res = await axios.get(`${GRAPH_BASE}/${containerId}`, {
      params: { fields: 'status_code,status,error_message', access_token: token },
      timeout: TIMEOUT_MS,
    });

    const { status_code, status, error_message } = res.data;
    console.log(`[publisher]   attempt ${i}/${POLL_MAX_ATTEMPTS} → ${status_code}`);

    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR') {
      const msg = error_message ? `${status} (${error_message})` : status;
      throw new Error(`Container error: ${msg ?? 'unknown'}`);
    }
    if (status_code === 'EXPIRED')  throw new Error('Container expired before publishing.');
    // IN_PROGRESS → keep polling
  }

  throw new Error('Container timed out after 2 minutes.');
}

// ─── Graph API calls ──────────────────────────────────────────────────────────

function isImage(url) {
  const extension = url.toLowerCase().split('?')[0].split('.').pop();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(extension);
}

async function createContainer({ igUserId, token, mediaUrl, caption, isStory }) {
  const isImg = isImage(mediaUrl);
  
  const params = {
    access_token: token,
  };

  if (isStory) {
    params.media_type = 'STORIES';
    if (isImg) params.image_url = mediaUrl;
    else params.video_url = mediaUrl;
  } else {
    // For feed/reels
    if (isImg) {
      params.media_type = 'IMAGE';
      params.image_url  = mediaUrl;
    } else {
      params.media_type = 'REELS';
      params.video_url  = mediaUrl;
    }
    params.caption       = caption;
    params.share_to_feed = 'true';
  }

  const res = await axios.post(
    `${GRAPH_BASE}/${igUserId}/media`,
    null,
    { params, timeout: TIMEOUT_MS }
  );

  if (!res.data?.id) {
    throw new Error(`createContainer: no ID returned — ${JSON.stringify(res.data)}`);
  }

  const typeLabel = isStory ? 'Story' : (isImg ? 'Post' : 'Reel');
  console.log(`[publisher] Container created: ${res.data.id} (${typeLabel})`);
  return res.data.id;
}

async function publishContainer({ igUserId, token, containerId }) {
  const res = await axios.post(
    `${GRAPH_BASE}/${igUserId}/media_publish`,
    null,
    {
      params: { creation_id: containerId, access_token: token },
      timeout: TIMEOUT_MS,
    }
  );

  if (!res.data?.id) {
    throw new Error(`publishContainer: no media ID returned — ${JSON.stringify(res.data)}`);
  }

  console.log(`[publisher] Published! Media ID: ${res.data.id}`);
  return res.data.id;
}

async function getPermalink(mediaId, token) {
  try {
    const res = await axios.get(`${GRAPH_BASE}/${mediaId}`, {
      params: { fields: 'permalink', access_token: token },
      timeout: TIMEOUT_MS,
    });
    return res.data?.permalink ?? null;
  } catch {
    return null;  // non-fatal — permalink is a bonus
  }
}

// ─── Publish flows ────────────────────────────────────────────────────────────

async function publishReel({ igUserId, token, videoUrl, caption }) {
  const containerId = await createContainer({ igUserId, token, mediaUrl: videoUrl, caption, isStory: false });
  await waitForContainer(containerId, token);
  const mediaId   = await publishContainer({ igUserId, token, containerId });
  const permalink = await getPermalink(mediaId, token);
  return { mediaId, permalink };
}

async function publishStory({ igUserId, token, videoUrl }) {
  const containerId = await createContainer({ igUserId, token, mediaUrl: videoUrl, isStory: true });
  await waitForContainer(containerId, token);
  const mediaId = await publishContainer({ igUserId, token, containerId });
  return { mediaId };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main entry — publishes Reel + Story in parallel.
 *
 * @param {object}   opts
 * @param {string}   opts.videoUrl      S3 URL of the event poster/video
 * @param {string}   opts.caption       Final caption (admin-edited or auto-built)
 * @param {boolean}  [opts.publishPost=true]
 * @param {boolean}  [opts.publishStory=true]
 */
async function publishToInstagram({ videoUrl, caption, publishPost = true, publishStory: doStory = true }) {
  if (!videoUrl)              throw new Error('videoUrl is required');
  if (publishPost && !caption) throw new Error('caption is required when publishing a post');

  const { token, igUserId } = getConfig();
  const results = { errors: [] };

  const tasks = [];

  if (publishPost) {
    tasks.push(
      publishReel({ igUserId, token, videoUrl, caption })
        .then(data => { results.post = data; })
        .catch(err => {
          console.error('[publisher] Reel failed:', err.message);
          results.errors.push(`post: ${err.message}`);
        })
    );
  }

  if (doStory) {
    tasks.push(
      publishStory({ igUserId, token, videoUrl })
        .then(data => { results.story = data; })
        .catch(err => {
          console.error('[publisher] Story failed:', err.message);
          results.errors.push(`story: ${err.message}`);
        })
    );
  }

  await Promise.all(tasks);

  const succeeded = (results.post ? 1 : 0) + (results.story ? 1 : 0);
  if (succeeded === 0) {
    const err = new Error('Both Reel and Story publishing failed');
    err.details    = results.errors;
    err.statusCode = 502;
    throw err;
  }

  return results;
}

module.exports = { publishToInstagram, buildCaption };
