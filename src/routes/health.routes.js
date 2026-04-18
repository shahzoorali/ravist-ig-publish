const express = require('express');
const router  = express.Router();

router.get('/', (_req, res) => {
  const hasToken  = !!process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  const hasUserId = !!process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  res.json({
    status:  'ok',
    service: 'ravist-ig-publish',
    port:    process.env.PORT || 3004,
    config: {
      instagram_token:   hasToken  ? 'set ✓' : '⚠️ MISSING — set INSTAGRAM_PAGE_ACCESS_TOKEN',
      instagram_user_id: hasUserId ? 'set ✓' : '⚠️ MISSING — set INSTAGRAM_BUSINESS_ACCOUNT_ID',
    },
    endpoints: {
      publish:         'POST /api/publish',
      preview_caption: 'POST /api/preview-caption',
    },
  });
});

module.exports = router;
