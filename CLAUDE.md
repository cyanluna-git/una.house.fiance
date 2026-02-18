# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**unahouse.finance** is a personal asset management web service that consolidates credit card statements from 7 Korean banks into a unified SQLite database for financial tracking and analysis.

### Key Characteristics
- Single-user local application (no authentication required)
- Handles complex Korean bank statement formats (XLSX, HTML-disguised XLS, real OLE XLS)
- Automatic merchant-to-category classification
- RESTful API for transaction management
- Responsive web UI built with Next.js 15 + Tailwind CSS

---

## Development Commands

```bash
# Start development server (port 3101)
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint

# Bulk import all Excel files from OneDrive (requires DB initialization)
pnpm import

# Test all 7 card company parsers
pnpm test:parsers

# Database migrations (if needed)
pnpm db:push
pnpm db:generate
```

**Package Manager**: pnpm (not npm). Use `pnpm add <pkg>` to install new dependencies.

---

## Architecture Overview

### File Format Parsing Challenge
The 7 card companies use different and evolving statement formats:

| Card Company | Format | Parser Location | Notes |
|---|---|---|---|
| 국민카드, 농협카드 | Real `.xlsx` | `parsers/kookmin.ts`, `parsers/nonghyup.ts` | Standard Excel format |
| 현대카드, 롯데카드, 신한카드 | HTML disguised as `.xls` | `parsers/hyundai.ts`, `parsers/lotte.ts`, `parsers/shinhan.ts` | Requires regex-based HTML table extraction |
| 하나카드, 우리카드 | Real OLE `.xls` | `parsers/hana.ts`, `parsers/woori.ts` | Legacy binary Excel format |

**Key Insight**: All parsers normalize to common `ParsedTransaction` interface in `src/lib/parsers/types.ts`. The unified parser (`parsers/index.ts`) auto-detects card company by filename and routes to correct parser.

### Data Flow
1. **File Upload** → `POST /api/import` (multipart form data)
2. **Parsing** → `parseFile()` in `src/lib/parsers/index.ts`
3. **Categorization** → `categorizeMerchant()` in `src/lib/categorizer.ts` (merchant-name keyword matching)
4. **Storage** → Insert into SQLite via Drizzle ORM
5. **Display** → Client-side fetch and pagination in React pages

### Database Schema
- **transactions** table: Core transaction record with unified fields (date, cardCompany, merchant, amount, category, etc.)
- **categoryRules** table: Keyword rules for automatic categorization
- Both tables auto-created via `sqlite.exec(CREATE TABLE IF NOT EXISTS ...)` in `src/lib/db/index.ts`

---

## Key Technical Decisions

### Why Drizzle + SQLite?
- Lightweight: single-file database (finance.db) for personal use
- Type-safe: Drizzle provides TypeScript-first ORM
- Zero dependencies: better-sqlite3 is bundled (no separate server)

### Client-Side Pages Over Server Components
All pages (`page.tsx`) use `'use client'` directive because:
- They fetch data from API routes (not during build-time)
- Database operations must happen at request-time, not build-time
- Allows dynamic filtering/pagination without pre-rendering

### Parser Robustness vs. Fragility
HTML parsing uses regex instead of a DOM parser to:
- Reduce bundle size (no jsdom dependency)
- Avoid native module compilation issues
- Trade-off: sensitive to HTML structure changes (noted in Gemini review)

---

## Common Development Tasks

### Adding Support for a New Card Company
1. Create `src/lib/parsers/cardname.ts` with function signature:
   ```typescript
   export function parseCardnameCard(buffer: Buffer): ParsedTransaction[]
   ```
2. Add case to switch statement in `src/lib/parsers/index.ts`
3. Update `detectCardCompany()` to recognize filename pattern
4. Add test files to explore format (not stored in repo - keep raw data private)

### Adding a New Category Rule
Edit `src/lib/db/seed-rules.ts`:
```typescript
{ keyword: "exact_merchant_substring", category: "카테고리명", priority: 10 }
```
Higher priority rules match first. Rules are applied at import-time via `categorizeMerchant()`.

### Handling Duplicate Data
**Current Status**: Duplicate prevention is NOT yet implemented (Gemini review item).
**Implementation needed**:
- Add `UNIQUE(date, merchant, amount, cardCompany)` constraint to transactions table
- OR implement pre-import duplicate check in `POST /api/import`

### Performance Optimization
**Known Issues** (from Gemini review):
1. `GET /api/transactions` uses `all()` to fetch entire result set for counting → O(n) scan
   - **Fix**: Use `select({ count: count() }).from(transactions)` for COUNT-only queries
2. Dashboard statistics fetch up to 1000 items in memory → loses older data
   - **Fix**: Move aggregation to database: `select({ month, total: sum(amount) }).from(transactions).groupBy(month)`

---

## Database Initialization

Tables are auto-created via `CREATE TABLE IF NOT EXISTS` in `src/lib/db/index.ts` when the DB module is first imported.

If you need to reset:
```bash
rm finance.db  # Delete file
pnpm dev    # Restart - new empty DB will be created
```

---

## Known Limitations & Future Work

### Phase 2 (Performance & Data Integrity)
- [ ] Prevent duplicate imports via unique constraints
- [ ] Optimize pagination with COUNT queries
- [ ] Aggregate monthly statistics in database

### Phase 3 (UX & Features)
- [ ] Extract UI code into reusable components (`src/components/`)
- [ ] Advanced analytics (category trends, budget alerts)
- [ ] Import history and conflict resolution

### Future (If Web Deployment)
- [ ] Add authentication (NextAuth or similar)
- [ ] File upload size limits and validation
- [ ] Rate limiting on API routes

---

## File Locations Quick Reference

```
Core Logic
  src/lib/parsers/           # All 7 card company parsers + unified entry point
  src/lib/db/schema.ts       # Drizzle table definitions
  src/lib/categorizer.ts     # Merchant → category mapping

API Layer
  src/app/api/import/        # File upload & parsing endpoint
  src/app/api/transactions/  # CRUD endpoints for transactions

UI Layer
  src/app/page.tsx           # Dashboard (monthly/card-wise summaries)
  src/app/import/page.tsx    # File upload UI
  src/app/transactions/page.tsx  # Transaction list & filters
  src/app/manual/page.tsx    # Manual entry form (salary, insurance, etc.)

Configuration
  next.config.ts             # Next.js settings
  tsconfig.json              # TypeScript strict mode enabled
  package.json               # Dev server runs on port 3101 (-p flag)
```

---

## Testing Strategy

No automated tests currently exist. For manual testing:

1. **Parser Testing**: Test each parser by uploading one statement file via `/import` page
2. **API Testing**: Use browser dev tools or curl to test endpoints
3. **Integration**: Verify end-to-end flow from file upload → data display

---

## Port Configuration

Development server runs on **port 3101** (set in `package.json` dev script).
Change with: `pnpm dev -p 3102`

---

## Notes for Future Developers

- Keep raw Excel files in OneDrive only (not in repo) - use `.gitignore` rule
- Drizzle config backup exists as `drizzle.config.ts.bak` due to build issues - don't delete
- All parser date formats are normalized to `YYYY-MM-DD` internally
- Amount values are stored as integers (in Korean Won) - no decimal places
- Category auto-classification happens at import-time; user can edit afterward
