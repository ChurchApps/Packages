import React from "react";
import { Container, Box, Typography, Alert, Stack, Button, Card, CardContent, Chip } from "@mui/material";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "../ErrorBoundary";
import { BoxElement, ButtonLink, CalendarElement, CardElement, CarouselElement, DonateLinkElement, Element, ElementBlock, FaqElement, GroupListElement, HtmlPreview, IframeElement, ImageElement, LogoElement, MapElement, RawHTMLElement, RowElement, SermonElement, StreamElement, TableElement, TextOnly, TextWithPhoto, VideoElement, WhiteSpaceElement } from "../../../src";
import { DraggableWrapper } from "../../../src/components/admin/DraggableWrapper";
import { DroppableArea } from "../../../src/components/admin/DroppableArea";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import UserContext from "../UserContext";

function ComponentPage({ children, title }: { children: React.ReactNode, title: string }) {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 2, mb: 2 }}>
        <Link to="/">← Back to Home</Link>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2 }}>
          {title}
        </Typography>
        <ErrorBoundary>
          <Box sx={{ mt: 3 }}>
            {children}
          </Box>
        </ErrorBoundary>
      </Box>
    </Container>
  );
}

const websiteComponents = [
  {
    name: "BoxElement",
    description: "Container element with customizable background, colors, and nested child elements",
    category: "Container",
    complexity: "High"
  },
  {
    name: "ButtonLink",
    description: "Material-UI button component for creating clickable links with various styles",
    category: "Element",
    complexity: "Low"
  },
  {
    name: "CalendarElement",
    description: "Displays church calendar events (group or curated) with customizable views",
    category: "Element",
    complexity: "High"
  },
  {
    name: "CardElement",
    description: "Material-UI card with photo, title, and rich text content",
    category: "Element",
    complexity: "Medium"
  },
  {
    name: "CarouselElement",
    description: "Carousel/slider component with auto-play, fade/slide animations, and nested elements",
    category: "Container",
    complexity: "High"
  },
  {
    name: "DonateLinkElement",
    description: "Displays donation buttons with preset amounts and custom donation links",
    category: "Element",
    complexity: "Low"
  },
  {
    name: "ElementBlock",
    description: "Container for rendering a group of child elements together",
    category: "Container",
    complexity: "Low"
  },
  {
    name: "FaqElement",
    description: "Accordion-style FAQ item with expandable content",
    category: "Element",
    complexity: "Medium"
  },
  {
    name: "FormElement",
    description: "Displays and handles form submissions with validation and thank-you messages",
    category: "Element",
    complexity: "High"
  },
  {
    name: "GroupListElement",
    description: "Displays a list of church groups with photos, meeting info, and descriptions",
    category: "Element",
    complexity: "Medium"
  },
  {
    name: "HtmlPreview",
    description: "Renders HTML content with optional editing support",
    category: "Element",
    complexity: "Low"
  },
  {
    name: "IframeElement",
    description: "Embeds external content via iframe with configurable height",
    category: "Element",
    complexity: "Low"
  },
  {
    name: "ImageElement",
    description: "Displays images with alignment, linking, and resize options",
    category: "Element",
    complexity: "Medium"
  },
  {
    name: "LogoElement",
    description: "Displays church logo that adapts to light/dark themes",
    category: "Element",
    complexity: "Low"
  },
  {
    name: "MapElement",
    description: "Embeds Google Maps with custom address, zoom level, and marker labels",
    category: "Element",
    complexity: "Medium"
  },
  {
    name: "RawHTMLElement",
    description: "Renders raw HTML content with optional JavaScript injection for custom embeds",
    category: "Element",
    complexity: "Low"
  },
  {
    name: "RowElement",
    description: "Container for creating multi-column layouts with responsive sizing and drag-drop support",
    category: "Container",
    complexity: "High"
  },
  {
    name: "SermonElement",
    description: "Displays church sermons organized by playlists with video playback and breadcrumb navigation",
    category: "Element",
    complexity: "High"
  },
  {
    name: "StreamElement",
    description: "Displays live stream video with optional interaction features and offline content",
    category: "Element",
    complexity: "High"
  },
  {
    name: "TableElement",
    description: "Displays tabular data with customizable headers and optional markdown rendering",
    category: "Element",
    complexity: "Medium"
  },
  {
    name: "TextOnly",
    description: "Renders text content with optional editing support and text alignment",
    category: "Element",
    complexity: "Low"
  },
  {
    name: "TextWithPhoto",
    description: "Displays text content with an accompanying photo in various positions (left, right, top, bottom)",
    category: "Element",
    complexity: "Medium"
  },
  {
    name: "VideoElement",
    description: "Embeds YouTube or Vimeo videos with responsive sizing",
    category: "Element",
    complexity: "Low"
  },
  {
    name: "WhiteSpaceElement",
    description: "Creates customizable white space with configurable height",
    category: "Element",
    complexity: "Low"
  }
];

export default function WebsiteComponentsPage() {
  const [selectedComponent, setSelectedComponent] = React.useState<string | null>(null);
  const [droppedItems, setDroppedItems] = React.useState<any[]>([]);
  const [editingElement, setEditingElement] = React.useState<any>(null);
  const [testElements, _setTestElements] = React.useState<any[]>([
    {
      id: "test-element-1",
      elementType: "text",
      sort: 1,
      sectionId: "test-section",
      answers: {
        text: "<h4>Text Element 1</h4><p>This is a draggable text element. Hover to see the drag handle.</p>",
        textAlignment: "left"
      }
    },
    {
      id: "test-element-2",
      elementType: "image",
      sort: 2,
      sectionId: "test-section",
      answers: {
        photo: "https://picsum.photos/400/200",
        photoAlt: "Test image",
        imageAlign: "center"
      }
    }
  ]);
  const context = React.useContext(UserContext);

  const renderComponent = (component: any) => {
    try {
      switch (component.name) {
        case "BoxElement":
          return (
            <Stack spacing={2}>
              <BoxElement
                element={{
                  id: "box-1",
                  elementType: "box",
                  answers: {
                    background: "#f5f5f5",
                    textColor: "#333",
                    rounded: "true"
                  },
                  elements: [
                    {
                      id: "box-1-text",
                      elementType: "text",
                      answers: {
                        text: "<h3>Box with Gray Background</h3><p>This is a rounded box with a gray background. It can contain nested elements.</p>",
                        textAlignment: "left"
                      }
                    }
                  ]
                }}
                churchSettings={{}}
                textColor="#333"
              />
              <BoxElement
                element={{
                  id: "box-2",
                  elementType: "box",
                  answers: {
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    textColor: "#ffffff",
                    rounded: "true",
                    translucent: "false"
                  },
                  elements: [
                    {
                      id: "box-2-text",
                      elementType: "text",
                      answers: {
                        text: "<h3>Box with Gradient Background</h3><p>This box has a purple gradient background with white text.</p>",
                        textAlignment: "center"
                      }
                    }
                  ]
                }}
                churchSettings={{}}
                textColor="#ffffff"
              />
              <BoxElement
                element={{
                  id: "box-3",
                  elementType: "box",
                  answers: {
                    background: "#e3f2fd",
                    textColor: "#1565c0",
                    rounded: "true"
                  },
                  elements: [
                    {
                      id: "box-3-img",
                      elementType: "image",
                      answers: {
                        photo: "https://picsum.photos/400/200",
                        photoAlt: "Sample image in box",
                        imageAlign: "center"
                      }
                    },
                    {
                      id: "box-3-text",
                      elementType: "text",
                      answers: {
                        text: "<h4>Box with Multiple Elements</h4><p>Boxes can contain any element types, including images, text, videos, and even nested boxes.</p>",
                        textAlignment: "left"
                      }
                    }
                  ]
                }}
                churchSettings={{}}
                textColor="#1565c0"
              />
              <Typography variant="caption" color="textSecondary">
                Examples showing different box backgrounds, colors, and nested elements.
              </Typography>
            </Stack>
          );

        case "ButtonLink":
          return (
            <Stack spacing={2}>
              <ButtonLink
                element={{
                  id: "button-1",
                  answers: {
                    buttonLinkText: "Click Me",
                    buttonLinkUrl: "#",
                    buttonLinkVariant: "contained",
                    buttonLinkColor: "primary"
                  }
                }}
              />
              <ButtonLink
                element={{
                  id: "button-2",
                  answers: {
                    buttonLinkText: "Outlined Button",
                    buttonLinkUrl: "#",
                    buttonLinkVariant: "outlined",
                    buttonLinkColor: "secondary"
                  }
                }}
              />
              <ButtonLink
                element={{
                  id: "button-3",
                  answers: {
                    buttonLinkText: "Full Width Button",
                    buttonLinkUrl: "https://churchapps.org",
                    buttonLinkVariant: "contained",
                    buttonLinkColor: "primary",
                    fullWidth: "true",
                    external: "true"
                  }
                }}
              />
            </Stack>
          );

        case "CalendarElement":
          return (
            <Stack spacing={2}>
              {context?.user ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You are logged in. The calendar is now editable (API calls may fail in demo mode).
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You are not logged in. The calendar is read-only. <Link to="/login">Log in</Link> to enable editing.
                </Alert>
              )}
              <CalendarElement
                element={{
                  id: "calendar-1",
                  elementType: "calendar",
                  answers: {
                    calendarType: "group",
                    calendarId: "group-123"
                  }
                }}
                churchId="church-456"
                canEdit={!!context?.user}
              />
              <CalendarElement
                element={{
                  id: "calendar-2",
                  elementType: "calendar",
                  answers: {
                    calendarType: "curated",
                    calendarId: "curated-789"
                  }
                }}
                churchId="church-456"
                canEdit={!!context?.user}
              />
              <Typography variant="caption" color="textSecondary">
                Calendar editing is {context?.user ? "enabled" : "disabled"} based on login status.
              </Typography>
            </Stack>
          );

        case "HtmlPreview":
          return (
            <Stack spacing={2}>
              <HtmlPreview
                value="<h3>Sample HTML Content</h3><p>This is a <strong>preview</strong> of HTML content with <em>formatting</em>.</p>"
                element={{ id: "html-1" }}
              />
              <HtmlPreview
                value="<p style='color: blue; text-align: center;'>Centered blue text</p>"
                textAlign="center"
                element={{ id: "html-2" }}
              />
              <HtmlPreview
                value="<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>"
                element={{ id: "html-3" }}
              />
            </Stack>
          );

        case "IframeElement":
          return (
            <Stack spacing={2}>
              <IframeElement
                element={{
                  id: "iframe-1",
                  answers: {
                    iframeSrc: "https://www.openstreetmap.org/export/embed.html?bbox=-0.004017949104309083%2C51.47612752641776%2C0.00030577182769775396%2C51.478569861898606&layer=mapnik",
                    iframeHeight: "400"
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Example: Embedded map with 400px height
              </Typography>
            </Stack>
          );

        case "ImageElement":
          return (
            <Stack spacing={2}>
              <ImageElement
                element={{
                  id: "image-1",
                  answers: {
                    photo: "https://picsum.photos/400/300",
                    photoAlt: "Sample image",
                    imageAlign: "center"
                  }
                }}
              />
              <ImageElement
                element={{
                  id: "image-2",
                  answers: {
                    photo: "https://picsum.photos/300/200",
                    photoAlt: "Linked image",
                    imageAlign: "left",
                    url: "https://churchapps.org",
                    external: "true"
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                First image: centered, no link. Second image: left-aligned, links to ChurchApps.org
              </Typography>
            </Stack>
          );

        case "TextOnly":
          return (
            <Stack spacing={2}>
              <TextOnly
                element={{
                  id: "text-1",
                  answers: {
                    text: "<h2>Welcome to Our Church</h2><p>This is a sample text-only element with <strong>formatted content</strong>. It supports HTML formatting and can be aligned as needed.</p>",
                    textAlignment: "left"
                  }
                }}
              />
              <TextOnly
                element={{
                  id: "text-2",
                  answers: {
                    text: "<p>This text is <em>centered</em> on the page.</p>",
                    textAlignment: "center"
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                First text: left-aligned. Second text: centered.
              </Typography>
            </Stack>
          );

        case "TextWithPhoto":
          return (
            <Stack spacing={2}>
              <TextWithPhoto
                element={{
                  id: "textwithphoto-1",
                  answers: {
                    text: "<h3>Photo on Left</h3><p>This demonstrates text with a photo positioned on the left side. The photo and text are displayed side by side in a responsive grid layout.</p>",
                    photo: "https://picsum.photos/300/400",
                    photoAlt: "Sample photo",
                    photoPosition: "left",
                    textAlignment: "left"
                  }
                }}
              />
              <TextWithPhoto
                element={{
                  id: "textwithphoto-2",
                  answers: {
                    text: "<h3>Photo on Right</h3><p>This demonstrates text with a photo positioned on the right side. The layout adjusts responsively on smaller screens.</p>",
                    photo: "https://picsum.photos/300/400",
                    photoAlt: "Sample photo",
                    photoPosition: "right",
                    textAlignment: "left"
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Examples showing different photo positions: left and right.
              </Typography>
            </Stack>
          );

        case "VideoElement":
          return (
            <Stack spacing={2}>
              <VideoElement
                element={{
                  id: "video-1",
                  answers: {
                    videoType: "youtube",
                    videoId: "dQw4w9WgXcQ"
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Example YouTube video embed (responsive sizing)
              </Typography>
              <VideoElement
                element={{
                  id: "video-2",
                  answers: {
                    videoType: "vimeo",
                    videoId: "76979871"
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Example Vimeo video embed (responsive sizing)
              </Typography>
            </Stack>
          );

        case "WhiteSpaceElement":
          return (
            <Stack spacing={2}>
              <Box sx={{ border: "1px dashed #ccc", p: 1 }}>
                <Typography variant="caption" color="textSecondary">Content above</Typography>
                <WhiteSpaceElement
                  element={{
                    id: "whitespace-1",
                    answers: { height: "50" }
                  }}
                />
                <Typography variant="caption" color="textSecondary">Content below (50px spacing)</Typography>
              </Box>
              <Box sx={{ border: "1px dashed #ccc", p: 1 }}>
                <Typography variant="caption" color="textSecondary">Content above</Typography>
                <WhiteSpaceElement
                  element={{
                    id: "whitespace-2",
                    answers: { height: "100" }
                  }}
                />
                <Typography variant="caption" color="textSecondary">Content below (100px spacing)</Typography>
              </Box>
            </Stack>
          );

        case "FaqElement":
          return (
            <Stack spacing={2}>
              <FaqElement
                element={{
                  id: "faq-1",
                  elementType: "faq",
                  answers: {
                    title: "What time are Sunday services?",
                    description: "<p>Our Sunday services are at <strong>9:00 AM</strong> and <strong>11:00 AM</strong>. We also have a Wednesday evening service at 7:00 PM.</p>",
                    iconColor: "#03a9f4",
                    headingType: "default"
                  }
                }}
                textColor="dark"
              />
              <FaqElement
                element={{
                  id: "faq-2",
                  elementType: "faq",
                  answers: {
                    title: "Is childcare available?",
                    description: "<p>Yes! We offer childcare for infants through age 5 during both morning services. Our trained staff provides a safe, nurturing environment.</p><ul><li>Infants (0-12 months)</li><li>Toddlers (1-2 years)</li><li>Preschool (3-5 years)</li></ul>",
                    iconColor: "#4caf50",
                    headingType: "default"
                  }
                }}
                textColor="dark"
              />
              <FaqElement
                element={{
                  id: "faq-3",
                  elementType: "faq",
                  answers: {
                    title: "Simple Link Style FAQ",
                    description: "<p>This is an example of an FAQ with a <strong>link-style</strong> heading instead of the default accordion style.</p>",
                    iconColor: "#ff5722",
                    headingType: "link"
                  }
                }}
                textColor="dark"
              />
              <Typography variant="caption" color="textSecondary">
                FAQ elements with expandable content. Click to expand/collapse each section.
              </Typography>
            </Stack>
          );

        case "CardElement":
          return (
            <Stack spacing={2} direction="row" flexWrap="wrap">
              <Box sx={{ flex: "1 1 300px" }}>
                <CardElement
                  element={{
                    id: "card-1",
                    elementType: "card",
                    answers: {
                      photo: "https://picsum.photos/400/300",
                      photoAlt: "Card image",
                      title: "Welcome to Our Church",
                      titleAlignment: "center",
                      text: "<p>Join us for worship, fellowship, and community service. Everyone is welcome!</p>",
                      textAlignment: "center"
                    }
                  }}
                />
              </Box>
              <Box sx={{ flex: "1 1 300px" }}>
                <CardElement
                  element={{
                    id: "card-2",
                    elementType: "card",
                    answers: {
                      photo: "https://picsum.photos/400/301",
                      photoAlt: "Card image with link",
                      title: "Youth Ministry",
                      titleAlignment: "center",
                      text: "<p>Active youth group meeting every Friday evening. Ages 13-18 welcome. Games, worship, and Bible study.</p>",
                      textAlignment: "left",
                      url: "https://churchapps.org"
                    }
                  }}
                />
              </Box>
              <Box sx={{ flex: "1 1 300px" }}>
                <CardElement
                  element={{
                    id: "card-3",
                    elementType: "card",
                    answers: {
                      title: "Small Groups",
                      titleAlignment: "left",
                      text: "<p><strong>Connect with others</strong> in a small group setting. We have groups meeting throughout the week for all ages and interests.</p><ul><li>Bible Study</li><li>Prayer Groups</li><li>Service Projects</li></ul>",
                      textAlignment: "left"
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ width: "100%" }}>
                Card elements with photos, titles, and text content. Click titles/images to navigate (when URL is set).
              </Typography>
            </Stack>
          );

        case "CarouselElement":
          return (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Carousel component requires nested elements structure. This demo shows static rendering without edit mode.
              </Alert>
              <CarouselElement
                element={{
                  id: "carousel-1",
                  elementType: "carousel",
                  answers: {
                    interval: "4",
                    animationOptions: "slide",
                    autoplay: "true",
                    height: "300"
                  },
                  elements: [
                    {
                      id: "carousel-slide-1",
                      elementType: "box",
                      elements: [
                        {
                          id: "carousel-slide-1-content",
                          elementType: "text",
                          answers: {
                            text: '<div style="text-align: center; padding: 60px 20px;"><h2>Welcome to Our Church</h2><p>Join us for worship every Sunday at 9 AM and 11 AM</p></div>',
                            textAlignment: "center"
                          }
                        }
                      ]
                    },
                    {
                      id: "carousel-slide-2",
                      elementType: "box",
                      elements: [
                        {
                          id: "carousel-slide-2-content",
                          elementType: "text",
                          answers: {
                            text: '<div style="text-align: center; padding: 60px 20px; background: #e3f2fd;"><h2>Community Events</h2><p>Check out our upcoming events and activities</p></div>',
                            textAlignment: "center"
                          }
                        }
                      ]
                    },
                    {
                      id: "carousel-slide-3",
                      elementType: "box",
                      elements: [
                        {
                          id: "carousel-slide-3-content",
                          elementType: "text",
                          answers: {
                            text: '<div style="text-align: center; padding: 60px 20px; background: #f3e5f5;"><h2>Get Connected</h2><p>Find a small group or ministry to join</p></div>',
                            textAlignment: "center"
                          }
                        }
                      ]
                    }
                  ]
                }}
                churchSettings={{}}
                textColor="dark"
              />
              <Typography variant="caption" color="textSecondary">
                Auto-playing carousel with slide animation. Use navigation arrows or dots to control slides manually.
              </Typography>
            </Stack>
          );

        case "ElementBlock":
          return (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                ElementBlock is a container that renders child elements. This demo shows a block with multiple nested elements.
              </Alert>
              <ElementBlock
                element={{
                  id: "block-1",
                  elementType: "block",
                  elements: [
                    {
                      id: "block-1-title",
                      elementType: "text",
                      answers: {
                        text: '<h3 style="text-align: center; color: #1976d2;">About Our Ministry</h3>',
                        textAlignment: "center"
                      }
                    },
                    {
                      id: "block-1-image",
                      elementType: "image",
                      answers: {
                        photo: "https://picsum.photos/600/300",
                        photoAlt: "Ministry image",
                        imageAlign: "center"
                      }
                    },
                    {
                      id: "block-1-text",
                      elementType: "text",
                      answers: {
                        text: "<p>We are committed to serving our community through various outreach programs, worship services, and fellowship opportunities. Join us as we grow together in faith.</p>",
                        textAlignment: "left"
                      }
                    },
                    {
                      id: "block-1-button",
                      elementType: "buttonLink",
                      answers: {
                        buttonLinkText: "Learn More",
                        buttonLinkUrl: "https://churchapps.org",
                        buttonLinkVariant: "contained",
                        buttonLinkColor: "primary"
                      }
                    }
                  ]
                }}
                churchSettings={{}}
                textColor="dark"
              />
              <Typography variant="caption" color="textSecondary">
                ElementBlock containing multiple child elements: title, image, text, and button.
              </Typography>
            </Stack>
          );

        case "LogoElement":
          return (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                LogoElement displays the church logo. It adapts to light/dark themes by switching between logo variants. In this demo, a placeholder logo is used since church settings are not fully configured.
              </Alert>
              <Box sx={{ textAlign: "center", p: 3, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                <LogoElement
                  element={{
                    id: "logo-1",
                    elementType: "logo",
                    answers: { photoAlt: "Church Logo" }
                  }}
                  churchSettings={{ appearance: { logoLight: "/images/logo.png" } }}
                  textColor="dark"
                />
              </Box>
              <Box sx={{ textAlign: "center", p: 3, bgcolor: "#333", borderRadius: 1 }}>
                <LogoElement
                  element={{
                    id: "logo-2",
                    elementType: "logo",
                    answers: {
                      photoAlt: "Church Logo (Dark Background)",
                      url: "https://churchapps.org"
                    }
                  }}
                  churchSettings={{ appearance: { logoDark: "/images/logo.png" } }}
                  textColor="light"
                />
              </Box>
              <Typography variant="caption" color="textSecondary">
                Examples showing logo on light and dark backgrounds. Second logo is clickable.
              </Typography>
            </Stack>
          );

        case "MapElement":
          return (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                MapElement embeds Google Maps with custom address, zoom level, and optional marker labels. Note: This requires a valid NEXT_PUBLIC_GOOGLE_API_KEY environment variable to function.
              </Alert>
              <MapElement
                element={{
                  id: "map-1",
                  elementType: "map",
                  answers: {
                    mapAddress: "1600 Amphitheatre Parkway, Mountain View, CA",
                    mapZoom: 15,
                    mapLabel: "Google HQ"
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Example map with custom address, zoom level, and marker label.
              </Typography>
              <MapElement
                element={{
                  id: "map-2",
                  elementType: "map",
                  answers: {
                    mapAddress: "Times Square, New York, NY",
                    mapZoom: 14
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Example map without a marker label (zoom level 14).
              </Typography>
            </Stack>
          );

        case "RawHTMLElement":
          return (
            <Stack spacing={2}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                RawHTMLElement renders raw HTML and can execute JavaScript. Use with caution! Only use trusted HTML content.
              </Alert>
              <RawHTMLElement
                element={{
                  id: "rawhtml-1",
                  elementType: "rawHTML",
                  answers: { rawHTML: '<div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; text-align: center;"><h3>Custom HTML Content</h3><p>This is raw HTML with inline styles and formatting.</p></div>' }
                }}
              />
              <RawHTMLElement
                element={{
                  id: "rawhtml-2",
                  elementType: "rawHTML",
                  answers: { rawHTML: '<div style="border: 2px solid #2196f3; padding: 15px; border-radius: 4px;"><strong>Important Notice:</strong> This element can render any HTML content including forms, tables, custom styles, and more.</div>' }
                }}
              />
              <RawHTMLElement
                element={{
                  id: "rawhtml-3",
                  elementType: "rawHTML",
                  answers: { rawHTML: '<table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f5f5f5;"><th style="padding: 10px; border: 1px solid #ddd;">Column 1</th><th style="padding: 10px; border: 1px solid #ddd;">Column 2</th><th style="padding: 10px; border: 1px solid #ddd;">Column 3</th></tr></thead><tbody><tr><td style="padding: 10px; border: 1px solid #ddd;">Data 1</td><td style="padding: 10px; border: 1px solid #ddd;">Data 2</td><td style="padding: 10px; border: 1px solid #ddd;">Data 3</td></tr><tr><td style="padding: 10px; border: 1px solid #ddd;">Data 4</td><td style="padding: 10px; border: 1px solid #ddd;">Data 5</td><td style="padding: 10px; border: 1px solid #ddd;">Data 6</td></tr></tbody></table>' }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Examples showing gradient box, notice box, and table rendered from raw HTML.
              </Typography>
            </Stack>
          );

        case "RowElement":
          return (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                RowElement creates multi-column layouts using Material-UI Grid. It supports responsive sizing, nested elements, and drag-drop in edit mode (edit mode disabled in playground).
              </Alert>
              <RowElement
                element={{
                  id: "row-1",
                  elementType: "row",
                  sectionId: "section-1",
                  elements: [
                    {
                      id: "row-1-col-1",
                      elementType: "column",
                      answers: { size: 6, mobileSize: 12 },
                      elements: [
                        {
                          id: "row-1-col-1-text",
                          elementType: "text",
                          answers: {
                            text: "<h4>Column 1 (50%)</h4><p>This is the first column taking up half the width on desktop and full width on mobile.</p>",
                            textAlignment: "left"
                          }
                        }
                      ]
                    },
                    {
                      id: "row-1-col-2",
                      elementType: "column",
                      answers: { size: 6, mobileSize: 12 },
                      elements: [
                        {
                          id: "row-1-col-2-img",
                          elementType: "image",
                          answers: {
                            photo: "https://picsum.photos/400/250",
                            photoAlt: "Column 2 image",
                            imageAlign: "center"
                          }
                        }
                      ]
                    }
                  ]
                }}
                churchSettings={{}}
                textColor="dark"
              />
              <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 2 }}>
                Two-column layout: 50/50 split on desktop, stacked on mobile.
              </Typography>
              <RowElement
                element={{
                  id: "row-2",
                  elementType: "row",
                  sectionId: "section-1",
                  elements: [
                    {
                      id: "row-2-col-1",
                      elementType: "column",
                      answers: { size: 4, mobileSize: 12 },
                      elements: [
                        {
                          id: "row-2-col-1-text",
                          elementType: "text",
                          answers: {
                            text: "<h5>Column 1</h5><p>33% width</p>",
                            textAlignment: "center"
                          }
                        }
                      ]
                    },
                    {
                      id: "row-2-col-2",
                      elementType: "column",
                      answers: { size: 4, mobileSize: 12 },
                      elements: [
                        {
                          id: "row-2-col-2-text",
                          elementType: "text",
                          answers: {
                            text: "<h5>Column 2</h5><p>33% width</p>",
                            textAlignment: "center"
                          }
                        }
                      ]
                    },
                    {
                      id: "row-2-col-3",
                      elementType: "column",
                      answers: { size: 4, mobileSize: 12 },
                      elements: [
                        {
                          id: "row-2-col-3-text",
                          elementType: "text",
                          answers: {
                            text: "<h5>Column 3</h5><p>33% width</p>",
                            textAlignment: "center"
                          }
                        }
                      ]
                    }
                  ]
                }}
                churchSettings={{}}
                textColor="dark"
              />
              <Typography variant="caption" color="textSecondary">
                Three-column layout: 33/33/33 split on desktop, stacked on mobile.
              </Typography>
            </Stack>
          );

        case "SermonElement":
          return (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                SermonElement displays church sermons organized by playlists. In a real app, this would fetch data from the ContentApi. This demo shows the component structure with API calls that will fail gracefully.
              </Alert>
              <Alert severity="warning" sx={{ mb: 2 }}>
                API calls will fail in playground mode as no backend is configured. The component will show a loading state or empty content.
              </Alert>
              <SermonElement
                churchId="demo-church-123"
                appearance={{
                  logoLight: "/images/logo.png",
                  logoDark: "/images/logo.png"
                }}
              />
              <Typography variant="caption" color="textSecondary">
                In production, this component would display playlists, sermons within each playlist, and allow video playback with breadcrumb navigation.
              </Typography>
            </Stack>
          );

        case "StreamElement":
          return (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                StreamElement displays live stream content with optional interaction features. This demo uses a simplified stub component.
              </Alert>
              <StreamElement
                element={{
                  id: "stream-1",
                  elementType: "stream",
                  answers: {
                    mode: "video",
                    offlineContent: "hide"
                  }
                }}
                churchSettings={{ logoLight: "/images/logo.png" }}
                church={{
                  id: "demo-church-123",
                  name: "Demo Church",
                  subDomain: "ironwood"
                }}
                editMode={false}
              />
              <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: "block" }}>
                Video-only mode (no interaction features)
              </Typography>
              <StreamElement
                element={{
                  id: "stream-2",
                  elementType: "stream",
                  answers: {
                    mode: "full",
                    offlineContent: "block"
                  }
                }}
                churchSettings={{ logoLight: "/images/logo.png" }}
                church={{
                  id: "demo-church-123",
                  name: "Demo Church",
                  subDomain: "ironwood"
                }}
                editMode={false}
              />
              <Typography variant="caption" color="textSecondary">
                Full mode with interaction (when live). Shows offline content block when stream is offline.
              </Typography>
            </Stack>
          );

        case "DonateLinkElement":
          return (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                DonateLinkElement displays donation buttons with preset amounts that link to an external donation page.
              </Alert>
              <DonateLinkElement
                element={{
                  id: "donate-1",
                  elementType: "donate",
                  answers: {
                    text: "Support Our Mission",
                    amounts: "[25, 50, 100, 250]",
                    url: "https://donate.example.com",
                    fundId: "general-fund-123"
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Preset donation amounts with custom fund targeting.
              </Typography>
            </Stack>
          );

        case "FormElement":
          return (
            <Stack spacing={2}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                FormElement requires form data from the API. This demo shows a loading state as no actual form is configured.
              </Alert>
              <Typography variant="caption" color="textSecondary">
                In production, this component displays customizable forms with validation, field types, and submission handling.
              </Typography>
            </Stack>
          );

        case "GroupListElement":
          return (
            <Stack spacing={2}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                GroupListElement displays church groups from the API. This demo may show "No groups found" if the API is unavailable.
              </Alert>
              <GroupListElement
                churchId="demo-church-123"
                element={{
                  id: "groups-1",
                  elementType: "groupList",
                  answers: { label: "Small Groups" }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Displays groups filtered by label with photos, meeting times, and descriptions.
              </Typography>
            </Stack>
          );

        case "TableElement":
          return (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                TableElement displays tabular data with optional headers and markdown support.
              </Alert>
              <TableElement
                element={{
                  id: "table-1",
                  elementType: "table",
                  answers: {
                    head: true,
                    size: "small",
                    markdown: false,
                    contents: [
                      ["Name", "Role", "Email"],
                      ["John Doe", "Pastor", "john@church.org"],
                      ["Jane Smith", "Worship Leader", "jane@church.org"],
                      ["Bob Johnson", "Youth Pastor", "bob@church.org"]
                    ]
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: "block" }}>
                Table with header row
              </Typography>
              <TableElement
                element={{
                  id: "table-2",
                  elementType: "table",
                  answers: {
                    head: false,
                    size: "medium",
                    markdown: true,
                    contents: [
                      ["<strong>Sunday Service</strong>", "9:00 AM & 11:00 AM"],
                      ["<strong>Wednesday Prayer</strong>", "7:00 PM"],
                      ["<strong>Friday Youth</strong>", "6:30 PM"]
                    ]
                  }
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Table with markdown content (no header)
              </Typography>
            </Stack>
          );

        default:
          return (
            <Alert severity="info">
              <strong>{component.name} Demo</strong>
              <br />
              {component.description}
              <br /><br />
              Component demo implementation not yet available.
            </Alert>
          );
      }
    } catch (error) {
      return (
        <Alert severity="error">
          <strong>Error loading {component.name}</strong>
          <br />
          {error instanceof Error ? error.message : "Unknown error occurred"}
          <br /><br />
          This component may require additional configuration or dependencies.
        </Alert>
      );
    }
  };

  const renderComponentCard = (component: any) => (
    <Card key={component.name} sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Typography variant="h6" component="h3">
            {component.name}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Chip label={component.category} color="primary" variant="outlined" size="small" />
            <Chip
              label={component.complexity}
              color={component.complexity === "High" ? "error" : component.complexity === "Medium" ? "warning" : "success"}
              variant="outlined"
              size="small"
            />
            <Button
              variant={selectedComponent === component.name ? "contained" : "outlined"}
              size="small"
              onClick={() => setSelectedComponent(selectedComponent === component.name ? null : component.name)}
            >
              {selectedComponent === component.name ? "Hide" : "Show"} Demo
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {component.description}
        </Typography>

        {selectedComponent === component.name && (
          <Box sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
            mt: 2
          }}>
            <Typography variant="subtitle2" gutterBottom>Live Component Demo:</Typography>
            <ErrorBoundary>
              {renderComponent(component)}
            </ErrorBoundary>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <ComponentPage title="@churchapps/apphelper-website - Website Components">
        <Stack spacing={4}>
          <Alert severity="info">
            <strong>Website Components from @churchapps/apphelper-website Package</strong>
            <br />
            This page demonstrates website element components that can be used to build dynamic church websites.
            More components will be added as the package is extended.
          </Alert>

          {/* Drag and Drop Testing Section */}
          <Box>
            <Typography variant="h5" gutterBottom>
              Drag & Drop Testing
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Test the draggable and droppable components used in the website editor. Drag items from the palette to the drop zones below.
            </Alert>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Simple Drag & Drop Demo
                </Typography>

                {/* Draggable Elements Palette */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Draggable Elements (drag these):
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
                    <DraggableWrapper dndType="element" elementType="text" data={{ elementType: "text" }}>
                      <Chip label="Text Element" color="primary" />
                    </DraggableWrapper>
                    <DraggableWrapper dndType="element" elementType="image" data={{ elementType: "image" }}>
                      <Chip label="Image Element" color="secondary" />
                    </DraggableWrapper>
                    <DraggableWrapper dndType="element" elementType="video" data={{ elementType: "video" }}>
                      <Chip label="Video Element" color="success" />
                    </DraggableWrapper>
                    <DraggableWrapper dndType="elementBlock" elementType="buttonLink" data={{ elementType: "buttonLink" }}>
                      <Chip label="Button Element" color="warning" />
                    </DraggableWrapper>
                  </Stack>
                </Box>

                {/* Drop Zone */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Drop Zone (drop elements here):
                  </Typography>
                  <DroppableArea
                    accept={["element", "elementBlock"]}
                    text="Drop an element here"
                    onDrop={(data) => {
                      console.log("Dropped:", data);
                      setDroppedItems([...droppedItems, { type: data.elementType, time: new Date().toISOString() }]);
                    }}
                    hideWhenInactive={false}
                  />
                </Box>

                {/* Dropped Items Display */}
                {droppedItems.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Dropped Items ({droppedItems.length}):
                    </Typography>
                    <Stack spacing={1}>
                      {droppedItems.map((item, index) => (
                        <Alert key={index} severity="success" sx={{ py: 0.5 }}>
                          <strong>{item.type}</strong> dropped at {new Date(item.time).toLocaleTimeString()}
                        </Alert>
                      ))}
                    </Stack>
                    <Button
                      size="small"
                      onClick={() => setDroppedItems([])}
                      sx={{ mt: 2 }}
                    >
                      Clear Dropped Items
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  BoxElement with Drag & Drop (Edit Mode)
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  When <code>onEdit</code> prop is provided, BoxElement shows drop zones. Drag elements from the palette above to add them to the box.
                </Alert>
                <BoxElement
                  element={{
                    id: "drag-drop-box",
                    elementType: "box",
                    sectionId: "test-section",
                    answers: {
                      background: "#f5f5f5",
                      textColor: "#333",
                      rounded: "true"
                    },
                    elements: []
                  }}
                  churchSettings={{}}
                  textColor="#333"
                  onEdit={(_section, element) => {
                    console.log("Edit element:", element);
                    setEditingElement(element);
                  }}
                  onMove={() => {
                    console.log("Element moved");
                  }}
                />
                {editingElement && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Editing element: <code>{JSON.stringify(editingElement, null, 2)}</code>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  RowElement with Drag & Drop (Edit Mode)
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  RowElement in edit mode shows drop zones in each column. Drag elements to add them to specific columns.
                </Alert>
                <RowElement
                  element={{
                    id: "drag-drop-row",
                    elementType: "row",
                    sectionId: "test-section",
                    elements: [
                      {
                        id: "col-1",
                        elementType: "column",
                        answers: { size: 6, mobileSize: 12 },
                        elements: []
                      },
                      {
                        id: "col-2",
                        elementType: "column",
                        answers: { size: 6, mobileSize: 12 },
                        elements: []
                      }
                    ]
                  }}
                  churchSettings={{}}
                  textColor="dark"
                  onEdit={(_section, element) => {
                    console.log("Edit element:", element);
                    setEditingElement(element);
                  }}
                  onMove={() => {
                    console.log("Element moved");
                  }}
                />
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Element Component with Drag & Drop (Edit Mode)
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <strong>Testing the fix for element drag/drop!</strong>
                  <br />
                  This section tests the Element component with drag/drop enabled. Hover over each element to see the drag indicator icon (top-left corner).
                  The drag handle should:
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li>Appear on hover with a dark background</li>
                    <li>Have a grab cursor</li>
                    <li>Be draggable to reorder elements</li>
                    <li>Show proper z-index (not hidden behind content)</li>
                  </ul>
                </Alert>

                <Box sx={{ border: "2px dashed #ccc", borderRadius: 1, p: 2, minHeight: 200 }}>
                  {testElements.map((element) => (
                    <Element
                      key={element.id}
                      element={element}
                      churchSettings={{}}
                      textColor="dark"
                      onEdit={(_section, el) => {
                        console.log("Edit element:", el);
                        setEditingElement(el);
                      }}
                      onMove={() => {
                        console.log("Element moved - reordering...");
                        // In a real app, this would update the backend
                      }}
                    />
                  ))}
                </Box>

                {editingElement && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Double-clicked element: <code>{editingElement.elementType}</code> (ID: {editingElement.id})
                    <Button size="small" onClick={() => setEditingElement(null)} sx={{ ml: 2 }}>
                      Clear
                    </Button>
                  </Alert>
                )}

                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>How to test:</strong>
                  <ol style={{ marginTop: 8, marginBottom: 0 }}>
                    <li>Hover over an element to see the drag indicator (top-left corner)</li>
                    <li>The icon should be visible with a dark background</li>
                    <li>Cursor should change to "grab" when hovering the icon</li>
                    <li>Drag the element by the icon to reorder (functionality may be limited in playground)</li>
                    <li>Double-click an element to trigger the edit callback</li>
                  </ol>
                </Alert>
              </CardContent>
            </Card>
          </Box>

        <Box>
          <Typography variant="h5" gutterBottom>
            Element Components (20 total)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Click "Show Demo" to see live component demonstrations with interactive examples.
          </Alert>
          {websiteComponents.map(component => renderComponentCard(component))}
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>Package Status</Typography>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>@churchapps/apphelper-website</Typography>
              <Typography variant="body2">
                • Initial package with basic components<br/>
                • Material-UI based element types<br/>
                • Designed for dynamic website building<br/>
                • Will be extended with more components
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </ComponentPage>
    </DndProvider>
  );
}
