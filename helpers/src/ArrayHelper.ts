import { UniqueIdHelper } from "./UniqueIdHelper.js";

export class ArrayHelper {
  static getIds(array: any[], propertyName: string) {
    const result: string[] = [];
    for (const item of array) {
      const id = item[propertyName]?.toString();
      if (!UniqueIdHelper.isMissing(id) && result.indexOf(id) === -1) result.push(id);
    }
    return result;
  }

  static sortBy(array: any[], propertyName: string, descending: boolean = false) {
    array.sort((a, b) => {
      const valA = a[propertyName];
      const valB = b[propertyName];
      if (valA < valB) return descending ? 1 : -1;
      else return descending ? -1 : 1;
    });
  }

  static getIndex(array: any[], propertyName: string, value: any) {
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      if (ArrayHelper.compare(item, propertyName, value)) return i;
    }
    return -1;
  }

  static getOne(array: any[], propertyName: string, value: any) {
    for (const item of array || []) if (ArrayHelper.compare(item, propertyName, value)) return item;
    return null;
  }

  static getAll(array: any[], propertyName: string, value: any) {
    const result: any[] = [];
    for (const item of array || []) {
      if (ArrayHelper.compare(item, propertyName, value)) result.push(item);
    }
    return result;
  }

  static getAllArray(array: any[], propertyName: string, values: any[]) {
    const result: any[] = [];
    for (const item of array || []) if (values.indexOf(item[propertyName]) > -1) result.push(item);
    return result;
  }

  private static compare(item: any, propertyName: string, value: any) {
    const propChain = propertyName.split(".");
    if (propChain.length === 1) return item[propertyName] === value;
    else {
      let obj = item;
      for (let i = 0; i < propChain.length - 1; i++) {
        if (obj && obj[propChain[i]] !== undefined) obj = obj[propChain[i]];
        else return false;
      }
      return obj[propChain[propChain.length - 1]] === value;
    }
  }

  static getUniqueValues(array: any[], propertyName: string) {
    const result: any[] = [];

    for (const item of array) {
      const val = (propertyName.indexOf(".") === -1) ? item[propertyName] : this.getDeepValue(item, propertyName);
      if (result.indexOf(val) === -1) result.push(val);
    }
    return result;
  }

  static getUnique(array: any[]) {
    const result: any[] = [];
    const jsonList: string[] = [];
    for (const item of array) {
      const json = JSON.stringify(item);
      if (jsonList.indexOf(json) === -1) {
        result.push(item);
        jsonList.push(json);
      }
    }
    return result;
  }

  static getAllOperatorArray(array: any[], propertyName: string, values: any[], operator: string, dataType = "string") {
    const result: any[] = [];
    values.forEach(v => {
      const filtered = this.getAllOperator(array, propertyName, v, operator.replace("notIn", "notEqual").replace("in", "equals").replace("donatedToAny", "equals").replace("donatedTo", "equals").replace("attendedCampus", "equals").replace("attendedAny", "equals").replace("attendedServiceTime", "equals").replace("attendedService", "equals").replace("attendedGroup", "equals"), dataType);
      filtered.forEach(f => result.push(f));
    });
    return result;
  }

  static getAllOperator(array: any[], propertyName: string, value: any, operator: string, dataType = "string") {
    const result: any[] = [];
    for (const item of array) {


      let propVal = item[propertyName] || "";
      let compVal = value || "";
      if (dataType === "number") {
        propVal = parseFloat(propVal);
        compVal = parseFloat(compVal);
      } else if (dataType === "string") {
        propVal = propVal.toLowerCase();
        compVal = compVal.toLowerCase();
      }

      switch (operator) {
        case "equals": if (propVal === compVal) result.push(item); break;
        case "startsWith": if (propVal.indexOf(compVal) === 0) result.push(item); break;
        case "endsWith": if (propVal.indexOf(compVal) === propVal.length - compVal.length) result.push(item); break;
        case "contains": if (propVal.indexOf(compVal) > -1) result.push(item); break;
        case "greaterThan": if (propVal > compVal) result.push(item); break;
        case "greaterThanEqual": if (propVal >= compVal) result.push(item); break;
        case "lessThan": if (propVal < compVal) result.push(item); break;
        case "lessThanEqual": if (propVal <= compVal) result.push(item); break;
        case "notEqual": if (propVal !== compVal) result.push(item); break;
      }
    }
    return result;
  }

  static getDeepValue(item: any, propertyName: string) {
    const propertyNames = propertyName.split(".");
    let result: any = item;
    propertyNames.forEach(name => {
      if (result != null) result = result[name];
    });
    return result;
  }

  static fillArray(contents: string, length: number) {
    const result = [];
    for (let i = 0; i < length; i++) result.push(contents);
    return result;
  }

}
