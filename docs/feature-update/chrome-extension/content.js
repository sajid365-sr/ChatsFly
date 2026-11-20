// ChatsFly Content Script for Meta Business Suite
(function () {
  if (window.__chatsflyInjected) return;
  window.__chatsflyInjected = true;

  console.log("[ChatsFly] Injecting Copilot into Meta Business Suite...");

  // Create floating widget container
  const container = document.createElement("div");
  container.id = "chatsfly-copilot-container";
  container.className = "chatsfly-collapsed";

  container.innerHTML = `
    <div id="chatsfly-toggle-btn" title="Toggle ChatsFly Copilot">
      <div class="chatsfly-badge-dot"></div>
      <svg class="chatsfly-logo-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      <span class="chatsfly-btn-label">ChatsFly</span>
    </div>

    <div id="chatsfly-sidebar-panel">
      <div class="chatsfly-panel-header">
        <div class="chatsfly-brand">
          <span class="chatsfly-brand-name">ChatsFly</span>
          <span class="chatsfly-brand-sub">Meta Copilot</span>
        </div>
        <button id="chatsfly-close-btn" class="chatsfly-icon-btn">&times;</button>
      </div>

      <div class="chatsfly-panel-body">
        <!-- AI Toggle -->
        <div class="chatsfly-card">
          <div class="chatsfly-card-row">
            <div>
              <div class="chatsfly-label">AI Status</div>
              <div class="chatsfly-sublabel" id="chatsfly-ai-status-text">AI is actively replying</div>
            </div>
            <label class="chatsfly-switch">
              <input type="checkbox" id="chatsfly-ai-toggle" checked>
              <span class="chatsfly-slider"></span>
            </label>
          </div>
        </div>

        <!-- Quick Summary & Suggested Reply -->
        <div class="chatsfly-card">
          <div class="chatsfly-label">AI Assistant</div>
          <div class="chatsfly-action-buttons">
            <button id="chatsfly-btn-summarize" class="chatsfly-action-btn">
              <span>📋 Summary</span>
            </button>
            <button id="chatsfly-btn-suggest" class="chatsfly-action-btn chatsfly-action-btn-primary">
              <span>✨ Suggest Reply</span>
            </button>
          </div>
          <div id="chatsfly-ai-output" class="chatsfly-output-box" style="display:none;"></div>
        </div>

        <!-- Assign Agent -->
        <div class="chatsfly-card">
          <div class="chatsfly-label">Assign Agent</div>
          <select id="chatsfly-assign-select" class="chatsfly-select">
            <option value="">Unassigned</option>
          </select>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Bind Events
  const toggleBtn = document.getElementById("chatsfly-toggle-btn");
  const closeBtn = document.getElementById("chatsfly-close-btn");
  const aiToggle = document.getElementById("chatsfly-ai-toggle");
  const aiStatusText = document.getElementById("chatsfly-ai-status-text");
  const btnSummarize = document.getElementById("chatsfly-btn-summarize");
  const btnSuggest = document.getElementById("chatsfly-btn-suggest");
  const outputBox = document.getElementById("chatsfly-ai-output");

  toggleBtn.addEventListener("click", () => {
    container.classList.toggle("chatsfly-collapsed");
  });

  closeBtn.addEventListener("click", () => {
    container.classList.add("chatsfly-collapsed");
  });

  aiToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      aiStatusText.textContent = "AI is actively replying";
      aiStatusText.style.color = "#10b981";
    } else {
      aiStatusText.textContent = "AI paused (Human mode)";
      aiStatusText.style.color = "#f59e0b";
    }
  });

  btnSummarize.addEventListener("click", () => {
    outputBox.style.display = "block";
    outputBox.textContent = "Analyzing conversation...";
    // Calls background service to fetch summary
    chrome.runtime.sendMessage(
      {
        type: "ChatsFly_API_CALL",
        endpoint: "/api/inbox/ai-assist",
        method: "POST",
        body: { mode: "summary", conversationTranscript: document.body.innerText.slice(0, 3000) }
      },
      (res) => {
        if (res && res.data && res.data.result) {
          outputBox.textContent = res.data.result;
        } else {
          outputBox.textContent = "Could not fetch summary. Please configure your API key in extension popup.";
        }
      }
    );
  });

  btnSuggest.addEventListener("click", () => {
    outputBox.style.display = "block";
    outputBox.textContent = "Generating suggested reply...";
    chrome.runtime.sendMessage(
      {
        type: "ChatsFly_API_CALL",
        endpoint: "/api/inbox/ai-assist",
        method: "POST",
        body: { mode: "suggest_reply", conversationTranscript: document.body.innerText.slice(0, 3000) }
      },
      (res) => {
        if (res && res.data && res.data.result) {
          outputBox.innerHTML = `<div>${res.data.result}</div><button id="chatsfly-copy-reply" class="chatsfly-mini-btn">Copy Reply</button>`;
          document.getElementById("chatsfly-copy-reply")?.addEventListener("click", () => {
            navigator.clipboard.writeText(res.data.result);
            alert("Reply copied to clipboard!");
          });
        } else {
          outputBox.textContent = "Could not generate reply. Please configure your API key.";
        }
      }
    );
  });
})();

