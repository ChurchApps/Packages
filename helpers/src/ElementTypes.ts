// Canonical contract for website-builder element types. answersJSON has historically been
// untyped; these definitions document the real stored shapes (including string-encoded
// booleans from checkbox handlers) and back server-side validation. Lenient by design:
// additionalProperties is always true and unknown element types pass validation.

export interface ElementAnswersSchema {
  type: "object";
  properties: Record<string, { type: string | string[]; enum?: string[]; description?: string }>;
  additionalProperties: true;
}

export interface ElementTypeDefinition {
  elementType: string;
  label: string;
  category: "layout" | "content" | "media" | "church" | "advanced";
  schemaVersion: 1;
  defaults: Record<string, unknown>;
  answersSchema: ElementAnswersSchema;
  allowsChildren?: boolean;
}

export const ElementTypes: Record<string, ElementTypeDefinition> = {
  row: {
    elementType: "row",
    label: "Row",
    category: "layout",
    schemaVersion: 1,
    defaults: { columns: "6,6" },
    answersSchema: {
      type: "object",
      properties: {
        columns: { type: "string", description: "Comma-separated desktop column widths summing to 12, e.g. \"6,6\" or \"4,4,4\". The API auto-creates/destroys child column elements to match." },
        mobileSizes: { type: ["string", "array"], description: "Comma-separated mobile widths, one per column (e.g. \"12,12\"). The API resets this to an empty native array when its length stops matching columns, so both representations exist in production." },
        mobileOrder: { type: ["string", "array"], description: "Comma-separated mobile display order, one per column (e.g. \"2,1\"). Same string-or-empty-array duality as mobileSizes." }
      },
      additionalProperties: true
    },
    allowsChildren: true
  },
  column: {
    elementType: "column",
    label: "Column",
    category: "layout",
    schemaVersion: 1,
    defaults: { size: 6 },
    answersSchema: {
      type: "object",
      properties: {
        size: { type: ["number", "string"], description: "Desktop grid width 1-12. Written as a native number by the API (ElementController.checkRow); renderer tolerates strings." },
        mobileSize: { type: ["number", "string"], description: "Mobile grid width 1-12, hydrated onto the column by the API from the parent row's mobileSizes." },
        mobileOrder: { type: ["number", "string"], description: "Mobile flex order, hydrated onto the column by the API from the parent row's mobileOrder." }
      },
      additionalProperties: true
    },
    allowsChildren: true
  },
  box: {
    elementType: "box",
    label: "Box",
    category: "layout",
    schemaVersion: 1,
    defaults: { background: "var(--light)", text: "var(--dark)" },
    answersSchema: {
      type: "object",
      properties: {
        rounded: { type: "string", enum: ["true", "false"], description: "Checkbox boolean stored as the string \"true\"/\"false\"." },
        translucent: { type: "string", enum: ["true", "false"], description: "Checkbox boolean stored as the string \"true\"/\"false\"." },
        background: { type: "string", description: "Color hex, CSS var token (var(--light)), or image URL (any value containing \"/\" is treated as a background image)." },
        textColor: { type: "string", description: "Color hex or CSS var token; only var(...) values are applied as CSS color by the renderer." },
        headingColor: { type: "string", description: "CSS var token; mapped to a headings* CSS class by the renderer." },
        linkColor: { type: "string", description: "CSS var token; mapped to a links* CSS class by the renderer." },
        text: { type: "string", description: "Legacy key written by the new-box drop payload; never read by BoxElement. Superseded by textColor." }
      },
      additionalProperties: true
    },
    allowsChildren: true
  },
  carousel: {
    elementType: "carousel",
    label: "Carousel",
    category: "layout",
    schemaVersion: 1,
    defaults: { height: "250", animationOptions: "fade", interval: "4" },
    answersSchema: {
      type: "object",
      properties: {
        height: { type: ["string", "number"], description: "Height in px. HTML number input stores a string; renderer parseInts it (fallback 250)." },
        slides: { type: ["string", "number"], description: "Slide count. Editor stores a string; the API parseInts it and auto-creates/deletes slide child elements to match." },
        animationOptions: { type: "string", enum: ["fade", "slide"] },
        autoplay: { type: "string", enum: ["true", "false"], description: "Checkbox boolean stored as the string \"true\"/\"false\"." },
        interval: { type: ["string", "number"], description: "Seconds between auto-advances. Number input stores a string; renderer parseInts (fallback 4)." },
        slide: { type: "number", description: "Slide index. Present only on the auto-created slide CHILD elements, which the API saves with elementType \"carousel\" and parentId of the real carousel." }
      },
      additionalProperties: true
    },
    allowsChildren: true
  },
  whiteSpace: {
    elementType: "whiteSpace",
    label: "White Space",
    category: "layout",
    schemaVersion: 1,
    defaults: { height: "25" },
    answersSchema: {
      type: "object",
      properties: { height: { type: ["string", "number"], description: "Spacer height in px. Number input stores a string; renderer parseInts (fallback 25)." } },
      additionalProperties: true
    }
  },
  block: {
    elementType: "block",
    label: "Block",
    category: "layout",
    schemaVersion: 1,
    defaults: {},
    answersSchema: {
      type: "object",
      properties: { targetBlockId: { type: "string", description: "Id of the reusable elementBlock to inline. Resolved server-side by TreeHelper." } },
      additionalProperties: true
    }
  },
  text: {
    elementType: "text",
    label: "Text",
    category: "content",
    schemaVersion: 1,
    defaults: { text: "", textAlignment: "left" },
    answersSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "HTML markup produced by the rich-text editor; rendered with dangerouslySetInnerHTML." },
        textAlignment: { type: "string", enum: ["left", "center", "right"] }
      },
      additionalProperties: true
    }
  },
  textWithPhoto: {
    elementType: "textWithPhoto",
    label: "Text with Photo",
    category: "content",
    schemaVersion: 1,
    defaults: { text: "", textAlignment: "left", photoPosition: "left" },
    answersSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "HTML markup from the rich-text editor." },
        textAlignment: { type: "string", enum: ["left", "center", "right"] },
        photo: { type: "string", description: "Image URL selected via the gallery modal." },
        photoAlt: { type: "string" },
        photoPosition: { type: "string", enum: ["left", "right", "top", "bottom"] }
      },
      additionalProperties: true
    }
  },
  card: {
    elementType: "card",
    label: "Card",
    category: "content",
    schemaVersion: 1,
    defaults: { text: "", textAlignment: "left", titleAlignment: "center" },
    answersSchema: {
      type: "object",
      properties: {
        photo: { type: "string", description: "Image URL selected via the gallery modal." },
        photoAlt: { type: "string" },
        url: { type: "string", description: "Optional link applied to both the photo and the title." },
        title: { type: "string" },
        titleAlignment: { type: "string", enum: ["left", "center", "right"], description: "Renderer falls back to \"center\" when unset; defaults match that for consistency with legacy cards." },
        text: { type: "string", description: "HTML markup from the rich-text editor." },
        textAlignment: { type: "string", enum: ["left", "center", "right"] }
      },
      additionalProperties: true
    }
  },
  faq: {
    elementType: "faq",
    label: "Expandable",
    category: "content",
    schemaVersion: 1,
    defaults: { headingType: "h6", title: "", description: "", iconColor: "#03a9f4" },
    answersSchema: {
      type: "object",
      properties: {
        headingType: { type: "string", enum: ["h6", "link"], description: "\"link\" renders the centered-link variant; anything else (including unset) renders the h6 heading variant." },
        title: { type: "string" },
        description: { type: "string", description: "HTML markup from the rich-text editor; rendered inside the expanded accordion." },
        iconColor: { type: "string", description: "Color hex for the expand arrow icon (default #03a9f4)." }
      },
      additionalProperties: true
    }
  },
  table: {
    elementType: "table",
    label: "Table",
    category: "content",
    schemaVersion: 1,
    defaults: { contents: [["", ""], ["", ""], ["", ""], ["", ""]], head: false, markdown: false, size: "medium" },
    answersSchema: {
      type: "object",
      properties: {
        contents: { type: "array", description: "Native 2D array (string[][]) of cell contents stored directly inside answers. Cells hold plain text, or HTML when markdown is true." },
        head: { type: "boolean", description: "Native boolean. First contents row becomes the table head." },
        markdown: { type: "boolean", description: "Native boolean. When true, cells are rendered with dangerouslySetInnerHTML." },
        size: { type: "string", enum: ["medium", "small"], description: "MUI Table size." }
      },
      additionalProperties: true
    }
  },
  buttonLink: {
    elementType: "buttonLink",
    label: "Button Link",
    category: "content",
    schemaVersion: 1,
    defaults: { buttonLinkVariant: "contained", buttonLinkColor: "primary" },
    answersSchema: {
      type: "object",
      properties: {
        buttonLinkText: { type: "string" },
        buttonLinkUrl: { type: "string" },
        buttonLinkVariant: { type: "string", enum: ["contained", "outlined"] },
        buttonLinkColor: { type: "string", enum: ["primary", "secondary", "error", "warning", "info", "success"] },
        external: { type: "string", enum: ["true", "false"], description: "Checkbox boolean stored as the string \"true\"/\"false\"; \"true\" opens in a new tab." },
        fullWidth: { type: "string", enum: ["true", "false"], description: "Checkbox boolean stored as the string \"true\"/\"false\"." }
      },
      additionalProperties: true
    }
  },
  image: {
    elementType: "image",
    label: "Image",
    category: "media",
    schemaVersion: 1,
    defaults: { imageAlign: "left" },
    answersSchema: {
      type: "object",
      properties: {
        photo: { type: "string", description: "Image URL selected via the gallery modal." },
        photoAlt: { type: "string" },
        url: { type: "string", description: "Optional link URL; setting it disables the lightbox." },
        external: { type: "string", enum: ["true", "false"], description: "Checkbox boolean stored as the string \"true\"/\"false\"; \"true\" opens the link in a new tab." },
        noResize: { type: "string", enum: ["true", "false"], description: "Checkbox boolean stored as the string \"true\"/\"false\"; adds the no-resize CSS class." },
        enableLightbox: { type: "string", enum: ["true", "false"], description: "Checkbox boolean stored as the string \"true\"/\"false\"; ignored when url is set." },
        imageAlign: { type: "string", enum: ["left", "center", "right"] }
      },
      additionalProperties: true
    }
  },
  video: {
    elementType: "video",
    label: "Video",
    category: "media",
    schemaVersion: 1,
    defaults: { videoType: "youtube" },
    answersSchema: {
      type: "object",
      properties: {
        videoType: { type: "string", enum: ["youtube", "vimeo"] },
        videoId: { type: "string", description: "Bare provider video id (not the full URL), embedded into the provider's iframe src." }
      },
      additionalProperties: true
    }
  },
  map: {
    elementType: "map",
    label: "Location",
    category: "media",
    schemaVersion: 1,
    defaults: { mapZoom: 15 },
    answersSchema: {
      type: "object",
      properties: {
        mapAddress: { type: "string", description: "Address geocoded via the Google Maps Geocoding API to center the map." },
        mapLabel: { type: "string", description: "Marker label text; marker only shows when set." },
        mapZoom: { type: ["number", "string"], description: "Zoom level 8-20. The MUI Slider stores a native number (fallback 15); permissive for legacy string values." }
      },
      additionalProperties: true
    }
  },
  logo: {
    elementType: "logo",
    label: "Logo",
    category: "church",
    schemaVersion: 1,
    defaults: {},
    answersSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Optional link the logo points at. The image itself always comes from church appearance settings." },
        photoAlt: { type: "string", description: "Read by the renderer as the img alt text but never written by the editor." }
      },
      additionalProperties: true
    }
  },
  sermons: {
    elementType: "sermons",
    label: "Sermons",
    category: "church",
    schemaVersion: 1,
    defaults: {},
    answersSchema: { type: "object", properties: {}, additionalProperties: true }
  },
  stream: {
    elementType: "stream",
    label: "Stream",
    category: "church",
    schemaVersion: 1,
    defaults: { mode: "video", offlineContent: "countdown" },
    answersSchema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["video", "interaction"], description: "Anything other than \"video\" (including unset) enables chat/interaction alongside the stream." },
        offlineContent: { type: "string", enum: ["countdown", "hide", "block"], description: "What to show while offline: next-service countdown (default), nothing, or a reusable block." },
        targetBlockId: { type: "string", description: "Id of the elementBlock to show while offline; only relevant when offlineContent is \"block\"." }
      },
      additionalProperties: true
    }
  },
  donation: {
    elementType: "donation",
    label: "Donation",
    category: "church",
    schemaVersion: 1,
    defaults: { allowSingleGift: true, allowRecurring: true, showFundSelector: true, allowedFundIds: [], defaultFundId: "" },
    answersSchema: {
      type: "object",
      properties: {
        allowSingleGift: { type: "boolean", description: "Native boolean. Unset is treated as true (only the literal false disables)." },
        allowRecurring: { type: "boolean", description: "Native boolean; unset treated as true." },
        showFundSelector: { type: "boolean", description: "Native boolean; unset treated as true." },
        allowedFundIds: { type: "array", description: "Native array of fund id strings; empty/missing means all funds are allowed." },
        defaultFundId: { type: "string", description: "Fund id pre-selected in the donation form." }
      },
      additionalProperties: true
    }
  },
  donateLink: {
    elementType: "donateLink",
    label: "Donate Link",
    category: "church",
    schemaVersion: 1,
    defaults: {},
    answersSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Donation page URL; renderer appends amount/fundId query params." },
        text: { type: "string", description: "Heading text; renderer upper-cases it and falls back to \"DONATE NOW\"." },
        fundId: { type: "string", description: "Fund id appended to each button's URL." },
        amounts: { type: "string", description: "JSON-stringified array of suggested amounts, e.g. \"[25,50,100]\" (max 5 entries). Double-encoded inside answersJSON." }
      },
      additionalProperties: true
    }
  },
  form: {
    elementType: "form",
    label: "Form",
    category: "church",
    schemaVersion: 1,
    defaults: {},
    answersSchema: {
      type: "object",
      properties: { formId: { type: "string", description: "Id of a MembershipApi standalone form (contentType \"form\")." } },
      additionalProperties: true
    }
  },
  calendar: {
    elementType: "calendar",
    label: "Calendar",
    category: "church",
    schemaVersion: 1,
    defaults: {},
    answersSchema: {
      type: "object",
      properties: {
        calendarType: { type: "string", enum: ["group", "curated"] },
        calendarId: { type: "string", description: "Group id (calendarType \"group\") or curated calendar id (calendarType \"curated\")." }
      },
      additionalProperties: true
    }
  },
  groupList: {
    elementType: "groupList",
    label: "Group List",
    category: "church",
    schemaVersion: 1,
    defaults: {},
    answersSchema: {
      type: "object",
      properties: { label: { type: "string", description: "Optional group label filter; empty shows all public groups." } },
      additionalProperties: true
    }
  },
  groups: {
    elementType: "groups",
    label: "Groups Browser",
    category: "church",
    schemaVersion: 1,
    defaults: { showSearch: "true", showCategory: "true" },
    answersSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Optional heading shown above the filter row." },
        category: { type: "string", description: "Pre-filter to a single category; hides the category dropdown when set." },
        label: { type: "string", description: "Pre-filter to a single group label." },
        showSearch: { type: ["string", "boolean"], description: "Editor writes the strings \"true\"/\"false\" but readers compare against native booleans; permissive union for production data." },
        showCategory: { type: ["string", "boolean"], description: "Same string-written / boolean-read history as showSearch." }
      },
      additionalProperties: true
    }
  },
  rawHTML: {
    elementType: "rawHTML",
    label: "HTML",
    category: "advanced",
    schemaVersion: 1,
    defaults: { rawHTML: "", javascript: "" },
    answersSchema: {
      type: "object",
      properties: {
        rawHTML: { type: "string", description: "Raw HTML injected via dangerouslySetInnerHTML." },
        javascript: { type: "string", description: "Inline JS body (no script tag) appended to document.body; values starting with \"<\" are skipped by the renderer." }
      },
      additionalProperties: true
    }
  },
  iframe: {
    elementType: "iframe",
    label: "Embedded Page",
    category: "advanced",
    schemaVersion: 1,
    defaults: { iframeHeight: "1000" },
    answersSchema: {
      type: "object",
      properties: {
        iframeSrc: { type: "string", description: "URL loaded into the iframe." },
        iframeHeight: { type: ["string", "number"], description: "Height in px; editor stores a string, renderer falls back to \"1000\"." }
      },
      additionalProperties: true
    }
  }
};

// Type-level validation only: enum and unknown-key violations are tolerated because
// production data predates this contract. Unknown element types pass.
export const validateElementAnswers = (elementType: string, answers: unknown): string[] => {
  const definition = ElementTypes[elementType];
  if (!definition || answers === null || answers === undefined) return [];
  if (typeof answers !== "object" || Array.isArray(answers)) return ["answers must be an object for elementType '" + elementType + "'"];
  const errors: string[] = [];
  Object.entries(answers as Record<string, unknown>).forEach(([key, value]) => {
    const prop = definition.answersSchema.properties[key];
    if (!prop || value === null || value === undefined) return;
    const allowed = Array.isArray(prop.type) ? prop.type : [prop.type];
    const actual = Array.isArray(value) ? "array" : typeof value;
    if (!allowed.includes(actual)) errors.push("answers." + key + " on '" + elementType + "' should be " + allowed.join("|") + " but got " + actual);
  });
  return errors;
};
