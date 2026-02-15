# B1Church Provider

The B1Church provider implements the `IProvider` interface to expose B1.Church service plans as browsable content. It supports aggregating content from multiple external providers (lessons.church, Proclaim, etc.) via an API proxy.

## Overview

This provider enables consuming applications to:
- Browse B1.Church ministries, plan types, and plans
- Retrieve presentations, instructions, and playlists from plans
- Transparently load content from external providers embedded in plan items
- Expand lesson sections into their full action/file hierarchy

## Provider Configuration

```typescript
readonly id = "b1church";
readonly name = "B1.Church";

readonly capabilities: ProviderCapabilities = {
  browse: true,
  presentations: true,
  playlist: true,
  instructions: true,
  mediaLicensing: false
};

readonly authTypes: AuthType[] = ["oauth_pkce", "device_flow"];
```

## Data Types

### B1PlanItem

Plan items returned from the B1.Church API include provider metadata for external content:

```typescript
export interface B1PlanItem {
  id: string;
  label?: string;
  description?: string;
  seconds?: number;
  itemType?: string;
  relatedId?: string;
  churchId?: string;
  providerId?: string;           // External provider ID (e.g., "lessonschurch")
  providerPath?: string;         // Content path within external provider
  providerContentPath?: string;  // Dot-notation path to specific content (e.g., "0.1.2")
  link?: string;                 // Direct URL for providerFile items
  children?: B1PlanItem[];
}
```

### B1Plan

Plans can have an associated provider content (e.g., a lessons.church venue):

```typescript
export interface B1Plan {
  id: string;
  churchId: string;
  ministryId?: string;
  planTypeId?: string;
  name: string;
  serviceDate: string;
  contentType?: string;
  contentId?: string;          // Venue ID for lessons.church content
  providerId?: string;         // Associated provider ID (e.g., "lessonschurch")
  providerPlanId?: string;     // Content path for associated lesson
  providerPlanName?: string;   // Display name of associated lesson
}
```

When a plan has `providerId` and `providerPlanId` set but no planItems, the provider will automatically fetch content from the associated provider.

## Browse Hierarchy

```
/ministries
    └── /ministries/{ministryId}
            └── /ministries/{ministryId}/{planTypeId}
                    └── /ministries/{ministryId}/{planTypeId}/{planId}  [isLeaf: true]
```

| Depth | Path Pattern | Returns |
|-------|--------------|---------|
| 0 | `/` | Root "Ministries" folder |
| 1 | `/ministries` | List of ministry folders |
| 2 | `/ministries/{ministryId}` | Plan types for ministry |
| 3 | `/ministries/{ministryId}/{planTypeId}` | Plans (leaf items) |

## Content Retrieval Architecture

### Item Types

B1Church plans can contain several types of items:

| Item Type | Description | Data Source |
|-----------|-------------|-------------|
| `header` | Section header (groups children) | B1 API |
| `section` / `lessonSection` | Lesson section (contains actions) | Lessons.church venue |
| `action` / `lessonAction` | Playable action (contains files) | Lessons.church venue |
| `addon` / `lessonAddOn` | Add-on content | Lessons.church venue |
| `providerFile` | Direct file with URL | `link` field |
| `arrangementKey` | Song/worship item | Content API |
| External provider items | Content from other providers | Provider Proxy |

### Determining External Provider Items

An item is considered "external" when:
1. It has a `providerId` that is NOT "b1church"
2. AND it has a `providerPath` set

```typescript
function isExternalProviderItem(item: B1PlanItem): boolean {
  if (!item.providerId || item.providerId === "b1church") return false;
  if (item.providerPath) return true;
  const itemType = item.itemType || "";
  return itemType.startsWith("provider");
}
```

## Instruction Expansion

The most complex part of this provider is expanding instructions to show the full hierarchy of sections → actions → files.

### Data Flow for getInstructions()

```
getInstructions(path, authData)
    │
    ├─► Parse path to get ministryId, planTypeId, planId
    │
    ├─► Fetch plan details (includes churchId, venueId)
    │   GET /doing/plans/types/{planTypeId}
    │
    ├─► Fetch plan items from B1 API
    │   GET /doing/planFeed/presenter/{churchId}/{planId}
    │
    ├─► If plan has no items but has providerId/providerPlanId:
    │   └─► Fetch from external provider via proxy and return
    │
    ├─► If venueId exists, fetch venue data from lessons.church:
    │   │
    │   ├─► GET /venues/public/planItems/{venueId}
    │   │   Returns: { venueName, items: [...] }
    │   │
    │   └─► GET /venues/public/actions/{venueId}
    │       Returns: { sections: [{ id, actions: [...] }] }
    │
    ├─► Build sectionActionsMap:
    │   │
    │   │   Map<sectionId, InstructionItem[]>
    │   │
    │   │   For each section in venueActions:
    │   │     sectionActionsMap.set(section.id, [
    │   │       {
    │   │         id: action.id,
    │   │         itemType: "action",
    │   │         label: action.name,
    │   │         children: [{
    │   │           id: action.id + "-file",
    │   │           itemType: "file",
    │   │           embedUrl: "https://lessons.church/embed/action/{id}"
    │   │         }]
    │   │       },
    │   │       ...
    │   │     ])
    │   │
    │   └─► Also expand venuePlanItems and add to map
    │
    └─► processInstructionItems(planItems, ministryId, authData, sectionActionsMap)
        │
        └─► For each item:
            │
            ├─► Convert to InstructionItem via planItemToInstruction()
            │
            ├─► If isExternalProviderItem(item):
            │   │
            │   └─► Fetch via providerProxy("getInstructions", ...)
            │       │
            │       ├─► If providerContentPath set:
            │       │   └─► Navigate to path, use only those children
            │       │
            │       └─► Otherwise use all items as children
            │
            ├─► Else if item has children:
            │   └─► Recursively process children
            │
            └─► If item is section/lessonSection with relatedId:
                └─► Look up sectionActionsMap.get(relatedId)
                    └─► Set as instructionItem.children
```

### Example Output Structure

```json
{
  "venueName": "Feb 8, 2026 - Genesis 1 11",
  "items": [
    {
      "id": "header-1",
      "itemType": "header",
      "label": "Pregame",
      "children": [
        {
          "id": "file-1",
          "itemType": "providerFile",
          "label": "Alpha and Omega",
          "embedUrl": "https://cdn.example.com/video.mp4"
        }
      ]
    },
    {
      "id": "header-2",
      "itemType": "header",
      "label": "Lesson 1 - Classroom",
      "children": [
        {
          "id": "section-1",
          "itemType": "section",
          "label": "Countdown",
          "relatedId": "U6vbC0G6ZFT",
          "embedUrl": "https://lessons.church/embed/section/U6vbC0G6ZFT",
          "children": [
            {
              "id": "action-1",
              "itemType": "action",
              "label": "Play Countdown",
              "embedUrl": "https://lessons.church/embed/action/abc123",
              "children": [
                {
                  "id": "action-1-file",
                  "itemType": "file",
                  "label": "Play Countdown",
                  "embedUrl": "https://lessons.church/embed/action/abc123"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Playlist Retrieval

### Data Flow for getPlaylist()

```
getPlaylist(path, authData, resolution?)
    │
    ├─► Parse path, fetch plan details
    │
    ├─► Fetch plan items from B1 API
    │
    ├─► If plan has no items but has providerId/providerPlanId:
    │   └─► Fetch from external provider via proxy and return
    │
    ├─► Fetch venueFeed for lesson content
    │   GET /venues/public/feed/{venueId}
    │
    └─► For each section and child item:
        │
        ├─► If isExternalProviderItem(child):
        │   │
        │   ├─► If providerContentPath set:
        │   │   ├─► Fetch getPresentations via proxy
        │   │   ├─► Fetch getInstructions via proxy
        │   │   └─► Find matching presentation, use its files
        │   │
        │   └─► Otherwise:
        │       └─► Fetch getPlaylist via proxy, merge all files
        │
        ├─► Else if itemType === "providerFile":
        │   └─► Create ContentFile from item.link
        │
        └─► Else if section/action/addon:
            └─► getFilesFromVenueFeed(venueFeed, itemType, relatedId)
```

## External Provider Proxy

External provider content is fetched via the B1.Church API proxy endpoint.

### Proxy Endpoint

```
POST /doing/providerProxy/{method}

Body: {
  ministryId: string,
  providerId: string,
  path: string,
  resolution?: number  // Optional, for playlist
}
```

### Supported Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `browse` | `ContentItem[]` | Browse external provider hierarchy |
| `getPresentations` | `Plan` | Get presentations from external content |
| `getPlaylist` | `ContentFile[]` | Get media files for playback |
| `getInstructions` | `Instructions` | Get instruction items with expansion |

### Caching

To avoid duplicate API calls when multiple items reference the same external provider content, results are cached per method call:

```typescript
const externalPlanCache = new Map<string, Plan | null>();
const externalInstructionsCache = new Map<string, Instructions | null>();
const externalPlaylistCache = new Map<string, ContentFile[] | null>();

// Cache key format: `${providerId}:${providerPath}`
```

## Using providerContentPath

When `providerContentPath` is set on a plan item, the provider filters external content to only include specific items. The path uses dot-notation to navigate the instruction tree:

```
"0.1.2" = instructions.items[0].children[1].children[2]
```

This enables a plan to reference a specific action/presentation from an external lesson rather than the entire lesson.

## API Endpoints Used

| Endpoint | Service | Purpose |
|----------|---------|---------|
| `GET /membership/groups/tag/ministry` | B1 API | Fetch ministries |
| `GET /doing/planTypes/ministryId/{id}` | B1 API | Fetch plan types |
| `GET /doing/plans/types/{planTypeId}` | B1 API | Fetch plans |
| `GET /doing/planFeed/presenter/{churchId}/{planId}` | B1 API | Fetch plan items |
| `POST /doing/providerProxy/{method}` | B1 API | Proxy to external providers |
| `GET /venues/public/feed/{venueId}` | Lessons.church | Get venue feed (files) |
| `GET /venues/public/planItems/{venueId}` | Lessons.church | Get venue plan structure |
| `GET /venues/public/actions/{venueId}` | Lessons.church | Get venue actions with files |
| `GET /arrangementKeys/presenter/{churchId}/{id}` | Content API | Get song/arrangement data |

## Authentication

The provider supports two authentication methods:
- **OAuth PKCE**: For web applications
- **Device Flow**: For devices without browser input

Auth tokens are passed to:
- Direct B1.Church API calls via `Authorization: Bearer` header
- Proxy calls (the proxy uses stored credentials for external providers)

## File Structure

```
b1Church/
├── B1ChurchProvider.ts   # Main provider implementation
├── api.ts                # API fetch functions and proxy
├── auth.ts               # OAuth and device flow auth
├── converters.ts         # Type conversion utilities
├── types.ts              # B1-specific type definitions
└── README.md             # This documentation
```

## Key Functions

### api.ts

| Function | Purpose |
|----------|---------|
| `fetchMinistries()` | Get user's ministries |
| `fetchPlanTypes()` | Get plan types for a ministry |
| `fetchPlans()` | Get plans for a plan type |
| `fetchVenueFeed()` | Get venue feed with files |
| `fetchVenuePlanItems()` | Get venue plan item structure |
| `fetchVenueActions()` | Get venue actions with files |
| `fetchArrangementKey()` | Get song/arrangement data |
| `fetchFromProviderProxy()` | Proxy requests to external providers |

### converters.ts

| Function | Purpose |
|----------|---------|
| `planItemToPresentation()` | Convert B1PlanItem to PlanPresentation |
| `planItemToInstruction()` | Convert B1PlanItem to InstructionItem |
| `getFilesFromVenueFeed()` | Extract files for a section/action from venue feed |
| `getFileFromProviderFileItem()` | Create ContentFile from providerFile item |
| `buildSectionActionsMap()` | Build map from section IDs to expanded actions |
| `processVenueInstructionItem()` | Expand venue item with section actions |

### B1ChurchProvider.ts

| Method | Purpose |
|--------|---------|
| `browse()` | Navigate ministry/plan hierarchy |
| `getPresentations()` | Get presentations for a plan |
| `getPlaylist()` | Get media files for playback |
| `getInstructions()` | Get expanded instruction tree |
| `processInstructionItems()` | Recursively process and expand items |
| `findItemByPath()` | Navigate to item using dot-notation path |
| `findPresentationByPath()` | Find presentation by instruction path |
