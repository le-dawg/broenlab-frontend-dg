# User Feedback Feature Documentation

## Overview
This document describes the user feedback feature implementation that allows users to rate bot responses using thumbs up/down emojis.

## User Story
**AS a** user  
**I WANT TO** give feedback on response quality by clicking on a thumbs up or down emoji  
**SO THAT** I can indicate whether the bot's response was helpful or not

## Acceptance Criteria
- ✅ Emojis (👍/👎) appear below each bot message
- ✅ Emojis are initially greyed out
- ✅ Clicking an emoji makes it colored (active)
- ✅ User can switch between thumbs up and down as often as desired
- ✅ Each message maintains independent feedback state
- ✅ Feedback is sent to the specified webhook endpoint

## Technical Implementation

### Frontend (chat.html)
All changes are contained in a single file: `chat.html`

#### CSS Styling
```css
/* Feedback emojis */
.broen-feedback { 
  display: flex; 
  gap: 0.5rem; 
  margin-top: 0.5rem; 
  padding-top: 0.5rem; 
}

.broen-feedback__btn { 
  border: none; 
  background: transparent; 
  cursor: pointer; 
  font-size: 1.25rem; 
  padding: 0.25rem 0.5rem; 
  border-radius: 6px; 
  transition: all 0.2s ease; 
  opacity: 0.3;                    /* Greyed out initially */
  filter: grayscale(100%);          /* Greyed out initially */
}

.broen-feedback__btn.active { 
  opacity: 1;                       /* Full color when active */
  filter: grayscale(0%);            /* Full color when active */
  transform: scale(1.05); 
}
```

#### JavaScript Functions

**loadConfig()**
- Fetches configuration from `/api/config` server endpoint
- Loads feedback webhook URL into `feedbackWebhookUrl` variable
- Called on page load to initialize configuration
- Logs warnings if configuration cannot be loaded

**buildFeedbackUI(messageEl)**
- Creates the feedback UI elements (two emoji buttons)
- Attaches click event handlers
- Restores previous feedback state if exists
- Returns the feedback container element

**handleFeedbackClick(messageId, rating, thumbsUp, thumbsDown)**
- Manages the toggle logic
- Updates button active states
- Stores feedback in the messageFeedback Map
- Calls sendFeedback() to submit to webhook

**sendFeedback(rating)**
- Sends POST request to the webhook URL loaded from server config
- Payload: `{ "rating": 0 | 1 }`
- Checks if webhook URL is configured before attempting to send
- Logs errors to console without blocking UI

**generateMessageId(messageEl)**
- Creates unique, stable IDs for each message
- Uses timestamp + random string
- Stores ID in data attribute for persistence

### Backend / Webhook Integration

**Environment Variable**: `N8N_FEEDBACK_WEBHOOK_URL`

**Example Value**: `https://n8n-ldlsb-u47163.vm.elestio.app/webhook/9f23ec09-0e55-43f1-9a4b-11bf1d9f211c`

**Server Endpoint**: `GET /api/config`
- Returns JSON with client configuration
- Response format: `{ "feedbackWebhookUrl": "<url>" }`
- No authentication required (non-sensitive configuration)

**Client Request Format**:
```json
POST <N8N_FEEDBACK_WEBHOOK_URL>
Content-Type: application/json

{
  "rating": 1    // 1 for thumbs up, 0 for thumbs down
}
```

**Notes**:
- Webhook URL is loaded from server on page load via `/api/config`
- Server reads `N8N_FEEDBACK_WEBHOOK_URL` from environment variables
- Direct fetch to external URL (not proxied through Express server)
- Fire-and-forget pattern (doesn't wait for confirmation)

## Visual Design

### Initial State
- Both emojis appear greyed out
- 30% opacity with grayscale filter applied
- Small visual separator (border-top) from main message

### Active State
- Selected emoji becomes fully colored
- 100% opacity with no grayscale filter
- Slight scale effect (1.05x) for emphasis
- Other emoji returns to greyed out state

### Hover State
- Increases opacity to 60%
- Scales up slightly (1.1x)
- Smooth transition animation

### Accessibility
- Proper ARIA labels on buttons
- Keyboard focus visible with outline
- Semantic HTML (button elements)
- Clear visual feedback on interactions

## Code Quality

### Minimal Changes
- Only 156 lines added across 3 files
- No modifications to existing functionality
- No new dependencies required
- Follows existing code style and patterns

### State Management
- Uses JavaScript Map for efficient state tracking
- Per-message feedback tracking
- Handles page refresh gracefully (state resets)
- No localStorage or cookies needed

### Error Handling
- Try-catch blocks around fetch calls
- Console warnings for failed submissions
- UI remains functional even if webhook fails
- No user-facing error messages (silent failure)

## Testing

### Manual Testing Performed
1. ✅ Emojis appear below bot messages
2. ✅ Initial state is greyed out
3. ✅ Clicking thumbs up makes it colored
4. ✅ Clicking thumbs down switches active state
5. ✅ Can toggle between ratings multiple times
6. ✅ POST request sent with correct payload format
7. ✅ Multiple messages maintain independent states
8. ✅ Hover effects work correctly
9. ✅ Keyboard navigation works

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Relies on standard Web APIs (fetch, Map, classList)
- No polyfills required for target audience

## Future Enhancements (Not Implemented)

Possible future improvements:
- Add visual confirmation after submission
- Store feedback in localStorage to persist across sessions
- Add feedback analytics dashboard
- Support for additional rating options (e.g., star ratings)
- Aggregate feedback display for administrators
- Rate limiting to prevent spam

## Related Files

### Modified Files
1. `chat.html` - Main implementation (CSS + JavaScript + config loading)
2. `server.js` - Added `/api/config` endpoint and `N8N_FEEDBACK_WEBHOOK_URL` env variable
3. `.env.example` - Added `N8N_FEEDBACK_WEBHOOK_URL` configuration example
4. `AGENTS.md` - Developer documentation
5. `README_RENDER.md` - User-facing documentation

### No Changes Required
- `index.html` - Not affected (different page)
- `package.json` - No new dependencies

## Deployment Notes

### Prerequisites
- Server must have `N8N_FEEDBACK_WEBHOOK_URL` environment variable configured

### Configuration
1. Add `N8N_FEEDBACK_WEBHOOK_URL` to your `.env` file or environment variables
2. Example: `N8N_FEEDBACK_WEBHOOK_URL=https://n8n-ldlsb-u47163.vm.elestio.app/webhook/9f23ec09-0e55-43f1-9a4b-11bf1d9f211c`
3. Restart the server to load the new environment variable
4. Client will automatically fetch the URL on page load

### Rollback Plan
If issues arise, revert the single commit:
```bash
git revert 6a805a4
```

## Support

For questions or issues:
1. Check AGENTS.md for implementation details
2. Review console logs for error messages
3. Verify webhook endpoint is accessible
4. Test in browser developer tools

## Changelog

### Version 1.0 (2025-11-15)
- Initial implementation of feedback feature
- Added thumbs up/down emoji buttons
- Integrated with N8N webhook
- Added comprehensive documentation
