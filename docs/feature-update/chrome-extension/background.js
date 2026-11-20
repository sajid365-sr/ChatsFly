// Background Service Worker for ChatsFly Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("[ChatsFly] Chrome Extension installed successfully.");
  chrome.storage.sync.get(["apiUrl"], (result) => {
    if (!result.apiUrl) {
      chrome.storage.sync.set({ apiUrl: "https://chatsfly.com" });
    }
  });
});

// Proxy API requests from content script to bypass CORS if necessary
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ChatsFly_API_CALL") {
    chrome.storage.sync.get(["apiUrl", "apiKey"], async ({ apiUrl, apiKey }) => {
      const baseUrl = apiUrl || "https://chatsfly.com";
      try {
        const response = await fetch(`${baseUrl}${request.endpoint}`, {
          method: request.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            ...request.headers,
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        const data = await response.json().catch(() => ({}));
        sendResponse({ success: response.ok, status: response.status, data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; // Keep message channel open for async response
  }
});

