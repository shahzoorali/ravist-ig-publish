/**
 * publish.routes.js
 *
 * POST /api/publish
 *   Publishes a Reel + Story to Instagram.
 *   Called by ravist-v1 backend, never directly by the admin UI.
 *
 * POST /api/preview-caption
 *   Returns the auto-generated caption from event data.
 *   Used by ravist-v1 backend to pre-fill the caption textarea in the admin UI.
 */

const express = require('express');
const { publishToInstagram, buildCaption } = require('../services/instagram-publisher.service');

const router = express.Router();

// ── POST /api/publish ─────────────────────────────────────────────────────────
router.post('/publish', async (req, res, next) => {
  try {
    const {
      videoUrl,
      caption,          // final caption — already edited by admin
      publishPost  = true,
      publishStory = true,
    } = req.body;

    // Validation
    if (!videoUrl || typeof videoUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "videoUrl". Must be a public S3 URL.',
      });
    }

    if (publishPost && (!caption || typeof caption !== 'string')) {
      return res.status(400).json({
        success: false,
        error: 'Missing "caption". Required when publishPost is true.',
      });
    }

    console.log(`[publish] videoUrl: ${videoUrl.slice(0, 60)}...`);
    console.log(`[publish] publishPost: ${publishPost}, publishStory: ${publishStory}`);

    const result = await publishToInstagram({
      videoUrl,
      caption,
      publishPost,
      publishStory,
    });

    return res.json({
      success: true,
      post:    result.post  ?? null,
      story:   result.story ?? null,
      errors:  result.errors.length ? result.errors : undefined,
    });

  } catch (err) {
    next(err);
  }
});

// ── POST /api/preview-caption ─────────────────────────────────────────────────
router.post('/preview-caption', (req, res) => {
  try {
    const { event } = req.body;

    if (!event || typeof event !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing "event" object in request body.',
      });
    }

    const caption = buildCaption(event);
    return res.json({ success: true, caption });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
