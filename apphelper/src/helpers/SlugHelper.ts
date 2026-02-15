import slug from "slug";

export class SlugHelper {

  static slugifyString(string: string, type: "urlPath" | "urlSlug", removeCharacters?: string[]) {
    const charactersToRemove = removeCharacters ? removeCharacters : [
      "for", "and", "nor", "but", "or", "yet", "so", "the", "a", "an"
    ];
    const characStr = charactersToRemove.join("|");
    if (type === "urlPath") {
      slug.extend({ "/": "/" }); //To keep '/' in the url since it's a special character.
    }
    const initialSlug = slug(string, { remove: new RegExp("\\b(" + characStr + ")\\b", "gi") });
    const verfiedSlug = this.numerifySlug(initialSlug);
    return verfiedSlug;
  }

  //remove long sequences of single-digit numbers (e.g., 1-2-3-4 becomes 1), but preserve normal number patterns
  static numerifySlug(slug: string) {
    let initialString = slug;
    // Only match sequences of 3+ single-digit numbers separated by hyphens (e.g., 1-2-3, 1-2-3-4)
    // This avoids mangling things like chapter-verse references (6-11) or dates
    const regex = /\b(\d)-(\d)-(\d)(?:-\d)*\b/g;
    initialString = initialString.replace(regex, "$1");

    return initialString;
  }

}
