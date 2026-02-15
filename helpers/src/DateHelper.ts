import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(customParseFormat);

export class DateHelper {

  //Fixes timezone issues when you just need the date.
  static toDate(input: any) {
    const str = input.toString();
    // Check if it's a YYYY-MM-DD format (HTML5 date input)
    const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      // Parse as local date at noon to avoid timezone issues
      const [, year, month, day] = dateOnlyMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    }
    // For other formats, use existing behavior
    return new Date(Date.parse(str.replace("Z", "")));
  }

  static toDateTime(input: any) {
    return new Date(Date.parse(input.toString()));
  }

  //obsolete.  Do not use
  static convertToDate(input: any) {
    return this.toDateTime(input);
  }

  static addDays(date: Date, days: number) {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }

  static prettyDate(date: Date) {
    if (date === undefined || date === null) return "";
    return this.formatDateTime(date, "MMM d, yyyy");
  }

  static prettyDateTime(date: Date) {
    if (date === undefined || date === null) return "";
    return this.formatDateTime(date, "MMM d, yyyy h:mm a");
  }

  static prettyTime(date: Date) {
    if (date === undefined || date === null) return "";
    return this.formatDateTime(date, "h:mm a");
  }

  static getLastSunday() {
    const result = new Date();
    while (result.getDay() !== 0) result.setDate(result.getDate() - 1);
    return result;
  }

  static getNextSunday() {
    const result = this.getLastSunday();
    result.setDate(result.getDate() + 7);
    return result;
  }

  static getWeekSunday(year: number, week: number) {
    const result = new Date(year, 0, 1);
    while (result.getDay() !== 0) result.setDate(result.getDate() + 1);
    result.setDate(result.getDate() + ((week - 1) * 7));
    return result;
  }

  static formatHtml5Date(date: Date | string | null | undefined): string {
    if (!date) return "";

    // If already a YYYY-MM-DD string, return as-is
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

    // If ISO string, extract date portion (ignore timezone)
    if (typeof date === "string") {
      const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }

    // For Date objects, use LOCAL year/month/day (not UTC)
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // For DATE-only fields - preserves calendar date without timezone conversion
  static toMysqlDateOnly(date: Date | string | null | undefined): string | null {
    if (date === null || date === undefined) return null;

    if (typeof date === "string") {
      const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  static formatHtml5Time(time: Date): string {
    if (time === undefined || time === null) return "";
    const h = time.getHours();
    const m = time.getMinutes();
    const s = time.getSeconds();
    return `${h < 10 ? ("0" + h) : h}:${m < 10 ? ("0" + m) : m}:${s < 10 ? ("0" + s) : s}`;
  }

  static formatHtml5DateTime(date: Date): string {
    if (date === undefined || date === null) return "";
    else {
      return this.formatDateTime(date, "yyyy-MM-dd") + "T" + this.formatDateTime(date, "HH:mm");
    }
  }

  static getDisplayDuration(d: Date): string {
    const seconds = Math.round((new Date().getTime() - d.getTime()) / 1000);
    if (seconds > 86400) {
      const days = Math.floor(seconds / 86400);
      return (days === 1) ? "1d" : days.toString() + "d";
    } else if (seconds > 3600) {
      const hours = Math.floor(seconds / 3600);
      return (hours === 1) ? "1h" : hours.toString() + "h";
    } else if (seconds > 60) {
      const minutes = Math.floor(seconds / 60);
      return (minutes === 1) ? "1m" : minutes.toString() + "m";
    } else return (seconds === 1) ? "1s" : Math.floor(seconds).toString() + "s";
  }

  static getShortDate(d: Date): string {
    return (d.getMonth() + 1).toString() + "/" + (d.getDate()).toString() + "/" + d.getFullYear().toString();
  }

  static convertDatePickerFormat(d: Date): Date {
    const date = this.formatHtml5Date(d).split("-");
    if (date.length === 3) return new Date(`${date[1]}-${date[2]}-${date[0]}`);
    return new Date();
  }

  private static formatDateTime(date: Date, format: string) {
    try {
      // Convert date-fns format to dayjs format
      const dayjsFormat = format
        .replace(/yyyy/g, "YYYY")
        .replace(/yy/g, "YY")
        .replace(/d/g, "D")
        .replace(/DD/g, "DD")
        .replace(/a/g, "A");

      return dayjs(date).format(dayjsFormat);
    } catch { return ""; }
  }

  public static toMysqlDate(d: Date) {
    if (d === null || d === undefined) {
      return undefined;
    }
    return dayjs(d).format("YYYY-MM-DD HH:mm:ss");
  }

  public static subtractHoursFromNow(hour: number) {
    const now = new Date();
    return new Date(now.setHours(now.getHours() - hour));
  }

  public static toUTCDate(d: Date) {
    return dayjs(d).utc().format("YYYY-MM-DD HH:mm:ss");
  }

}
