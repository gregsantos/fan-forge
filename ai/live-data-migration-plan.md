## Data Migration Report & Plan

### 1. Executive Summary

The current application relies on mock data files (`lib/mock-data.ts`) that are structurally different from the normalized database schema (`db/schema.ts`). The mock data often presents a denormalized and simplified view (e.g., a campaign object containing a list of assets and a nested brand object), while the database uses relational IDs (`brandId`, `ipKitId`).

The migration process will involve creating new server-side data access services, updating API routes, and refactoring page components to use these new services. The primary goal is to adapt the application to the relational data model without disrupting the user interface or existing features.

### 2. Inconsistency Analysis

My review of `lib/mock-data.ts`, `db/schema.ts`, `types/index.ts`, and `drizzle/seed.ts` revealed several key discrepancies:

#### **Campaign Data (`mockCampaigns` vs. `campaigns` table)**

- **Nested Objects:** `mockCampaigns` uses a `CampaignWithAssets` type which includes a nested `brand: Brand` object and an `assets: Asset[]` array. The `campaigns` table only contains a `brandId` and `ipKitId`. Real data fetching will require database joins.
- **Submission Count:** `mockCampaigns` includes a `submissionCount`. The `campaigns` table lacks this field. This value must be calculated dynamically by counting related entries in the `submissions` table.
- **Featured Status:** `mockCampaigns` has a `featured: boolean` flag. The schema uses `featuredUntil: timestamp`. The application logic will need to interpret the timestamp to derive a "featured" status (i.e., `featuredUntil > new Date()`).

#### **IP Kit Data (Component expectation vs. `ipKits` table)**

- **Asset Count:** The `EditCampaignPage` expects IP Kit data to have an `assetCount`. The `ipKits` table does not have this field. It must be calculated dynamically by counting related assets.

#### **Submission Data (`mockSubmissions` vs. `submissions` table)**

- The `mockSubmissions` is a simplified subset of the `submissions` table, missing fields like `reviewedBy`, `reviewedAt`, `rating`, `thumbnailUrl`, and `canvasData`. This is less of an issue but components will need to handle potentially `null` or `undefined` values for these new fields.

#### **Seed Script (`drizzle/seed.ts`)**

- The seed script is well-aligned with the `db/schema.ts` and provides a solid foundation for development with real data. No major inconsistencies were found here.

### 3. Proposed Implementation Plan

I will execute this plan in phases to ensure a controlled and safe migration. I will not modify any code until you approve this plan.

#### **Phase 1: Create Data Access Services**

I will create a new file, `lib/services/campaigns.ts`, to encapsulate all campaign-related database queries. This keeps data logic separate from the UI. The functions will be server-side only.

- `getCampaigns(includeUnpublished: boolean = false)`: Fetches a list of campaigns. It will join `brands` and calculate `submissionCount`.
- `getCampaignById(id: string)`: Fetches a single campaign, joining the `brand`, `ipKit`, and `assets` (via the IP Kit). It will also calculate `submissionCount`.
- `getIpKitsWithAssetCount()`: Fetches all IP Kits and dynamically calculates the `assetCount` for each.
- `getSubmissionsForCampaign(campaignId: string)`: Fetches submissions for a given campaign, joining creator data.

#### **Phase 2: Update API Routes**

The existing API routes used by client components (like the edit page) need to be updated to use the new data services instead of returning mock data.

- `app/api/campaigns/[id]/route.ts`: Refactor `PUT` handler to use a new `updateCampaign` service function.
- `app/api/ip-kits/route.ts`: Refactor `GET` handler to use the new `getIpKitsWithAssetCount` service function.

#### **Phase 3: Refactor Page Components**

I will now refactor the pages you listed to use server-side data fetching. This will involve making the page components `async` and calling the new service functions from Phase 1 directly.

1.  **`app/(brand)/campaigns/[id]/edit/page.tsx`**: This page uses `useState` and `useEffect` to fetch data on the client. I will refactor it to fetch initial data on the server. The `handleSave` and `handleStatusChange` will continue to use the updated API routes.
2.  **`app/(brand)/campaigns/page.tsx`**: I will replace the `mockCampaigns` import with a server-side call to `getCampaigns()`.
3.  **`app/(brand)/campaigns/[id]/page.tsx`**: I will replace the `mockCampaigns` import with a server-side call to `getCampaignById(params.id)`.
4.  **`app/(creator)/discover/[id]/page.tsx`**: Similar to the above, this will use `getCampaignById(params.id)`.
5.  **`app/(brand)/dashboard/page.tsx`**: This page uses both `mockCampaigns` and `mockSubmissions`. I will replace these with calls to `getCampaigns()` and a new `getRecentSubmissions()` service function.
6.  **`app/(brand)/submissions/page.tsx`**: I will replace the mock data import with calls to fetch campaigns and their associated submissions.

#### **Phase 4: Cleanup**

After confirming all pages and components are successfully migrated and using the live database, I will delete the `lib/mock-data.ts` file to complete the process.

---

## 4. Migration Assessment & Updated Recommendations

After reviewing the current codebase, I've identified several important updates to the migration plan:

### **Current State Analysis**

**✅ Already Migrated:**
- **Campaign Listing API** (`/api/campaigns`) - Fully integrated with database using Drizzle ORM joins and proper relational queries
- **Campaign Detail API** (`/api/campaigns/[id]`) - Complete database integration with brand, IP kit, and asset relations
- **Campaign Update API** (`/api/campaigns/[id]` PUT) - Full CRUD operations with validation and status transitions

**⚠️  Partially Migrated:**
- **IP Kits API** (`/api/ip-kits`) - Has database schema and imports but still serving mock data (commented out DB queries)
- **Submissions API** - Database schema exists but implementation pending

**❌ Still Using Mock Data:**
- All page components (campaigns page, dashboard, campaign details, etc.) are client-side and importing from `lib/mock-data.ts`
- These need to be converted to server components or use the existing API routes

### **Key Findings & Recommendations**

1. **Database Infrastructure is Ready**: Schema, relations, and seed data are properly configured and comprehensive
2. **API Layer is 70% Complete**: Core campaign operations are already using real database queries
3. **Main Issue**: Page components are bypassing the API layer and importing mock data directly
4. **Missing Piece**: Submission count calculations and featured status derivation need to be added to existing queries

### **Revised Implementation Plan**

#### **Phase 1: Complete API Layer Migration (Simplified)**

Since most campaign APIs are already database-integrated, we only need to:

- **Fix IP Kits API**: Uncomment and activate the database queries that are already written
- **Add Missing Calculations**: Update campaign queries to include submission counts and proper featured status
- **Submissions API**: Implement the remaining submission endpoints using the existing patterns

#### **Phase 2: Component Migration Strategy**

Instead of creating separate service files, we should:

- **Convert client components to server components** where appropriate
- **Use existing API routes** via server-side fetch calls for client components that need to stay client-side
- **Remove direct mock data imports** and replace with API calls

#### **Phase 3: Enhanced Query Optimizations**

The existing campaign API (`/api/campaigns/route.ts`) has TODO comments for:
- Submission count calculation
- Thumbnail URL generation
- These need to be implemented in the existing queries

### **Critical Discovery**

The current `/api/campaigns/route.ts` already has:
- Advanced filtering (search, status, featured, deadline)
- Proper pagination
- Database joins with brands and IP kits
- Asset count calculations
- Professional error handling and validation

This means our migration is much simpler than originally planned - we just need to connect the frontend components to these existing, fully-functional APIs.

---

This updated plan prioritizes completing the existing database integration rather than recreating it. The heavy lifting has already been done. Please review this updated assessment and let me know if you approve so I can begin the simplified implementation.
