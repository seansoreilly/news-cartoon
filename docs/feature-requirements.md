# News Cartoon Feature Requirements

## Document Information
- **Version**: 1.0
- **Date**: 2025-01-25
- **Project**: News Cartoon (newscartoon.lol)

---

## 1. Watermark Integration

### Overview
Add "newscartoon.lol" watermark to all generated cartoon images for brand attribution.

### Current State
- Watermark utility exists at `src/utils/imageUtils.ts` with `addWatermark()` function
- Function accepts base64 image and optional text (defaults to "newscartoon.lol")
- Places watermark in bottom-right corner with outline for visibility
- **NOT currently integrated** into the image generation pipeline

### Requirements

#### 1.1 Automatic Watermarking
- **REQ-WM-001**: Apply watermark automatically after image generation in `ImageGenerator.tsx`
- **REQ-WM-002**: Watermark must persist through download and gallery upload
- **REQ-WM-003**: Watermark text: "newscartoon.lol" (default, already configured)

#### 1.2 Watermark Styling
- **REQ-WM-004**: Position: Bottom-right corner with 2% padding
- **REQ-WM-005**: Font size: Responsive (width/30, minimum 16px)
- **REQ-WM-006**: Style: White fill with dark stroke for visibility on any background

#### 1.3 Integration Points
- Apply watermark in `ImageGenerator.handleGenerateImage()` after receiving base64 from Gemini
- Store watermarked version in state and use for display/download/gallery

### Technical Notes
- Existing function uses Canvas API for client-side processing
- No server-side changes required
- Memory consideration: Creates temporary canvas element

---

## 2. Public Gallery

### Overview
Publicly accessible gallery showing all published cartoons with metadata.

### Current State
- Basic gallery page exists at `src/pages/GalleryPage.tsx`
- Supabase integration configured (`supabaseClient.ts`)
- Gallery service exists at `src/services/galleryService.ts`
- Storage bucket: `news-cartoon-images`
- Database table: `news_cartoon_gallery`

### Requirements

#### 2.1 Gallery Display
- **REQ-GAL-001**: Grid layout (responsive: 1/2/3 columns)
- **REQ-GAL-002**: Display cartoon title, creation date, news source link
- **REQ-GAL-003**: Lazy loading for images
- **REQ-GAL-004**: Pagination or infinite scroll (limit 50 items per load)

#### 2.2 Gallery Item Details
- **REQ-GAL-005**: Click to expand/view full-size image
- **REQ-GAL-006**: Show metadata: title, date, original news source
- **REQ-GAL-007**: Share buttons visible on detail view

#### 2.3 Publishing Workflow
- **REQ-GAL-008**: "Publish to Gallery" button on generated cartoon
- **REQ-GAL-009**: User confirmation before publishing
- **REQ-GAL-010**: Success/error feedback after publish attempt
- **REQ-GAL-011**: Prevent duplicate uploads of same cartoon

#### 2.4 Database Schema
Current schema in `GalleryItem` type:
```typescript
interface GalleryItem {
  id: string;
  created_at: string;
  title: string;
  image_path: string;
  news_url?: string;      // Original article URL
  news_source?: string;   // Source name (e.g., "Reuters")
  public_url?: string;    // Computed storage URL
}
```

#### 2.5 New Fields Required
- **REQ-GAL-012**: Add `share_count` (integer, default 0) - track social shares
- **REQ-GAL-013**: Add `view_count` (integer, default 0) - track gallery views

### Technical Notes
- Uses Supabase Storage for images, Postgres for metadata
- Public bucket access required for gallery display
- Consider CDN caching for frequently accessed images

---

## 3. Social Sharing

### Overview
Enable sharing cartoons to social media platforms with original news article attribution.

### Requirements

#### 3.1 Share Platforms
- **REQ-SHARE-001**: Twitter/X sharing
- **REQ-SHARE-002**: Facebook sharing
- **REQ-SHARE-003**: LinkedIn sharing
- **REQ-SHARE-004**: Copy link to clipboard

#### 3.2 Share Content
- **REQ-SHARE-005**: Share message template:
  ```
  Check out this cartoon about "{title}"

  Original news: {news_url}

  Created at newscartoon.lol
  ```
- **REQ-SHARE-006**: Include direct link to gallery item (if published)
- **REQ-SHARE-007**: Include original news article URL in share

#### 3.3 Share Button Placement
- **REQ-SHARE-008**: Share buttons on `ImageGenerator` component after generation
- **REQ-SHARE-009**: Share buttons on gallery item detail view
- **REQ-SHARE-010**: Share button on downloaded image (via clipboard option)

#### 3.4 Open Graph / Meta Tags
- **REQ-SHARE-011**: Gallery item pages must have proper OG tags:
  - `og:title`: Cartoon title
  - `og:image`: Cartoon image URL
  - `og:description`: "Editorial cartoon generated from news"
  - `og:url`: Gallery item permalink

#### 3.5 Analytics (Optional)
- **REQ-SHARE-012**: Track share count per platform
- **REQ-SHARE-013**: Update `share_count` in database on share action

### Technical Implementation

#### Share URL Formats
```javascript
// Twitter/X
`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

// Facebook
`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`

// LinkedIn
`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
```

### Dependencies
- No external libraries required (native share APIs + URL schemes)
- Web Share API for mobile devices (optional enhancement)

---

## 4. Weather Source Filtering

### Overview
Filter out weather-related news sources from search results to focus on substantive news.

### Current State
- News fetched via Google News RSS in `dev-server.js`
- No source filtering currently implemented
- Articles parsed with source name extracted from title

### Requirements

#### 4.1 Source Blocklist
- **REQ-WEATHER-001**: Maintain blocklist of weather-related source names
- **REQ-WEATHER-002**: Filter applied server-side in `dev-server.js`
- **REQ-WEATHER-003**: Filter applied before authority ranking

#### 4.2 Blocked Sources (Initial List)
```javascript
const WEATHER_SOURCES = [
  'Weather.com',
  'The Weather Channel',
  'AccuWeather',
  'Weather Underground',
  'National Weather Service',
  'WeatherBug',
  'Weather Network',
  'Wunderground'
];
```

#### 4.3 Keyword Filtering
- **REQ-WEATHER-004**: Also filter articles with weather-centric titles:
  - Contains "weather forecast"
  - Contains "temperature alert"
  - Contains "storm warning" (unless major disaster news)
- **REQ-WEATHER-005**: Case-insensitive matching

#### 4.4 Configuration
- **REQ-WEATHER-006**: Blocklist configurable via environment variable (optional)
- **REQ-WEATHER-007**: Logging when articles are filtered (debug mode)

### Technical Implementation

Location: `dev-server.js` in `parseGoogleNewsRss()` function

```javascript
const filterWeatherSources = (articles) => {
  return articles.filter(article => {
    const sourceLower = article.source.name.toLowerCase();
    const titleLower = article.title.toLowerCase();

    // Check source blocklist
    const isBlockedSource = WEATHER_SOURCES.some(s =>
      sourceLower.includes(s.toLowerCase())
    );

    // Check title keywords
    const hasWeatherKeywords =
      titleLower.includes('weather forecast') ||
      titleLower.includes('temperature alert');

    return !isBlockedSource && !hasWeatherKeywords;
  });
};
```

---

## 5. Payment/Donation Link

### Overview
Add payment/donation functionality to support project development costs (API usage, hosting).

### Requirements

#### 5.1 Payment Provider Options
Evaluate and select ONE:
- **Option A**: Ko-fi (simple tip jar, no account required for donors)
- **Option B**: Buy Me a Coffee (similar to Ko-fi)
- **Option C**: Stripe Payment Links (one-time payments)
- **Option D**: PayPal.me link

**Recommendation**: Ko-fi or Buy Me a Coffee for simplicity

#### 5.2 UI Integration
- **REQ-PAY-001**: "Support Us" button in header/navigation
- **REQ-PAY-002**: Donation prompt on successful cartoon generation (non-intrusive)
- **REQ-PAY-003**: Dedicated support page with payment options
- **REQ-PAY-004**: Footer link to donation page

#### 5.3 Payment Link Display
- **REQ-PAY-005**: Subtle CTA after image generation:
  ```
  "Enjoying News Cartoon? Support the project!"
  [Buy me a coffee] button
  ```
- **REQ-PAY-006**: Do NOT block functionality for non-payers
- **REQ-PAY-007**: Show donation option max once per session

#### 5.4 Support Page Content
- **REQ-PAY-008**: Explain what donations support:
  - Gemini API costs
  - Hosting/infrastructure
  - Future development
- **REQ-PAY-009**: Multiple donation tiers (if using Ko-fi/BMC):
  - $3 - Coffee
  - $5 - Lunch
  - $10 - Dinner

#### 5.5 Configuration
- **REQ-PAY-010**: Payment URL stored in environment variable:
  ```
  VITE_DONATION_URL=https://ko-fi.com/newscartoon
  ```
- **REQ-PAY-011**: Feature flag to enable/disable donation prompts

### Technical Notes
- External redirect only (no payment processing in-app)
- No user accounts required
- GDPR compliant (no tracking of payment status)

---

## Implementation Priority

| Priority | Feature | Effort | Dependencies |
|----------|---------|--------|--------------|
| 1 | Weather Source Filtering | Low | None |
| 2 | Watermark Integration | Low | imageUtils.ts (exists) |
| 3 | Payment Link | Low | External account setup |
| 4 | Social Sharing | Medium | Gallery publish flow |
| 5 | Public Gallery Enhancements | Medium | Supabase schema update |

---

## Technical Dependencies

### Existing Infrastructure
- Supabase (Storage + Database) - configured
- Express backend (dev-server.js) - running
- React + TypeScript frontend - active

### New Dependencies Required
- None for MVP (using native browser APIs)

### Environment Variables (New)
```bash
# Payment/Donation
VITE_DONATION_URL=https://ko-fi.com/newscartoon

# Optional feature flags
VITE_ENABLE_DONATION_PROMPT=true
VITE_ENABLE_WEATHER_FILTER=true
```

---

## Success Metrics

1. **Watermark**: 100% of generated/downloaded images include watermark
2. **Gallery**: X published cartoons within first month
3. **Sharing**: Track shares per platform
4. **Weather Filter**: Reduction in weather-related articles in results
5. **Donations**: Track click-through rate on donation links

---

## Open Questions

1. Should watermark be optional (user preference)?
2. Gallery moderation - any content review before publishing?
3. Rate limiting for gallery uploads per user/session?
4. Should share analytics require user consent?

---

## Appendix: File Locations

| Feature | Primary Files |
|---------|---------------|
| Watermark | `src/utils/imageUtils.ts`, `src/components/cartoon/ImageGenerator.tsx` |
| Gallery | `src/pages/GalleryPage.tsx`, `src/services/galleryService.ts` |
| Sharing | New: `src/components/share/ShareButtons.tsx` |
| Weather Filter | `dev-server.js` |
| Payment | New: `src/components/common/DonationPrompt.tsx`, `src/pages/SupportPage.tsx` |
