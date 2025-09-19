// API Base URL - Thay đổi nếu cần
const API_BASE = "http://localhost:8000";

// Tab switching functionality
document.addEventListener("DOMContentLoaded", function () {
  // Tab switching
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and contents
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((tc) => tc.classList.remove("active"));

      // Add active class to clicked tab and corresponding content
      tab.classList.add("active");
      const targetTab = tab.dataset.tab;
      document.getElementById(`${targetTab}-tab`).classList.add("active");
    });
  });

  // Load highlighted text from storage
  loadHighlightedText();

  // Event listeners
  document
    .getElementById("upload-btn")
    .addEventListener("click", handleUploadPDF);
  document.getElementById("url-btn").addEventListener("click", handleLoadURL);
  document
    .getElementById("text-btn")
    .addEventListener("click", handleProcessText);
  document
    .getElementById("send-btn")
    .addEventListener("click", handleSendMessage);
  document
    .getElementById("chat-input")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        handleSendMessage();
      }
    });
});

// Load highlighted text from storage
function loadHighlightedText() {
  chrome.storage.local.get(["highlightedText"], function (result) {
    if (result.highlightedText) {
      document.getElementById("paste-text").value = result.highlightedText;
      // Clear after loading
      chrome.storage.local.remove(["highlightedText"]);
    }
  });
}

// Show status message
function showStatus(elementId, message, isError = false) {
  const statusEl = document.getElementById(elementId);
  statusEl.textContent = message;
  statusEl.className = `status ${isError ? "error" : "success"}`;
  statusEl.style.display = "block";

  setTimeout(() => {
    statusEl.style.display = "none";
  }, 3000);
}

// Handle PDF Upload
async function handleUploadPDF() {
  const fileInput = document.getElementById("pdf-file");
  const file = fileInput.files[0];

  if (!file) {
    showStatus("upload-status", "Please select a PDF file", true);
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  const uploadBtn = document.getElementById("upload-btn");
  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  try {
    const response = await fetch(`${API_BASE}/upload_pdf`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      showStatus(
        "upload-status",
        "PDF uploaded successfully! You can now chat."
      );
      addChatMessage("📄 PDF uploaded and processed successfully!", "bot");
    } else {
      showStatus("upload-status", result.message || "Upload failed", true);
    }
  } catch (error) {
    showStatus("upload-status", "Network error: " + error.message, true);
  }

  uploadBtn.disabled = false;
  uploadBtn.textContent = "Upload PDF";
}

// Handle Load PDF from URL
async function handleLoadURL() {
  const urlInput = document.getElementById("pdf-url");
  const url = urlInput.value.trim();

  if (!url) {
    showStatus("url-status", "Please enter a PDF URL", true);
    return;
  }

  const urlBtn = document.getElementById("url-btn");
  urlBtn.disabled = true;
  urlBtn.textContent = "Loading...";

  try {
    const formData = new FormData();
    formData.append("url", url);

    const response = await fetch(`${API_BASE}/load_pdf_url`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      showStatus("url-status", "PDF loaded successfully! You can now chat.");
      addChatMessage(
        "🔗 PDF from URL loaded and processed successfully!",
        "bot"
      );
    } else {
      showStatus("url-status", result.message || "Failed to load PDF", true);
    }
  } catch (error) {
    showStatus("url-status", "Network error: " + error.message, true);
  }

  urlBtn.disabled = false;
  urlBtn.textContent = "Load from URL";
}

// Handle Process Text
async function handleProcessText() {
  const textInput = document.getElementById("paste-text");
  const text = textInput.value.trim();

  if (!text) {
    showStatus("text-status", "Please enter some text", true);
    return;
  }

  const textBtn = document.getElementById("text-btn");
  textBtn.disabled = true;
  textBtn.textContent = "Processing...";

  try {
    const formData = new FormData();
    formData.append("text", text);

    const response = await fetch(`${API_BASE}/paste_text`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      showStatus(
        "text-status",
        "Text processed successfully! You can now chat."
      );
      addChatMessage("📝 Text processed successfully!", "bot");
    } else {
      showStatus(
        "text-status",
        result.message || "Failed to process text",
        true
      );
    }
  } catch (error) {
    showStatus("text-status", "Network error: " + error.message, true);
  }

  textBtn.disabled = false;
  textBtn.textContent = "Process Text";
}

// Add message to chat
function addChatMessage(message, sender) {
  const chatMessages = document.getElementById("chat-messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}-message`;
  messageDiv.textContent = message;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle Send Message
async function handleSendMessage() {
  const chatInput = document.getElementById("chat-input");
  const message = chatInput.value.trim();

  if (!message) return;

  // Add user message
  addChatMessage(message, "user");
  chatInput.value = "";

  const sendBtn = document.getElementById("send-btn");
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  try {
    const formData = new FormData();
    formData.append("query", message);

    const response = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      addChatMessage(result.answer, "bot");
    } else {
      addChatMessage(
        "Sorry, I encountered an error. Please make sure you've uploaded a document first.",
        "bot"
      );
    }
  } catch (error) {
    addChatMessage("Network error: " + error.message, "bot");
  }

  sendBtn.disabled = false;
  sendBtn.textContent = "Send";
}
