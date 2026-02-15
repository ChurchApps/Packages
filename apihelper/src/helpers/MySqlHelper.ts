export class MySqlHelper {
  static toQuotedAndCommaSeparatedString(values: string[]) {
    return values.length === 0 ? "" : "'" + values.join("','") + "'";
  }
}
