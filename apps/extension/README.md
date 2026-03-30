# Glossarly Chrome Extension

AI-powered glossary that explains business jargon as you read.

## Phase 1: PoC Shell

This is a proof-of-concept implementation focusing on:
- Core term detection pipeline
- Basic sidebar UI
- Content script highlighting
- Service worker message routing

## Architecture

### Content Script (`src/content/`)
- **TermExtractor**: Detects jargon using multiple rules (acronyms, patterns, seed list)
- **DOMScanner**: Safely extracts visible text from the page
- **TermHighlighter**: Wraps detected terms with interactive highlights

### Background (`src/background/`)
- **ServiceWorker**: Handles extension lifecycle and message routing
- **MessageHandler**: Routes messages to API and handlers

### API (`src/api/`)
- **GlossarlyApiClient**: Type-safe API client for backend communication

### Storage (`src/storage/`)
- **LocalTermCache**: IndexedDB-backed cache for term definitions

### UI (`src/sidebar/`)
- **SidebarApp**: Main React component
- **TermPanel**: Term list with confidence indicators
- **DefinitionCard**: Definition display with examples

## Detection Rules

### 1. Acronyms (Confidence: 90%)
Detects 2-6 uppercase letter sequences (e.g., ROI, KPI, CAC, BANT)

### 2. Camel/Pascal Case (Confidence: 85%)
Detects business compounds (e.g., SaaS, PaaS)

### 3. Patterns (Confidence: 80%)
Detects words ending in -ification, -ization, and B2B/B2C style terms

### 4. Seed List (Confidence: 70%)
~50 hardcoded common business terms: pipeline, stakeholder, synergy, bandwidth, leverage, etc.

## Development

```bash
# Install dependencies
npm install

# Build for development
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Configuration

Create a `.env` file:

```
GLOSSARLY_API_URL=http://localhost:3000/api
```

### Loading the Extension

1. Go to `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the `dist/` directory

## File Structure

```
src/
├── content/           # Content script entry point
│   ├── term-extraction.ts
│   ├── dom-scanner.ts
│   ├── term-highlighter.ts
│   ├── content-script.ts
│   └── content-styles.css
├── background/        # Service worker
│   ├── service-worker.ts
│   └── message-handler.ts
├── api/               # API client
│   └── client.ts
├── storage/           # Local caching
│   └── cache.ts
└── sidebar/           # React UI
    ├── components/
    │   ├── TermPanel.tsx
    │   └── DefinitionCard.tsx
    ├── sidebar-app.tsx
    ├── sidebar-entry.tsx
    ├── sidebar-index.html
    └── styles/
        └── globals.css
public/
├── manifest.json
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Message Protocol

### Content Script → Service Worker
```typescript
{
  type: 'ENRICH_TERM',
  payload: { term: string, context: string }
}
```

### Service Worker → Content Script
```typescript
{
  type: 'ENRICHMENT_RESULT',
  payload: TermDefinition_Response
}
```

## Phase 2 (Future)

- Full-text glossary management
- Term saving and custom definitions
- Multi-tab sync
- Search across glossary
- Export/import functionality
- Advanced filtering and categorization
