# High Voltage Kids Provider Data

This folder contains static data for the High Voltage Kids content provider.

## Files

- `data.json` - Static JSON containing all studies and lessons
- `list.html` - Source HTML from the membership downloads page

## How to Update data.json

### 1. Get Updated HTML

1. Log into [highvoltagekids.com](https://highvoltagekids.com)
2. Navigate to the [Membership Downloads](https://highvoltagekids.com/membership-downloads/) page
3. Scroll to the bottom of the page to trigger all lazy-loaded images
4. Save the complete HTML (Ctrl+S or right-click > Save As)
5. Replace `list.html` with the new file

### 2. Generate JSON

Run this Node.js script from the `highvoltage` folder:

```javascript
const fs = require('fs');
let html = fs.readFileSync('./list.html', 'utf-8');

// Normalize HTML by inserting newlines before each article
html = html.replace(/<article/g, '\n<article');

const items = [];
const sectionPattern = /<article class="wpgb-card[^"]*"[^>]*>([\s\S]*?)(<\/article>|<article)/g;

let sectionMatch;
while ((sectionMatch = sectionPattern.exec(html)) !== null) {
    const section = sectionMatch[1];

    // Extract image - check lazy-loaded first, then regular
    let imgMatch = section.match(/data-bg-image="url\((https:\/\/[^)]+)\)"/);
    if (!imgMatch) {
        imgMatch = section.match(/background-image: url\((https:\/\/[^)]+)\)/);
    }
    if (!imgMatch) {
        imgMatch = section.match(/src="(https:\/\/highvoltagekids\.com\/wp-content\/uploads[^"]+)"/);
    }

    // Extract title and URL
    const titleMatch = section.match(/wpgb-block-3[^>]*>.*?<a href="([^"]+)">([^<]+)<\/a>/s);

    // Extract description
    const descMatch = section.match(/wpgb-block-2[^>]*>([^<]+)<\/a>/);

    if (titleMatch && descMatch) {
        const desc = descMatch[1].trim();
        const url = titleMatch[1];
        const urlLower = url.toLowerCase();
        const descLower = desc.toLowerCase();

        // Determine lesson count from description
        const lessonMatch = desc.match(/(\d+)\s+(Elementary|Preschool)?\s*Lesson/i);
        const singleMatch = desc.match(/Single\s+(Elementary|Preschool)/i);
        let lessonCount = 1;

        if (lessonMatch) {
            lessonCount = parseInt(lessonMatch[1]);
        } else if (singleMatch) {
            lessonCount = 1;
        }

        // Determine grade level from URL or description
        let gradeLevel = 'Elementary';

        if (urlLower.includes('preschool') || descLower.includes('preschool')) {
            gradeLevel = 'Preschool';
        } else if (urlLower.includes('elementary') || descLower.includes('elementary')) {
            gradeLevel = 'Elementary';
        } else {
            // URLs ending in -2 typically indicate Elementary version
            if (urlLower.match(/-2\/?$/)) {
                gradeLevel = 'Elementary';
            } else {
                gradeLevel = 'Preschool';
            }
        }

        items.push({
            title: titleMatch[2].trim(),
            url: url,
            image: imgMatch ? imgMatch[1] : '',
            description: desc,
            lessonCount: lessonCount,
            gradeLevel: gradeLevel
        });
    }
}

// Build JSON structure
function buildCollection(name, items) {
    return {
        name: name,
        folders: items.map(item => {
            const urlParts = item.url.replace(/\/$/, '').split('/');
            const id = urlParts[urlParts.length - 1];

            const lessons = [];
            for (let i = 1; i <= item.lessonCount; i++) {
                lessons.push({
                    id: id + '-lesson-' + i,
                    name: 'Lesson ' + i,
                    image: item.image,
                    files: []
                });
            }

            return {
                id: id,
                name: item.title,
                image: item.image,
                description: item.description,
                url: item.url,
                lessonCount: item.lessonCount,
                lessons: lessons
            };
        })
    };
}

const elementary = items.filter(i => i.gradeLevel === 'Elementary');
const preschool = items.filter(i => i.gradeLevel === 'Preschool');

const data = {
    collections: [
        buildCollection('Elementary', elementary),
        buildCollection('Preschool', preschool)
    ]
};

fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));

console.log('Generated data.json');
console.log('Elementary:', elementary.length, 'studies');
console.log('Preschool:', preschool.length, 'studies');
```

Or run as a one-liner from the project root:

```bash
node -e "$(cat src/providers/highvoltage/generate.js)"
```

## Data Structure

```json
{
  "collections": [
    {
      "name": "Elementary",
      "folders": [
        {
          "id": "camp-wilderness-elementary",
          "name": "Camp Wilderness",
          "image": "https://...",
          "description": "6 Elementary Lessons From The Israelites",
          "url": "https://highvoltagekids.com/downloads/camp-wilderness-elementary/",
          "lessonCount": 6,
          "lessons": [
            { "id": "...-lesson-1", "name": "Lesson 1", "image": "...", "files": [] },
            { "id": "...-lesson-2", "name": "Lesson 2", "image": "...", "files": [] }
          ]
        }
      ]
    },
    {
      "name": "Preschool",
      "folders": [...]
    }
  ]
}
```

## Notes

- Images use the parent study's image for all lesson folders
- The `files` array is empty - actual files would need to be fetched from individual download pages
- Grade level detection uses URL patterns (`-elementary`, `-preschool`, `-2` suffix)
- Lesson count is parsed from the description text (e.g., "6 Elementary Lessons...")
