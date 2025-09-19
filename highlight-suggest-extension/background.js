// Background script for Chrome Extension

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToResearchAssistant",
    title: "📚 Add to Research Assistant",
    contexts: ["selection"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToResearchAssistant") {
    // Store selected text in chrome storage
    chrome.storage.local.set({
      highlightedText: info.selectionText,
    });

    // Show notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "Research Assistant",
      message: "Selected text added! Open the extension to process it.",
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "highlightText") {
    // Store highlighted text
    chrome.storage.local.set({
      highlightedText: request.text,
    });

    sendResponse({ status: "saved" });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup (this is handled automatically by manifest.json)
  console.log("Extension icon clicked");
});
