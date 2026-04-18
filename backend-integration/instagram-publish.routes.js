/**
 * instagram-publish.routes.js
 *
 * Drop this file into: ravist-v1/backend/src/routes/  (or wherever your routes live)
 * Then register it in your main router:
 *
 *   const igPublishRoutes = require('./instagram-publish.routes');
 *   router.use('/events', igPublishRoutes);   // or app.use('/api/events', ...)
 *
 * This exposes:
 *   GET  /api/events/:id/instagram-caption   → pre-fill caption in admin UI
 *   POST /api/events/:id/publish-instagram   → trigger publish
 */

const express    = require('express');
const igPublish  = require('../services/instagram-publish.service');

// ── Adjust this import to match your existing auth middleware ──────────────────
// e.g. const { requireAdmin } = require('../middleware/auth');
const requireAdmin = (req, res, next) => next();  // REPLACE with your actual admin auth

const router = express.Router({ mergeParams: true });

// ── GET /api/events/:id/instagram-caption ─────────────────────────────────────
// Called when admin opens the "Publish to Instagram" modal.
// Returns the auto-generated caption so the textarea is pre-filled.
router.get('/:id/instagram-caption', requireAdmin, async (req, res, next) => {
  try {
    // ── Fetch event from your DB ──────────────────────────────────────────────
    // Replace this with your actual DB query, e.g.:
    //   const event = await Event.findById(req.params.id).populate('venue artists');
    const event = await getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    // Event must be saved/published before this button is available
    if (!event.posterUrl && !event.videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Event has no poster/video. Run AI Generate first to upload media to S3.',
      });
    }

    const { caption } = await igPublish.previewCaption(event);

    return res.json({
      success: true,
      caption,
      videoUrl: event.videoUrl ?? event.posterUrl,  // what will be published
    });

  } catch (err) {
    next(err);
  }
});

// ── POST /api/events/:id/publish-instagram ────────────────────────────────────
// Called when admin clicks "Publish" inside the modal.
// Body: { caption: string, publishPost: bool, publishStory: bool }
router.post('/:id/publish-instagram', requireAdmin, async (req, res, next) => {
  try {
    const { caption, publishPost = true, publishStory = true } = req.body;

    if (!caption?.trim()) {
      return res.status(400).json({ success: false, error: 'Caption is required.' });
    }

    // ── Fetch event from your DB ──────────────────────────────────────────────
    // Replace with your actual query:
    //   const event = await Event.findById(req.params.id);
    const event = await getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    // Use the S3 video URL from the event — set during AI generate flow
    const videoUrl = event.videoUrl ?? event.posterUrl;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'No S3 video URL found on event. Run AI Generate first.',
      });
    }

    console.log(`[ig-publish] Publishing event "${event.title}" (${req.params.id})`);

    const result = await igPublish.publish({
      videoUrl,
      caption: caption.trim(),
      publishPost,
      publishStory,
    });

    // ── Optionally save publish status back to the DB ─────────────────────────
    // await Event.findByIdAndUpdate(req.params.id, {
    //   instagramPublished: true,
    //   instagramPostUrl:   result.post?.permalink,
    //   instagramPublishedAt: new Date(),
    // });

    return res.json({
      success: true,
      message: buildSuccessMessage(result),
      post:    result.post  ?? null,
      story:   result.story ?? null,
      errors:  result.errors.length ? result.errors : undefined,
    });

  } catch (err) {
    next(err);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSuccessMessage({ post, story, errors }) {
  const parts = [];
  if (post)  parts.push('Reel published ✓');
  if (story) parts.push('Story published ✓');
  if (errors?.length) parts.push(`(${errors.length} partial error)`);
  return parts.join(' · ');
}

/**
 * REPLACE THIS with your actual DB lookup.
 * Example for Mongoose:
 *   return Event.findById(id).populate('venue').populate('artists').lean();
 */
async function getEventById(id) {
  throw new Error(
    'getEventById() is a placeholder — replace with your actual DB query in instagram-publish.routes.js'
  );
}

module.exports = router;
