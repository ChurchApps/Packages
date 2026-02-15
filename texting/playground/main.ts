import { getProvider, getProviderInfo, type TextingProviderConfig, type ITextingProvider, type ProviderInfo } from "../src";

// Elements
const providerSelect = document.getElementById("provider-select") as HTMLSelectElement;
const providerHelp = document.getElementById("provider-help") as HTMLDivElement;
const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const apiSecretInput = document.getElementById("api-secret") as HTMLInputElement;
const apiSecretGroup = document.getElementById("api-secret-group") as HTMLDivElement;
const validateBtn = document.getElementById("validate-btn") as HTMLButtonElement;
const validateResult = document.getElementById("validate-result") as HTMLDivElement;

const phoneInput = document.getElementById("phone-number") as HTMLInputElement;
const messageInput = document.getElementById("message") as HTMLTextAreaElement;
const charCountEl = document.getElementById("char-count") as HTMLSpanElement;
const segmentCountEl = document.getElementById("segment-count") as HTMLSpanElement;
const segmentPluralEl = document.getElementById("segment-plural") as HTMLSpanElement;
const sendBtn = document.getElementById("send-btn") as HTMLButtonElement;
const sendResult = document.getElementById("send-result") as HTMLDivElement;

const bulkPhonesInput = document.getElementById("bulk-phones") as HTMLTextAreaElement;
const bulkMessageInput = document.getElementById("bulk-message") as HTMLTextAreaElement;
const bulkSendBtn = document.getElementById("bulk-send-btn") as HTMLButtonElement;
const bulkResult = document.getElementById("bulk-result") as HTMLDivElement;

const logEl = document.getElementById("log") as HTMLDivElement;
const clearLogBtn = document.getElementById("clear-log-btn") as HTMLButtonElement;

// State
let currentProvider: ITextingProvider | null = null;
let currentProviderInfo: ProviderInfo | null = null;
let providers: ProviderInfo[] = [];

function log(msg: string, type: "info" | "success" | "error" = "info") {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${time}] ${msg}`;
  logEl.prepend(entry);
}

function showResult(el: HTMLDivElement, message: string, success: boolean) {
  el.textContent = message;
  el.className = `result ${success ? "result-success" : "result-error"}`;
  el.classList.remove("hidden");
}

function getConfig(): TextingProviderConfig {
  return {
    churchId: "playground",
    apiKey: apiKeyInput.value.trim(),
    apiSecret: apiSecretInput.value.trim(),
  };
}

function updateSendButtons() {
  const hasProvider = !!currentProvider;
  const hasKey = apiKeyInput.value.trim().length > 0;
  validateBtn.disabled = !hasProvider || !hasKey;
  sendBtn.disabled = !hasProvider || !hasKey || !phoneInput.value.trim() || !messageInput.value.trim();
  bulkSendBtn.disabled = !hasProvider || !hasKey || !bulkPhonesInput.value.trim() || !bulkMessageInput.value.trim();
}

function updateCharCount() {
  const len = messageInput.value.length;
  charCountEl.textContent = len.toString();
  const segments = len <= 160 ? 1 : Math.ceil(len / 153);
  segmentCountEl.textContent = segments.toString();
  segmentPluralEl.textContent = segments !== 1 ? "s" : "";
}

// Populate provider select
function init() {
  providers = getProviderInfo();
  providers.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    providerSelect.appendChild(opt);
  });

  log(`Loaded ${providers.length} provider(s): ${providers.map((p) => p.name).join(", ")}`);
}

// Event: provider changed
providerSelect.addEventListener("change", () => {
  const id = providerSelect.value;
  validateResult.classList.add("hidden");

  if (!id) {
    currentProvider = null;
    currentProviderInfo = null;
    providerHelp.classList.add("hidden");
    apiSecretGroup.classList.add("hidden");
    updateSendButtons();
    return;
  }

  currentProvider = getProvider(id);
  currentProviderInfo = providers.find((p) => p.id === id) || null;

  if (currentProviderInfo) {
    const link = currentProviderInfo.settingsUrl
      ? `<a href="${currentProviderInfo.settingsUrl}" target="_blank" rel="noopener noreferrer">${currentProviderInfo.settingsUrl}</a>`
      : "";
    providerHelp.innerHTML = `${currentProviderInfo.helpText}${link ? "<br/>" + link : ""}`;
    providerHelp.classList.remove("hidden");

    if (currentProviderInfo.requiresSecret) {
      apiSecretGroup.classList.remove("hidden");
    } else {
      apiSecretGroup.classList.add("hidden");
      apiSecretInput.value = "";
    }
  }

  log(`Selected provider: ${currentProvider.name}`);
  updateSendButtons();
});

// Event: inputs changed
apiKeyInput.addEventListener("input", updateSendButtons);
apiSecretInput.addEventListener("input", updateSendButtons);
phoneInput.addEventListener("input", updateSendButtons);
messageInput.addEventListener("input", () => { updateCharCount(); updateSendButtons(); });
bulkPhonesInput.addEventListener("input", updateSendButtons);
bulkMessageInput.addEventListener("input", updateSendButtons);

// Event: validate
validateBtn.addEventListener("click", async () => {
  if (!currentProvider) return;
  validateBtn.disabled = true;
  validateBtn.textContent = "Validating...";
  log(`Validating credentials for ${currentProvider.name}...`);

  try {
    const valid = await currentProvider.validateCredentials(getConfig());
    showResult(validateResult, valid ? "Credentials are valid!" : "Credentials are invalid.", valid);
    log(valid ? "Credentials valid" : "Credentials invalid", valid ? "success" : "error");
  } catch (err: any) {
    showResult(validateResult, `Error: ${err.message}`, false);
    log(`Validation error: ${err.message}`, "error");
  } finally {
    validateBtn.disabled = false;
    validateBtn.textContent = "Validate Credentials";
  }
});

// Event: send single
sendBtn.addEventListener("click", async () => {
  if (!currentProvider) return;
  const phone = phoneInput.value.trim();
  const message = messageInput.value.trim();
  if (!phone || !message) return;

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";
  log(`Sending to ${phone}: "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}"`);

  try {
    const result = await currentProvider.sendMessage(getConfig(), phone, message);
    if (result.success) {
      showResult(sendResult, `Sent successfully! ID: ${result.providerMessageId || "n/a"}`, true);
      log(`Send success. ID: ${result.providerMessageId || "n/a"}`, "success");
    } else {
      showResult(sendResult, `Failed: ${result.error}`, false);
      log(`Send failed: ${result.error}`, "error");
    }
  } catch (err: any) {
    showResult(sendResult, `Error: ${err.message}`, false);
    log(`Send error: ${err.message}`, "error");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send Message";
  }
});

// Event: bulk send
bulkSendBtn.addEventListener("click", async () => {
  if (!currentProvider) return;
  const phones = bulkPhonesInput.value.split("\n").map((p) => p.trim()).filter(Boolean);
  const message = bulkMessageInput.value.trim();
  if (phones.length === 0 || !message) return;

  bulkSendBtn.disabled = true;
  bulkSendBtn.textContent = `Sending to ${phones.length}...`;
  log(`Bulk sending to ${phones.length} recipient(s)...`);

  try {
    const results = await currentProvider.sendBulk(getConfig(), phones, message);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const allSuccess = failCount === 0;

    showResult(bulkResult, `Sent: ${successCount}/${phones.length} succeeded, ${failCount} failed.`, allSuccess);
    log(`Bulk send: ${successCount} succeeded, ${failCount} failed`, allSuccess ? "success" : "error");

    results.forEach((r, i) => {
      if (!r.success) log(`  Failed for ${phones[i]}: ${r.error}`, "error");
    });
  } catch (err: any) {
    showResult(bulkResult, `Error: ${err.message}`, false);
    log(`Bulk send error: ${err.message}`, "error");
  } finally {
    bulkSendBtn.disabled = false;
    bulkSendBtn.textContent = "Send to All";
  }
});

// Event: clear log
clearLogBtn.addEventListener("click", () => {
  logEl.innerHTML = "";
});

// Init
init();
updateCharCount();
