import { EventInterface } from "./interfaces/index.js";

// Lazy initialization to handle both bundlers and Node.js ESM
let RRule: any = null;
let initPromise: Promise<void> | null = null;

const ensureRRule = () => {
  if (RRule) return Promise.resolve();
  if (!initPromise) {
    initPromise = import("rrule").then((mod) => {
      RRule = (mod as any).RRule ?? (mod as any).default?.RRule ?? mod;
    });
  }
  return initPromise;
};

// Synchronous getter for RRule - throws if not initialized
const getRRule = () => {
  if (!RRule) {
    throw new Error("EventHelper: RRule not initialized. Ensure ensureRRule() is called first.");
  }
  return RRule;
};

// Initialize on first use for bundlers (they process the dynamic import statically)
// The promise is created immediately to start loading
initPromise = import("rrule").then((mod) => {
  RRule = (mod as any).RRule ?? (mod as any).default?.RRule ?? mod;
}).catch(() => {
  // rrule not available - EventHelper methods will fail gracefully
});

// Define ParsedOptions as any since RRule is dynamically loaded
type ParsedOptions = any;

export class EventHelper {

  static getRange = (event:EventInterface, startDate:Date, endDate:Date) => {
    const start = new Date(event.start);
    const rrule = EventHelper.getFullRRule(event);

    const dates = rrule.between(startDate, endDate);

    dates.forEach((d: Date) => {
      d.setHours(start.getHours());
      d.setMinutes(start.getMinutes());
      d.setSeconds(start.getSeconds());
    });
    return dates;
  };

  static getFullRRule = (event:EventInterface) => {
    const RR = getRRule();
    const rrule = RR.fromString(event.recurrenceRule);
    rrule.options.dtstart = new Date(event.start);
    return rrule;
  };

  static removeExcludeDates = (events:EventInterface[]) => {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].exceptionDates?.length > 0) {
        const parsedDates = events[i].exceptionDates.map((d: string | Date)=>new Date(d).toISOString());
        if (parsedDates.indexOf(events[i].start.toISOString()) > -1) events.splice(i, 1);
      }
    }
  };

  static getPartialRRuleString = (options:ParsedOptions) => {
    const RR = getRRule();
    const parts = new RR(options).toString().split("RRULE:");
    const result = parts.length === 2 ? parts[1] : "";
    return result;
  };

  static cleanRule = (options:ParsedOptions) => {
    options.byhour = undefined;
    options.byminute = undefined;
    options.bysecond = undefined;
  };

  // Export for consumers who need to ensure initialization
  static ensureInitialized = ensureRRule;
}
