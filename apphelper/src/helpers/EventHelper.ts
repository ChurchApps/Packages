import { EventInterface } from "@churchapps/helpers";
import { RRule } from "rrule";
import { ParsedOptions } from "rrule/dist/esm/types";

export class EventHelper {

  static getRange = (event:EventInterface, startDate:Date, endDate:Date) => {
    const start = new Date(event.start!);
    const rrule = EventHelper.getFullRRule(event);

    const dates = rrule.between(startDate, endDate);

    dates.forEach(d => {
      d.setHours(start.getHours());
      d.setMinutes(start.getMinutes());
      d.setSeconds(start.getSeconds());
    });
    return dates;
  };

  static getFullRRule = (event:EventInterface) => {
    const rrule = RRule.fromString(event.recurrenceRule!);
    rrule.options.dtstart = new Date(event.start!);
    return rrule;
  };

  static removeExcludeDates = (events:EventInterface[]) => {
    for (let i = events.length - 1; i >= 0; i--) {
      if ((events[i].exceptionDates?.length ?? 0) > 0) {
        const parsedDates = events[i].exceptionDates!.map(d=>new Date(d).toISOString());
        if (parsedDates.indexOf(events[i].start!.toISOString()) > -1) events.splice(i, 1);
      }
    }
  };

  static getPartialRRuleString = (options:ParsedOptions) => {
    const parts = new RRule(options).toString().split("RRULE:");
    const result = parts.length === 2 ? parts[1] : "";
    return result;
  };

  static cleanRule = (options:ParsedOptions) => {
    options.byhour = undefined as unknown as number[];
    options.byminute = undefined as unknown as number[];
    options.bysecond = undefined as unknown as number[];
  };

}
