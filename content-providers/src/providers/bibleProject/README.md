# BibleProject Provider

This provider serves video content from [BibleProject](https://bibleproject.com/downloads/).

## Files

- `BibleProjectProvider.ts` - The provider implementation
- `data.json` - Static JSON file containing all video data
- `index.ts` - Re-exports the provider

## Rebuilding data.json

The `data.json` file contains all video metadata extracted from the BibleProject downloads page. To rebuild it:

### Step 1: Download the HTML

```bash
curl -s "https://bibleproject.com/downloads/" -o downloads.html
```

### Step 2: Extract video links

```bash
grep -oE 'href="/d/\?url=https%3A%2F%2Fstream\.mux\.com%2F[A-Za-z0-9]+%2Fhigh\.mp4[^"]*filename=[^"]+\.mp4"' downloads.html > video_links.txt
```

### Step 3: Run the generator script

Create a file called `generate_data.js`:

```javascript
const fs = require('fs');

const videoLinks = fs.readFileSync('video_links.txt', 'utf8');
const lines = videoLinks.trim().split('\n');
const videos = [];

for (const line of lines) {
  const muxMatch = line.match(/stream\.mux\.com%2F([A-Za-z0-9]+)%2Fhigh/);
  const filenameMatch = line.match(/filename=([^"]+)\.mp4/);

  if (muxMatch && filenameMatch) {
    const muxId = muxMatch[1];
    const filename = filenameMatch[1];
    const title = filenameToTitle(filename);
    const category = categorizeByFilename(filename.toLowerCase());

    videos.push({
      id: `bp-${muxId.substring(0, 8)}`,
      title,
      filename,
      muxPlaybackId: muxId,
      videoUrl: `https://stream.mux.com/${muxId}/high.mp4`,
      category
    });
  }
}

function filenameToTitle(filename) {
  return filename
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function categorizeByFilename(filename) {
  // Sermon on the Mount
  if (filename.includes('sotm') || filename.includes('beatitudes') ||
      filename.includes('lords-prayer') || filename.includes('wealth-and-worry') ||
      filename.includes('warnings-about-religious')) {
    if (filename.includes('visual') || filename.includes('vc-')) {
      return 'Sermon on the Mount Visual Commentaries';
    }
    return 'Sermon on the Mount';
  }

  // How to Read the Bible
  if (filename.includes('how-to-read') || filename.includes('literary-styles') ||
      filename.includes('design-patterns') || filename.includes('metaphor-in-biblical') ||
      filename.includes('what-is-the-bible') || filename.includes('story-of-the-bible') ||
      filename.includes('ancient-jewish-meditation') || filename.includes('plot') ||
      filename.includes('setting') || filename.includes('poetry') || filename.includes('poetic-metaphor') ||
      filename.includes('the-prophets') || filename.includes('books-of-solomon') ||
      filename.includes('the-gospel') || filename.includes('parables-of-jesus') ||
      filename.includes('apocalyptic-literature') || filename.includes('bible-basics')) {
    return 'How to Read the Bible';
  }

  // Streetlights Remix
  if (filename.includes('streetlights-remix')) {
    return 'Streetlights Remix';
  }

  // Word Studies
  if (filename.includes('word-study') || filename.includes('word-studies') ||
      filename.includes('shalom') || filename.includes('yakhal') || filename.includes('nephesh') ||
      filename.includes('ahava') || filename.includes('kavod') || filename.includes('chara') ||
      filename.includes('euangelion') || filename.includes('martus') || filename.includes('agape') ||
      filename.includes('khata') || filename.includes('pesha') || filename.includes('avon') ||
      filename.includes('yhwh') || filename.includes('lev-') || filename.includes('meod')) {
    return 'Word Studies';
  }

  // Character of God
  if (filename.includes('character-of-god') || filename.includes('slow-to-anger') ||
      filename.includes('compassion') || filename.includes('gracious-and-compassionate') ||
      filename.includes('loyal-love') || filename.includes('faithful') ||
      filename.includes('grace') || filename.includes('elohim')) {
    return 'Character of God';
  }

  // Luke-Acts
  if (filename.includes('luke-acts') || filename.includes('lukeacts')) {
    return 'Luke-Acts';
  }

  // Spiritual Beings
  if (filename.includes('spiritual-beings') || filename.includes('angels-and-cherubim') ||
      filename.includes('angel-of-the-lord') || filename.includes('divine-council') ||
      filename.includes('the-satan') || filename.includes('demons-and')) {
    return 'Spiritual Beings';
  }

  // Royal Priesthood
  if (filename.includes('royal-priesthood') || filename.includes('priests-of-eden') ||
      filename.includes('abraham-and-melchizedek') || filename.includes('moses-and-aaron') ||
      filename.includes('david-the-priestly') || filename.includes('jesus-the-royal-priest')) {
    return 'Royal Priesthood';
  }

  // Passover
  if (filename.includes('passover')) {
    return 'Passover';
  }

  // Advent
  if (filename.includes('advent')) {
    return 'Advent';
  }

  // Creation
  if (filename.includes('creation') && !filename.includes('new-creation')) {
    return 'Creation';
  }

  // Wisdom Series
  if (filename.includes('wisdom-series') || filename.includes('tree-of-life')) {
    return 'Wisdom';
  }

  // The Shema
  if (filename.includes('shema')) {
    return 'The Shema';
  }

  // Torah Series
  if (filename.includes('torah-series') || (filename.includes('the-law') && !filename.includes('lawless'))) {
    return 'Torah';
  }

  // Deuterocanon / Apocrypha
  if (filename.includes('deuterocanon') || filename.includes('apocrypha') || filename.includes('tobit') ||
      filename.includes('judith') || filename.includes('maccabees') || filename.includes('sirach') ||
      filename.includes('baruch') || filename.includes('wisdom-of-solomon') || filename.includes('additions-to') ||
      filename.includes('letter-of-jeremiah') || filename.includes('bel-and-the-dragon') ||
      filename.includes('prayer-of-azariah') || filename.includes('susanna')) {
    return 'Deuterocanon';
  }

  // Family of God
  if (filename.includes('family-of-god') || filename.includes('son-of-god') ||
      filename.includes('image-of-god') || filename.includes('sons-of-god') ||
      filename.includes('new-humanity')) {
    return 'Family of God';
  }

  // Heaven and Earth
  if (filename.includes('heaven-and-earth') || filename.includes('heaven-earth') ||
      filename.includes('temple') || filename.includes('sacred-space')) {
    return 'Heaven and Earth';
  }

  // Paradigm
  if (filename.includes('paradigm')) {
    return 'Paradigm';
  }

  // Insights
  if (filename.includes('insight')) {
    return 'Insights';
  }

  // Old Testament Overviews
  if (filename.includes('tanak') || filename.includes('genesis') || filename.includes('exodus') ||
      filename.includes('leviticus') || filename.includes('numbers') || filename.includes('deuteronomy') ||
      filename.includes('joshua') || filename.includes('judges') || filename.includes('ruth') ||
      filename.includes('samuel') || filename.includes('kings') || filename.includes('chronicles') ||
      filename.includes('ezra') || filename.includes('nehemiah') || filename.includes('esther') ||
      filename.includes('job') || filename.includes('psalm') || filename.includes('proverbs') ||
      filename.includes('ecclesiastes') || filename.includes('song-of') || filename.includes('isaiah') ||
      filename.includes('jeremiah') || filename.includes('lamentations') || filename.includes('ezekiel') ||
      filename.includes('daniel') || filename.includes('hosea') || filename.includes('joel') ||
      filename.includes('amos') || filename.includes('obadiah') || filename.includes('jonah') ||
      filename.includes('micah') || filename.includes('nahum') || filename.includes('habakkuk') ||
      filename.includes('zephaniah') || filename.includes('haggai') || filename.includes('zechariah') ||
      filename.includes('malachi')) {
    return 'Old Testament Overviews';
  }

  // New Testament Overviews
  if (filename.includes('new-testament') || filename.includes('matthew') || filename.includes('mark') ||
      filename.includes('luke') || filename.includes('john') || filename.includes('acts') ||
      filename.includes('romans') || filename.includes('corinthians') || filename.includes('galatians') ||
      filename.includes('ephesians') || filename.includes('philippians') || filename.includes('colossians') ||
      filename.includes('thessalonians') || filename.includes('timothy') || filename.includes('titus') ||
      filename.includes('philemon') || filename.includes('hebrews') || filename.includes('james') ||
      filename.includes('peter') || filename.includes('jude') || filename.includes('revelation')) {
    return 'New Testament Overviews';
  }

  // Default to Biblical Themes
  return 'Biblical Themes';
}

// Group videos by category
const collections = {};
for (const video of videos) {
  if (!collections[video.category]) {
    collections[video.category] = [];
  }
  const { category, ...videoData } = video;
  collections[video.category].push(videoData);
}

// Collection images
const collectionImages = {
  'Old Testament Overviews': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/old-testament-overviews/tr:q-65,w-300/ot-overviews_16.9.jpg',
  'New Testament Overviews': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/new-testament-overviews/tr:q-65,w-300/nt-overviews_16.9.jpg',
  'Biblical Themes': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/themes/tr:q-65,w-300/themes_16.9.jpg',
  'Sermon on the Mount': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/sermon-on-the-mount/tr:q-65,w-300/sotm_16.9.jpg',
  'Sermon on the Mount Visual Commentaries': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/sermon-on-the-mount-visual-commentaries/tr:q-65,w-300/sotm-vc_16.9.jpg',
  'How to Read the Bible': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/how-to-read-the-bible/tr:q-65,w-300/httr_16.9.jpg',
  'Insights': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/insights/tr:q-65,w-300/insights_16.9.jpg',
  'Spiritual Beings': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/spiritual-beings/tr:q-65,w-300/spiritual-beings_16.9.jpg',
  'Royal Priesthood': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/royal-priesthood/tr:q-65,w-300/royal-priesthood_16.9.jpg',
  'Creation': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/creation/tr:q-65,w-300/creation_16.9.jpg',
  'Character of God': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/character-of-god/tr:q-65,w-300/character-of-god_16.9.jpg',
  'Word Studies': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/word-studies/tr:q-65,w-300/word-studies_16.9.jpg',
  'Advent': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/advent/tr:q-65,w-300/advent_16.9.jpg',
  'Passover': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/passover/tr:q-65,w-300/passover_16.9.jpg',
  'Luke-Acts': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/luke-acts/tr:q-65,w-300/luke-acts_16.9.jpg',
  'Wisdom': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/wisdom/tr:q-65,w-300/wisdom_16.9.jpg',
  'The Shema': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/shema/tr:q-65,w-300/shema_16.9.jpg',
  'Torah': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/torah/tr:q-65,w-300/torah_16.9.jpg',
  'Deuterocanon': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/deuterocanon/tr:q-65,w-300/deuterocanon_16.9.jpg',
  'Family of God': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/family-of-god/tr:q-65,w-300/family-of-god_16.9.jpg',
  'Heaven and Earth': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/heaven-and-earth/tr:q-65,w-300/heaven-and-earth_16.9.jpg',
  'Paradigm': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/paradigm/tr:q-65,w-300/paradigm_16.9.jpg',
  'Streetlights Remix': 'https://ik.imagekit.io/bpweb1/web/media/video-collection-images/streetlights-remix/tr:q-65,w-300/streetlights-remix_16.9.jpg'
};

// Build final output
const output = {
  collections: Object.entries(collections).map(([name, videos]) => ({
    name,
    image: collectionImages[name] || null,
    videos
  })).filter(c => c.videos.length > 0)
};

// Print summary
console.log('Collections found:');
for (const collection of output.collections) {
  console.log(`  ${collection.name}: ${collection.videos.length} videos`);
}
console.log(`\nTotal: ${videos.length} videos in ${output.collections.length} collections`);

// Write JSON file
fs.writeFileSync('data.json', JSON.stringify(output, null, 2));
console.log('\nJSON file written to data.json');
```

Then run:

```bash
node generate_data.js
```

### Step 4: Verify and copy

Review the output summary to ensure all collections look correct, then copy `data.json` to this folder.

## Adding New Collections

If BibleProject adds new video series:

1. Rebuild the JSON following the steps above
2. Add new categorization rules to `categorizeByFilename()` if needed
3. Add the collection image URL to `collectionImages` object

## Data Structure

The `data.json` file has this structure:

```json
{
  "collections": [
    {
      "name": "Collection Name",
      "image": "https://...",
      "videos": [
        {
          "id": "bp-xxxxxxxx",
          "title": "Video Title",
          "filename": "video-filename",
          "muxPlaybackId": "...",
          "videoUrl": "https://stream.mux.com/.../high.mp4"
        }
      ]
    }
  ]
}
```
