// Content script - runs on all web pages

let selectedText = "";
let highlightButton = null;

// Create highlight button
function createHighlightButton() {
  if (highlightButton) return highlightButton;

  highlightButton = document.createElement("div");
  highlightButton.innerHTML = "📚 Add to Research";
  highlightButton.className = "research-highlight-btn";
  highlightButton.style.cssText = `
        position: absolute;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: none;
        user-select: none;
        border: none;
        backdrop-filter: blur(10px);
        transition: all 0.2s ease;
    `;

  highlightButton.addEventListener("mouseenter", () => {
    highlightButton.style.transform = "scale(1.05)";
  });

  highlightButton.addEventListener("mouseleave", () => {
    highlightButton.style.transform = "scale(1)";
  });

  highlightButton.addEventListener("click", handleHighlightClick);
  document.body.appendChild(highlightButton);

  return highlightButton;
}

// Handle text selection
document.addEventListener("mouseup", function (e) {
  setTimeout(() => {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      showHighlightButton(e.pageX, e.pageY);
    } else {
      hideHighlightButton();
    }
  }, 10);
});

// Handle clicking elsewhere to hide button
document.addEventListener("mousedown", function (e) {
  if (e.target !== highlightButton) {
    setTimeout(hideHighlightButton, 100);
  }
});

// Show highlight button near mouse position
function showHighlightButton(x, y) {
  const button = createHighlightButton();

  // Position the button near the mouse cursor
  button.style.left = x + 10 + "px";
  button.style.top = y - 40 + "px";
  button.style.display = "block";

  // Adjust position if button goes off screen
  const rect = button.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    button.style.left = x - rect.width - 10 + "px";
  }
  if (rect.top < 0) {
    button.style.top = y + 20 + "px";
  }
}

// Hide highlight button
function hideHighlightButton() {
  if (highlightButton) {
    highlightButton.style.display = "none";
  }
}

// Handle highlight button click
function handleHighlightClick() {
  if (selectedText) {
    // Send message to background script
    chrome.runtime.sendMessage(
      {
        action: "highlightText",
        text: selectedText,
      },
      (response) => {
        if (response && response.status === "saved") {
          // Show success feedback
          showNotification("Text saved! Open extension to process it.");
        }
      }
    );

    hideHighlightButton();
    window.getSelection().removeAllRanges();
  }
}

// Show in-page notification
function showNotification(message) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;

  // Add slide-in animation
  const style = document.createElement("style");
  style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideIn 0.3s ease reverse";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Handle keyboard shortcuts
document.addEventListener("keydown", function (e) {
  // Ctrl+Shift+H to add highlighted text
  if (e.ctrlKey && e.shiftKey && e.key === "H") {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0) {
      chrome.runtime.sendMessage(
        {
          action: "highlightText",
          text: text,
        },
        (response) => {
          if (response && response.status === "saved") {
            showNotification("Text saved with Ctrl+Shift+H!");
          }
        }
      );
    }
  }
});
