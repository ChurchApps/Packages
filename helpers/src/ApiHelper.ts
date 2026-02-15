import { ApiConfig, RolePermissionInterface, ApiListType } from "./interfaces/index.js";
import { ErrorHelper } from "./ErrorHelper.js";

// Global singleton pattern to ensure single instance across all packages
declare global {
  interface Window {
    __CHURCHAPPS_API_HELPER__?: ApiHelperClass;
  }
  var __CHURCHAPPS_API_HELPER__: ApiHelperClass | undefined;
}

class ApiHelperClass {

  apiConfigs: ApiConfig[] = [];
  isAuthenticated = false;
  onRequest: (url:string, requestOptions:any) => void;
  onError: (url:string, requestOptions:any, error: any) => void;

  getConfig(keyName: string) {
    let result: ApiConfig = null;
    this.apiConfigs.forEach(config => { if (config.keyName === keyName) result = config; });
    //if (result === null) throw new Error("Unconfigured API: " + keyName);
    return result;
  }

  setDefaultPermissions(jwt: string) {
    this.apiConfigs.forEach(config => {
      config.jwt = jwt;
      config.permissions = [];
    });
    this.isAuthenticated = true;
  }

  setPermissions(keyName: string, jwt: string, permissions: RolePermissionInterface[]) {
    this.apiConfigs.forEach(config => {
      if (config.keyName === keyName) {
        config.jwt = jwt;
        config.permissions = permissions;
      }
    });
    this.isAuthenticated = true;
  }

  clearPermissions() {
    this.apiConfigs.forEach(config => { config.jwt = ""; config.permissions = []; });
    this.isAuthenticated = false;
  }

  async get(path: string, apiName: ApiListType) {
    const config = this.getConfig(apiName);
    if (!config) throw new Error(`API configuration not found: ${apiName}`);
    const requestOptions = { method: "GET", headers: { Authorization: "Bearer " + config.jwt } };
    return await this.fetchWithErrorHandling(config.url + path, requestOptions);
  }

  async getAnonymous(path: string, apiName: ApiListType) {
    const config = this.getConfig(apiName);
    if (!config) throw new Error(`API configuration not found: ${apiName}`);
    const requestOptions = { method: "GET" };
    return await this.fetchWithErrorHandling(config.url + path, requestOptions);
  }

  async post(path: string, data: any[] | {}, apiName: ApiListType) {
    const config = this.getConfig(apiName);
    if (!config) throw new Error(`API configuration not found: ${apiName}`);
    const requestOptions = {
      method: "POST",
      headers: { Authorization: "Bearer " + config.jwt, "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
    return await this.fetchWithErrorHandling(config.url + path, requestOptions);
  }

  async patch(path: string, data: any[] | {}, apiName: ApiListType) {
    const config = this.getConfig(apiName);
    if (!config) throw new Error(`API configuration not found: ${apiName}`);
    const requestOptions = {
      method: "PATCH",
      headers: { Authorization: "Bearer " + config.jwt, "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
    return await this.fetchWithErrorHandling(config.url + path, requestOptions);
  }

  async delete(path: string, apiName: ApiListType) {
    const config = this.getConfig(apiName);
    if (!config) throw new Error(`API configuration not found: ${apiName}`);
    const requestOptions = {
      method: "DELETE",
      headers: { Authorization: "Bearer " + config.jwt }
    };
    if (this.onRequest) this.onRequest(config.url + path, requestOptions);
    try {
      const response = await fetch(config.url + path, requestOptions);
      if (!response.ok) await this.throwApiError(response);
    } catch (e) {
      if (this.onError) this.onError(config.url + path, requestOptions, e);
      throw (e);
    }
  }

  async postAnonymous(path: string, data: any[] | {}, apiName: ApiListType) {
    const config = this.getConfig(apiName);
    if (!config) throw new Error(`API configuration not found: ${apiName}`);
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
    return await this.fetchWithErrorHandling(config.url + path, requestOptions);
  }

  async fetchWithErrorHandling(url: string, requestOptions: any) {
    if (this.onRequest) this.onRequest(url, requestOptions);
    try {
      const response = await fetch(url, requestOptions);
      if (!response.ok) await this.throwApiError(response);
      else {
        if (response.status !== 204 ) {
          return response.json();
        }
      }
    } catch (e) {
      throw (e);
    }
  }

  private async throwApiError(response: Response) {
    let msg = response.statusText;
    try {
      msg = await response.text();
    } catch {}
    try {
      const json = await response.json();
      msg = json.errors[0];
    } catch { }
    ErrorHelper.logError(response.status.toString(), response.url, msg);
    throw new Error(msg || "Error");
  }

}

// Force singleton with immediate global assignment
const getGlobalObject = () => {
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  if (typeof globalThis !== "undefined") return globalThis;
  return {};
};

// Get or create singleton immediately - FORCE SINGLE INSTANCE
const ensureSingleton = () => {
  const globalObj = getGlobalObject() as any;

  // Use a more unique key to avoid conflicts
  const SINGLETON_KEY = "__CHURCHAPPS_API_HELPER_SINGLETON__";

  if (!globalObj[SINGLETON_KEY]) {
    globalObj[SINGLETON_KEY] = new ApiHelperClass();
  }

  return globalObj[SINGLETON_KEY];
};

// Export the singleton instance
export const ApiHelper = ensureSingleton();

// Also export the class for type usage
export type { ApiHelperClass };
