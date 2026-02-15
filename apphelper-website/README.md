# @churchapps/apphelper-website

Website building components for ChurchApps applications - a comprehensive library of content elements, event calendars, and page-building tools.

## Installation

```bash
npm install @churchapps/apphelper-website
```

## Features

- **25+ Element Types** - Rich content building blocks (Text, Image, Video, Forms, etc.)
- **Event Calendar** - Full-featured calendar with recurring events and Google Calendar integration
- **Drag & Drop Admin** - Visual page builder with draggable elements
- **Donation Integration** - Seamless donation forms and links
- **Group Management** - Group display and listing components
- **Theme System** - Customizable theming and styling
- **Animations** - Built-in animation system with various effects
- **Streaming Services** - Live stream integration with YouTube backgrounds
- **Google Maps** - Map element with location display

## Dependencies

- `@churchapps/helpers` - Core utilities and interfaces
- `@churchapps/apphelper` - UI components
- React 18+ or 19+
- Material-UI 7+
- `react-big-calendar` - Calendar component
- `@react-google-maps/api` - Google Maps integration
- `react-dnd` - Drag and drop functionality
- `rrule` - Recurring event support

## Components

### Element Types

Display and content components for building website pages:

- **BoxElement** - Container with customizable styles
- **ButtonLink** - Interactive button links
- **CalendarElement** - Embedded event calendar
- **CardElement** - Material-UI card layouts
- **CarouselElement** - Image/content carousel
- **DonateLinkElement** - Donation call-to-action
- **ElementBlock** - Generic element wrapper
- **FaqElement** - FAQ accordion display
- **FormElement** - Embedded forms
- **GroupListElement** - Group directory
- **IframeElement** - Embedded iframe content
- **ImageElement** - Responsive images
- **LogoElement** - Logo display
- **MapElement** - Google Maps integration
- **RawHTMLElement** - Custom HTML content
- **RowElement** - Layout rows
- **SermonElement** - Sermon display
- **StreamElement** - Live streaming
- **TableElement** - Data tables
- **TextOnly** - Plain text content
- **TextWithPhoto** - Combined text and image
- **VideoElement** - Video player
- **WhiteSpaceElement** - Spacing control

### Event Calendar

Full calendar system with recurring events:

- **EventCalendar** - Main calendar component with month/week/day views
- **GroupCalendar** - Group-specific calendar
- **DisplayEventModal** - Event details dialog
- **EditEventModal** - Event editing interface
- **EditRecurringModal** - Recurring event editor
- **RRuleEditor** - Recurrence rule builder

### Admin Components

Drag-and-drop page builder tools:

- **DraggableWrapper** - Makes elements draggable
- **DroppableArea** - Drop zones for elements

### Donation Components

- **NonAuthDonationWrapper** - Donation forms for non-authenticated users

### Groups

- **GroupCard** - Individual group card display
- **GroupList** - List of groups

### Video/Streaming

- **LiveStream** - Live streaming component
- **VideoContainer** - Video player wrapper

### Layout & Theming

- **Element** - Core element renderer
- **Theme** - Theme configuration
- **YoutubeBackground** - YouTube video backgrounds
- **Animate** - Animation wrapper component

## Helpers

Utility functions for website components:

- **StyleHelper** - Style manipulation and responsive design
- **AnimationHelper** - Animation utilities
- **EnvironmentHelper** - Environment detection
- **StreamingServiceHelper** - Streaming service integration
- **interfaces** - TypeScript interfaces (ElementInterface, SectionInterface, StyleSet)

## Usage

### Basic Element Rendering

```tsx
import { Element } from '@churchapps/apphelper-website';

function MyPage() {
  const element = {
    elementType: 'textOnly',
    answers: { text: 'Hello World' }
  };

  return <Element element={element} />;
}
```

### Event Calendar

```tsx
import { EventCalendar } from '@churchapps/apphelper-website';

function EventsPage() {
  return (
    <EventCalendar
      churchId="your-church-id"
      onEventClick={(event) => console.log(event)}
    />
  );
}
```

### Theme Integration

```tsx
import { Theme } from '@churchapps/apphelper-website';

function App() {
  const theme = {
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    palette: 'light'
  };

  return <Theme appearance={theme}>{/* Your content */}</Theme>;
}
```

### Animations

```tsx
import { Animate } from '@churchapps/apphelper-website';

function AnimatedContent() {
  return (
    <Animate animation="fadeIn" speed="slow">
      <div>This content will fade in</div>
    </Animate>
  );
}
```

### Admin Page Builder

```tsx
import { DraggableWrapper, DroppableArea } from '@churchapps/apphelper-website';

function PageBuilder() {
  return (
    <DroppableArea onDrop={(element) => handleDrop(element)}>
      <DraggableWrapper element={myElement}>
        {/* Draggable content */}
      </DraggableWrapper>
    </DroppableArea>
  );
}
```

## Build

```bash
npm run build
```

This will:
1. Clean the dist folder
2. Compile TypeScript to JavaScript
3. Generate type definitions
4. Copy CSS styles to dist folder

## License

MIT - See LICENSE file for details
