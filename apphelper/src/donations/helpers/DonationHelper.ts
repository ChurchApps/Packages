export class DonationHelper {

  static getInterval(intervalName:string) {
    let intervalCount = 1;
    let intervalType = "month";
    if (!intervalName) return { interval_count: intervalCount, interval: intervalType };
    const parts = intervalName.split("_");
    if (parts.length === 2) {
      switch (parts[0]) {
        case "two": intervalCount = 2; break;
        case "three": intervalCount = 3; break;
      }
      intervalType = parts[1];
    }
    const result = { interval_count: intervalCount, interval: intervalType };
    return result;
  }

  static getIntervalKeyName(intervalCount: number, intervalType: string) {
    let firstPart = "one";
    if (intervalCount === 2) firstPart = "two";
    else if (intervalCount === 3) firstPart = "three";
    return firstPart + "_" + intervalType;
  }

  static normalizeProvider(provider: string): string {
    return provider?.toLowerCase() || "";
  }

  static isProvider(provider: string, expectedProvider: string): boolean {
    return this.normalizeProvider(provider) === this.normalizeProvider(expectedProvider);
  }

  static findGatewayByProvider(gateways: any[], provider: string): any {
    return gateways.find(g => this.isProvider(g.provider, provider));
  }

}
