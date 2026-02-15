# @churchapps/apphelper-markdown

A React/Next.js markdown editor component library built on Lexical for ChurchApps - providing rich text editing capabilities with markdown support.

## Installation

```bash
npm install @churchapps/apphelper-markdown
```

## Dependencies

This package depends on:
- `@churchapps/apphelper` - For core UI components (Loading, Locale, etc.)
- `@churchapps/helpers` - For API helpers and core utilities

## Components

### MarkdownEditor
A full-featured markdown editor with toolbar, plugins, and live preview.

```tsx
import { MarkdownEditor } from '@churchapps/apphelper-markdown';

function MyComponent() {
  const [value, setValue] = useState('');

  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
      placeholder="Enter your markdown here..."
      textAlign="left"
    />
  );
}
```

### MarkdownPreview
A component for rendering markdown content as HTML.

```tsx
import { MarkdownPreview } from '@churchapps/apphelper-markdown';

function MyComponent() {
  return (
    <MarkdownPreview value="# Hello World\n\nThis is **markdown**!" />
  );
}
```

### MarkdownPreviewLight
A lightweight version of the markdown preview component.

```tsx
import { MarkdownPreviewLight } from '@churchapps/apphelper-markdown';

function MyComponent() {
  return (
    <MarkdownPreviewLight value="# Hello World\n\nThis is **markdown**!" />
  );
}
```

### MarkdownModal
A modal dialog for editing markdown content.

```tsx
import { MarkdownModal } from '@churchapps/apphelper-markdown';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const [value, setValue] = useState('');

  return (
    <>
      <button onClick={() => setShowModal(true)}>Edit Markdown</button>
      {showModal && (
        <MarkdownModal
          value={value}
          onChange={setValue}
          hideModal={() => setShowModal(false)}
        />
      )}
    </>
  );
}
```

## Features

- **Lexical-based editor** - Modern, extensible rich text framework
- **Markdown support** - Full markdown syntax support with live preview
- **Toolbar plugins** - Formatting tools, link insertion, emoji picker
- **Custom transformers** - Convert between markdown and rich text
- **Material-UI integration** - Consistent styling with ChurchApps design system
- **Lazy loading** - Editor components load on demand for better performance
- **Emoji support** - Built-in emoji picker with image assets
- **Link editing** - Custom link node with floating editor
- **Responsive design** - Works on desktop and mobile

## Asset Management

The package includes:
- **CSS files** - Editor styling
- **SVG icons** - Toolbar button icons
- **Emoji images** - PNG emoji assets
- **Markdown transformers** - Custom lexical transformers

## Build

```bash
npm run build
```

This will:
1. Compile TypeScript to JavaScript
2. Generate type definitions
3. Copy CSS, icons, and emoji assets to dist folder

## License

MIT - See LICENSE file for details