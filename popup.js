const ACTION_LABELS = { allow: 'A', 'cookie-block': 'C', block: 'B' };

function updateUI(enabled) {
  document.getElementById('masterToggle').checked = enabled;
  document.getElementById('statusText').textContent = enabled ? 'Protection active' : 'Paused';
  const dot = document.getElementById('statusDot');
  dot.className = 'dot ' + (enabled ? 'active' : 'paused');
}

function loadStats() {
  chrome.storage.local.get('durgashield_stats', (r) => {
    const stats = r.durgashield_stats || { today: 0 };
    document.getElementById('blockedToday').textContent = stats.today;
  });
}

function loadTrackers() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].url) return;
    try {
      const host = new URL(tabs[0].url).hostname.replace(/^www\./, '');
      chrome.runtime.sendMessage({ type: 'getDetectedTrackers' }, (trackers) => {
        if (!trackers || !trackers.length) return;
        const pageTrackers = trackers.filter(t => t.sites && t.sites.includes(host));
        renderTrackerList(pageTrackers);
      });
    } catch (e) {}
  });
}

function renderTrackerList(trackers) {
  const section = document.getElementById('trackerSection');
  const list = document.getElementById('trackerList');
  const count = document.getElementById('trackerCount');
  if (!trackers.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  count.textContent = trackers.length;
  list.innerHTML = trackers.map(t => {
    const cur = t.action || 'none';
    const isAllow = cur === 'allow';
    const isCookie = cur === 'cookie-block';
    const isBlock = cur === 'block';
    const siteCount = t.sites ? t.sites.length : 0;
    let heatColor = '#28a745';
    if (siteCount > 50) heatColor = '#dc3545';
    else if (siteCount > 10) heatColor = '#fd7e14';
    else if (siteCount > 2) heatColor = '#ffc107';
    const heatBadge = siteCount > 0 ? '<span class="heat-badge" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + heatColor + ';margin-right:4px;flex-shrink:0" title="Seen on ' + siteCount + ' sites"></span>' : '';
    return '<div class="tracker-item" data-domain="' + t.domain + '">' +
      heatBadge +
      '<span class="tracker-domain" title="' + t.domain + ' (' + siteCount + ' sites)">' + t.domain + '</span>' +
      '<div class="tracker-actions">' +
        '<button class="action-btn' + (isAllow ? ' active-allow' : '') + '" data-action="allow" title="Allow">A</button>' +
        '<button class="action-btn' + (isCookie ? ' active-cookie' : '') + '" data-action="cookie-block" title="Block cookies only">C</button>' +
        '<button class="action-btn' + (isBlock ? ' active-block' : '') + '" data-action="block" title="Block">B</button>' +
      '</div></div>';
  }).join('');
  list.querySelectorAll('.tracker-item').forEach(item => {
    const domain = item.dataset.domain;
    item.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        chrome.runtime.sendMessage({ type: 'setTrackerAction', domain, action }, () => {
          item.querySelectorAll('.action-btn').forEach(b => {
            b.className = 'action-btn';
          });
          if (action === 'allow') btn.className = 'action-btn active-allow';
          else if (action === 'cookie-block') btn.className = 'action-btn active-cookie';
          else if (action === 'block') btn.className = 'action-btn active-block';
        });
      });
    });
  });
}

chrome.storage.local.get('durgashield_enabled', (r) => {
  const enabled = r.durgashield_enabled !== false;
  updateUI(enabled);
});

loadStats();
loadTrackers();

document.getElementById('masterToggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  chrome.storage.local.set({ durgashield_enabled: enabled });
  updateUI(enabled);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'setEnabled', enabled }).catch(() => {});
    }
  });
});

document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('elementPickerBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'activateZapper' }).catch(() => {});
    }
  });
  window.close();
});

document.getElementById('privacyBtn').addEventListener('click', (e) => {
  chrome.tabs.create({ url: chrome.runtime.getURL('privacy.html') });
});

document.getElementById('donateBtn').addEventListener('click', (e) => {
  chrome.tabs.create({ url: chrome.runtime.getURL('donations.html') });
});
