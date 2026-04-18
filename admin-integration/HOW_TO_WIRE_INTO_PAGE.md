# How to wire PublishToInstagram into events/new/page.js
# (and events/[id]/page.js if you have an edit page)

## Step 1 — Import the component
Add this near the top of page.js with your other imports:

```js
import PublishToInstagram from '@/components/PublishToInstagram';
```

## Step 2 — Track the saved event ID
After a successful handleSubmit, save the returned event ID to state.
Find your handleSubmit function and add the state + capture:

```js
// Add this state near your other useState declarations
const [savedEventId, setSavedEventId] = useState(null);

// Inside handleSubmit, after the API call succeeds:
// e.g. const response = await eventApi.create(payload);
// Add this line:
setSavedEventId(response.data._id ?? response.data.id);
```

## Step 3 — Render the button
Find the section at the bottom of your form where the
"Save as Draft" and "Publish Event" buttons live.
Add the PublishToInstagram button AFTER them, conditionally:

```jsx
{/* Existing buttons */}
<button onClick={() => handleSubmit('draft')}>Save as Draft</button>
<button onClick={() => handleSubmit('published')}>Publish Event</button>

{/* NEW — only visible after event has been saved */}
{savedEventId && (
  <PublishToInstagram eventId={savedEventId} />
)}
```

## Step 4 — Add to .env.local (admin)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```
(Adjust port to wherever your ravist-v1 backend runs)

## That's it.
The flow is:
  Admin fills form → saves event → savedEventId is set
  → "Publish to Instagram" button appears
  → Admin clicks it → modal opens → caption pre-filled
  → Admin edits caption → clicks "Publish Now"
  → Reel + Story published → success screen with link to Reel
