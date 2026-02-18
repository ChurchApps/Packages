import { getProvider, getProviderInfo, type TextingProviderConfig, type ITextingProvider, type ProviderInfo } from "../src";

// Elements
const providerSelect = document.getElementById("provider-select") as HTMLSelectElement;
const providerHelp = document.getElementById("provider-help") as HTMLDivElement;
const apiKeyGroup = document.getElementById("api-key-group") as HTMLDivElement;
const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const apiSecretInput = document.getElementById("api-secret") as HTMLInputElement;
const apiSecretGroup = document.getElementById("api-secret-group") as HTMLDivElement;
const validateBtn = document.getElementById("validate-btn") as HTMLButtonElement;
const validateResult = document.getElementById("validate-result") as HTMLDivElement;

const subscriberPanel = document.getElementById("subscriber-panel") as HTMLElement;
const subPhoneInput = document.getElementById("sub-phone") as HTMLInputElement;
const subFirstInput = document.getElementById("sub-first") as HTMLInputElement;
const subLastInput = document.getElementById("sub-last") as HTMLInputElement;
const subListSelect = document.getElementById("sub-list") as HTMLSelectElement;
const loadListsBtn = document.getElementById("load-lists-btn") as HTMLButtonElement;
const addSubBtn = document.getElementById("add-sub-btn") as HTMLButtonElement;
const addSubResult = document.getElementById("add-sub-result") as HTMLDivElement;

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

// Proxy paths to avoid CORS when running in the browser
const proxyBaseUrls: Record<string, string> = {
  clearstream: "/proxy/clearstream",
  textinchurch: "/proxy/textinchurch",
};

function getConfig(): TextingProviderConfig {
  return {
    churchId: "playground",
    apiKey: apiKeyInput.value.trim(),
    apiSecret: apiSecretInput.value.trim(),
    baseUrl: proxyBaseUrls[providerSelect.value] || undefined,
  };
}

function updateSendButtons() {
  const hasProvider = !!currentProvider;
  const needsKey = currentProviderInfo?.requiresApiKey !== false;
  const hasKey = !needsKey || apiKeyInput.value.trim().length > 0;
  validateBtn.disabled = !hasProvider || !hasKey;
  sendBtn.disabled = !hasProvider || !hasKey || !phoneInput.value.trim() || !messageInput.value.trim();
  bulkSendBtn.disabled = !hasProvider || !hasKey || !bulkPhonesInput.value.trim() || !bulkMessageInput.value.trim();
  addSubBtn.disabled = !hasProvider || !hasKey || !subPhoneInput.value.trim();
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

  // Auto-select provider and pre-fill API key from env vars
  const defaultProvider = import.meta.env.VITE_DEFAULT_PROVIDER;
  const defaultApiKey = import.meta.env.VITE_CLEARSTREAM_API_KEY;

  if (defaultProvider) {
    providerSelect.value = defaultProvider;
    providerSelect.dispatchEvent(new Event("change"));
  }
  if (defaultApiKey) {
    apiKeyInput.value = defaultApiKey;
    apiKeyInput.dispatchEvent(new Event("input"));
    log("API key loaded from environment");
  }
}

// Event: provider changed
providerSelect.addEventListener("change", () => {
  const id = providerSelect.value;
  validateResult.classList.add("hidden");

  if (!id) {
    currentProvider = null;
    currentProviderInfo = null;
    providerHelp.classList.add("hidden");
    apiKeyGroup.classList.remove("hidden");
    apiSecretGroup.classList.add("hidden");
    subscriberPanel.classList.add("hidden");
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

    if (currentProviderInfo.requiresApiKey === false) {
      apiKeyGroup.classList.add("hidden");
      apiKeyInput.value = "";
    } else {
      apiKeyGroup.classList.remove("hidden");
    }

    if (currentProviderInfo.requiresSecret) {
      apiSecretGroup.classList.remove("hidden");
    } else {
      apiSecretGroup.classList.add("hidden");
      apiSecretInput.value = "";
    }
  }

  // Show subscriber panel when the provider supports it
  if (currentProvider.capabilities.addSubscriber) {
    subscriberPanel.classList.remove("hidden");
    loadListsBtn.classList.toggle("hidden", !currentProvider.capabilities.getLists);
    subListSelect.closest(".form-group")!.classList.toggle("hidden", !currentProvider.capabilities.getLists);
  } else {
    subscriberPanel.classList.add("hidden");
  }

  log(`Selected provider: ${currentProvider.name}`);
  updateSendButtons();
});

// Event: inputs changed
apiKeyInput.addEventListener("input", updateSendButtons);
apiSecretInput.addEventListener("input", updateSendButtons);
subPhoneInput.addEventListener("input", updateSendButtons);
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

// Event: load lists
loadListsBtn.addEventListener("click", async () => {
  if (!currentProvider?.capabilities.getLists) return;
  loadListsBtn.disabled = true;
  loadListsBtn.textContent = "Loading...";
  log(`Fetching ${currentProvider.name} lists...`);

  try {
    const result = await currentProvider.getLists(getConfig());
    if (result.success && result.lists) {
      // Clear existing options except the first
      subListSelect.length = 1;
      result.lists.forEach((l) => {
        const opt = document.createElement("option");
        opt.value = l.id.toString();
        opt.textContent = l.name;
        subListSelect.appendChild(opt);
      });
      log(`Loaded ${result.lists.length} list(s)`, "success");
    } else {
      log(`Failed to load lists: ${result.error}`, "error");
    }
  } catch (err: any) {
    log(`Error loading lists: ${err.message}`, "error");
  } finally {
    loadListsBtn.disabled = false;
    loadListsBtn.textContent = "Load Lists";
  }
});

// Event: add subscriber
addSubBtn.addEventListener("click", async () => {
  if (!currentProvider?.capabilities.addSubscriber) return;
  const phone = subPhoneInput.value.trim();
  if (!phone) return;

  addSubBtn.disabled = true;
  addSubBtn.textContent = "Adding...";
  log(`Adding subscriber ${phone}...`);

  try {
    const result = await currentProvider.addSubscriber(getConfig(), phone, {
      lists: subListSelect.value || undefined,
      firstName: subFirstInput.value.trim() || undefined,
      lastName: subLastInput.value.trim() || undefined,
    });
    if (result.success) {
      showResult(addSubResult, `Subscriber added! Status: ${result.data?.status || "active"}`, true);
      log(`Subscriber ${phone} added successfully`, "success");
      // Pre-fill the send phone field for convenience
      phoneInput.value = phone;
      updateSendButtons();
    } else {
      showResult(addSubResult, `Failed: ${result.error}`, false);
      log(`Add subscriber failed: ${result.error}`, "error");
    }
  } catch (err: any) {
    showResult(addSubResult, `Error: ${err.message}`, false);
    log(`Add subscriber error: ${err.message}`, "error");
  } finally {
    addSubBtn.disabled = false;
    addSubBtn.textContent = "Add Subscriber";
  }
});

// Event: clear log
clearLogBtn.addEventListener("click", () => {
  logEl.innerHTML = "";
});

// Init
init();
updateCharCount();
