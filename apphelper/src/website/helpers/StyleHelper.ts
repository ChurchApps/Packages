
import { ElementInterface, SectionInterface } from "./index";

export class StyleHelper {

  static getTokenVariable(tokenName: string): string {
    if (!tokenName) return "";
    if (tokenName.startsWith("var(--")) return tokenName;
    return `var(--${tokenName})`;
  }

  static getAvailableTokens(): {
    colors: string[];
    spacing: string[];
    typography: string[];
    borderRadius: string[];
    } {
    return {
      colors: [
        "light",
        "lightAccent",
        "accent",
        "darkAccent",
        "dark",
        "primary",
        "secondary",
        "success",
        "warning",
        "error"
      ],
      spacing: ["spacing-xs", "spacing-sm", "spacing-md", "spacing-lg", "spacing-xl", "spacing-xxl"],
      typography: ["font-heading", "font-body", "font-size-base", "font-scale", "line-height"],
      borderRadius: ["radius-none", "radius-sm", "radius-md", "radius-lg", "radius-full"]
    };
  }

  static isTokenValue(value: string): boolean {
    if (!value) return false;
    if (value.startsWith("var(--")) return true;
    const tokens = this.getAvailableTokens();
    const allTokens = [
      ...tokens.colors,
      ...tokens.spacing,
      ...tokens.typography,
      ...tokens.borderRadius
    ];
    return allTokens.includes(value);
  }

  static getTextColor = (textColor:string, globalStyles:any, _churchSettings?:any) => {
    if (!textColor) textColor = "#FFF";
    if (textColor.indexOf("var(--") > -1) {
      if (globalStyles.palette) {
        const palette = JSON.parse(globalStyles.palette);
        textColor = textColor.replace("var(--", "").replace(")", "");
        textColor = palette[textColor];
      } else {
        textColor = "light";
        if (textColor.indexOf("dark") > -1 || textColor.indexOf("darkAccent") > -1 || textColor.indexOf("accent") > -1) textColor = "dark";
      }
      if (!textColor) textColor = "#FFF";
    }
    return textColor;
  };

  private static getStyle = (id:string, styles:Record<string, string>) => {
    const result:string[] = [];
    Object.keys(styles).forEach((key:string) => {
      const val = styles[key];
      const noQuote = val.endsWith("px") || val.endsWith("em") || val.endsWith("pt") || val.startsWith("#") || val.startsWith("--");
      if (noQuote) result.push(`${key}: ${styles[key]};`);
      else result.push(`${key}: ${styles[key]};`);
    });
    if (result.length > 0) return `#${id} { ${result.join(" ")} }`;
  };

  private static getSectionCss = (section:SectionInterface, all:string[], desktop:string[], mobile:string[]) => {
    const id = (section.answers?.sectionId) ? "section-" + section.answers?.sectionId : "section-" + section.id;
    if (id === "section-undefined") return;

    const styleAll = section.styles?.all ? this.getStyle(id, section.styles.all) : undefined;
    const styleDesktop = section.styles?.desktop ? this.getStyle(id, section.styles.desktop) : undefined;
    const styleMobile = section.styles?.mobile ? this.getStyle(id, section.styles.mobile) : undefined;

    if (styleAll) all.push(styleAll);
    if (styleDesktop) desktop.push(styleDesktop);
    if (styleMobile) mobile.push(styleMobile);
  };

  private static getElementCss = (element:ElementInterface, all:string[], desktop:string[], mobile:string[]) => {
    if (!element.id) return;

    const styleAll = element.styles?.all ? this.getStyle("el-" + element.id, element.styles.all) : undefined;
    const styleDesktop = element.styles?.desktop ? this.getStyle("el-" + element.id, element.styles.desktop) : undefined;
    const styleMobile = element.styles?.mobile ? this.getStyle("el-" + element.id, element.styles.mobile) : undefined;

    if (styleAll) all.push(styleAll);
    if (styleDesktop) desktop.push(styleDesktop);
    if (styleMobile) mobile.push(styleMobile);

    if (element.elements && element.elements.length > 0) {
      element.elements.forEach((e:ElementInterface) => this.getElementCss(e, all, desktop, mobile));
    }
  };

  static getAllStyles = (sections: SectionInterface[]) => {
    const all:string[] = [];
    const desktop:string[] = [];
    const mobile:string[] = [];

    sections?.forEach((section:SectionInterface) => {
      this.getSectionCss(section, all, desktop, mobile);
      section.elements?.forEach((element:ElementInterface) => {
        this.getElementCss(element, all, desktop, mobile);
      });
    });

    return { all, desktop, mobile };
  };

  // Class-based to hide when element types render no el-{id} or sections lose ids.
  private static getVisibilityCss = (forceDevice?:string) => {
    const desktopRule = ".hiddenOnDesktop { display: none !important; }";
    const mobileRule = ".hiddenOnMobile { display: none !important; }";
    if (forceDevice === "desktop") return desktopRule;
    if (forceDevice === "mobile") return mobileRule;
    return `@media (min-width: 768px) { ${desktopRule} }
      @media (max-width: 767px) { ${mobileRule} }`;
  };

  static getCss = (sections: SectionInterface[], forceDevice?:string) => {
    const { all, desktop, mobile } = this.getAllStyles(sections);
    if (forceDevice === "desktop") return all.join("\n") + "\n" + desktop.join("\n") + "\n" + this.getVisibilityCss(forceDevice);
    else if (forceDevice === "mobile") return all.join("\n") + "\n" + mobile.join("\n") + "\n" + this.getVisibilityCss(forceDevice);
    else {
      return `
      ${all.join("\n")}
      @media (min-width: 768px) {
        ${desktop.join("\n")}
      }
      @media (max-width: 767px) {
        ${mobile.join("\n")}
      }
      ${this.getVisibilityCss()}`;
    }
  };


  static getStyles = (_element: ElementInterface | SectionInterface) => {
    const result:any = {};
    /*
    if (element.styles && Object.keys(element.styles).length > 0) {
      Object.keys(element.styles).forEach((platformKey) => {
        const platform:any = element.styles[platformKey];
        Object.keys(platform).forEach((key) => {
          const parts = key.split("-");
          const camelCase = parts[0] + parts.slice(1).map((x) => x[0].toUpperCase() + x.slice(1)).join("");
          const option = allStyleOptions.find((x) => x.key === key);

          switch (option.type) {
            case "px":
              result[camelCase] = parseFloat(element.styles[key]);
              break;
            default:
              result[camelCase] = element.styles[key];
              break;
          }
        });

      });


    }
    */

    return result;

  };

}
