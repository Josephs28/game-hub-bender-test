/* ============================================================================
   GAME HUB EDITOR — LOGIC
   Git-based editing engine with GitHub API integration & media uploads
   ========================================================================== */

(function () {
  'use strict';

  // Configuration & Defaults
  const DEFAULT_REPO = 'Josephs28/game-hub-bender-test';
  const DEFAULT_BRANCH = 'main';
  const DATA_PATH = 'data/content.json';

  // State
  let siteData = null;
  let stagedMedia = {}; // maps path (e.g. 'assets/img/photo-19-1280.jpg') -> { base64, filename }

  // DOM Elements
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.editor-section');
  const currentPageTitle = document.getElementById('currentPageTitle');
  const saveBtn = document.getElementById('saveBtn');
  const reloadBtn = document.getElementById('reloadBtn');
  const toast = document.getElementById('toast');

  // Settings Modal Elements
  const settingsModal = document.getElementById('settingsModal');
  const configureBtn = document.getElementById('configureBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsModal = document.getElementById('closeSettingsModal');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const ghRepoInput = document.getElementById('ghRepo');
  const ghBranchInput = document.getElementById('ghBranch');
  const ghTokenInput = document.getElementById('ghToken');
  const userNameEl = document.getElementById('userName');
  const userStatusEl = document.getElementById('userStatus');

  /* --------------------------------------------------------------------------
     Initialization
     -------------------------------------------------------------------------- */
  async function init() {
    loadSettings();
    setupNavigation();
    setupModal();
    setupMediaDropZones();

    try {
      // 1. Try to load data from content.json
      const res = await fetch('../data/content.json?v=' + Date.now());
      if (res.ok) {
        siteData = await res.json();
      } else {
        throw new Error('Local content.json not found');
      }
    } catch (e) {
      console.warn('Loading fallback data...', e);
      siteData = getFallbackData();
    }

    // Populate all forms
    populateAll();
  }

  /* --------------------------------------------------------------------------
     Navigation Switcher & Mobile Drawer
     -------------------------------------------------------------------------- */
  function setupNavigation() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const mobileTabs = document.querySelectorAll('.mobile-tab');

    function closeSidebar() {
      if (sidebar) sidebar.classList.remove('is-open');
      if (backdrop) backdrop.classList.remove('is-open');
    }

    function openSidebar() {
      if (sidebar) sidebar.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-open');
    }

    if (menuToggleBtn) menuToggleBtn.addEventListener('click', openSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    function switchSection(sectionName) {
      // Update sidebar nav items
      navItems.forEach(n => {
        n.classList.toggle('is-active', n.dataset.section === sectionName);
      });

      // Update mobile tabs
      mobileTabs.forEach(t => {
        t.classList.toggle('is-active', t.dataset.section === sectionName);
      });

      // Update visible section
      sections.forEach(s => {
        s.classList.toggle('is-active', s.id === 'section-' + sectionName);
      });

      // Update page title
      const activeBtn = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
      if (activeBtn) {
        currentPageTitle.textContent = activeBtn.querySelector('span:last-child').textContent;
      }

      // Close mobile drawer if open
      closeSidebar();
    }

    // Sidebar items
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        switchSection(item.dataset.section);
      });
    });

    // Mobile tabs
    mobileTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchSection(tab.dataset.section);
      });
    });

    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        if (confirm('Сбросить все несохранённые изменения до начального состояния?')) {
          populateAll();
          showToast('Данные формы сброшены', 'info');
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
     Populate Forms with Data
     -------------------------------------------------------------------------- */
  function populateAll() {
    if (!siteData) return;

    // 1. Hero
    if (siteData.hero) {
      setVal('hero_status', siteData.hero.status);
      setVal('hero_statusOpen', String(siteData.hero.statusOpen !== false));
      setVal('hero_titlePrefix', siteData.hero.titlePrefix || 'Больше, ');
      setVal('hero_titleEm', siteData.hero.titleEm || 'чем игры');
      setVal('hero_lead', siteData.hero.lead);
      if (siteData.hero.video) document.getElementById('heroVideoName').textContent = siteData.hero.video.split('/').pop();
      if (siteData.hero.poster) document.getElementById('heroPosterName').textContent = siteData.hero.poster.split('/').pop();

      // Facts
      const factsContainer = document.getElementById('factsEditor');
      if (factsContainer && siteData.hero.facts) {
        factsContainer.innerHTML = siteData.hero.facts.map((f, i) => `
          <div class="form-row" style="margin-bottom: 8px;">
            <input type="text" class="form-input fact-num" data-index="${i}" value="${escapeHtml(f.num)}" placeholder="Цифра">
            <input type="text" class="form-input fact-label" data-index="${i}" value="${escapeHtml(f.label)}" placeholder="Описание">
          </div>
        `).join('');
      }
    }

    // 2. Prices
    if (siteData.prices) {
      setVal('prices_singleRateAmount', siteData.prices.singleRateAmount || '80 ₽');
      setVal('prices_singleRateUnit', siteData.prices.singleRateUnit || '/ час за ребёнка');
      setVal('prices_singleRateNote', siteData.prices.singleRateNote || '');
      setVal('prices_vrPrice', siteData.prices.vrPrice || '30 ₽ / 10 минут');

      const pkgContainer = document.getElementById('pricesPackagesList');
      if (pkgContainer && siteData.prices.packages) {
        pkgContainer.innerHTML = siteData.prices.packages.map((pkg, i) => `
          <div class="card-box" style="margin-bottom: 12px; padding: 16px;">
            <div class="form-row">
              <div>
                <label class="form-label">Оборудование / Зона</label>
                <input type="text" class="form-input pkg-name" data-index="${i}" value="${escapeHtml(pkg.name)}">
              </div>
              <div>
                <label class="form-label">Стоимость</label>
                <input type="text" class="form-input pkg-price" data-index="${i}" value="${escapeHtml(pkg.price)} ${escapeHtml(pkg.unit || '')}">
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // 3. Zones
    const zonesContainer = document.getElementById('zonesEditorList');
    if (zonesContainer && siteData.zones) {
      zonesContainer.innerHTML = siteData.zones.map((zone, i) => `
        <div class="zone-card" data-zone-index="${i}">
          <div class="zone-card__header">
            <span class="zone-card__title">${escapeHtml(zone.title)}</span>
            <span class="zone-tag-badge">${escapeHtml(zone.tag || '')}</span>
          </div>

          <div class="form-group media-upload-group">
            <label class="form-label">Фотография зоны</label>
            <div class="drop-zone">
              <input type="file" class="zone-img-input" data-index="${i}" accept="image/*" hidden>
              <div class="drop-zone__preview">
                <img src="../${escapeHtml(zone.image)}" alt="${escapeHtml(zone.title)}" id="zoneImgPreview_${i}">
              </div>
              <div class="drop-zone__actions">
                <button type="button" class="btn-select-file" onclick="this.closest('.drop-zone').querySelector('input').click()">Select file</button>
                <span class="file-name" id="zoneImgName_${i}">${zone.image.split('/').pop()}</span>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Название зоны</label>
              <input type="text" class="form-input zone-title-input" data-index="${i}" value="${escapeHtml(zone.title)}">
            </div>
            <div class="form-group">
              <label class="form-label">Тег (категория)</label>
              <input type="text" class="form-input zone-tag-input" data-index="${i}" value="${escapeHtml(zone.tag || '')}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Описание зоны</label>
            <textarea class="form-textarea zone-text-input" data-index="${i}" rows="3">${escapeHtml(zone.text)}</textarea>
          </div>
        </div>
      `).join('');

      // Wire up zone image file selectors
      zonesContainer.querySelectorAll('.zone-img-input').forEach(input => {
        input.addEventListener('change', (e) => handleZoneImageChange(e, input.dataset.index));
      });
    }

    // 4. Parties
    const partiesContainer = document.getElementById('partiesEditorList');
    if (partiesContainer && siteData.parties) {
      partiesContainer.innerHTML = siteData.parties.map((p, i) => `
        <div class="party-card">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Название тарифа</label>
              <input type="text" class="form-input party-name-input" data-index="${i}" value="${escapeHtml(p.name)}">
            </div>
            <div class="form-group">
              <label class="form-label">Вместимость / Для кого</label>
              <input type="text" class="form-input party-for-input" data-index="${i}" value="${escapeHtml(p.for)}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Цена</label>
              <input type="text" class="form-input party-price-input" data-index="${i}" value="${escapeHtml(p.price)}">
            </div>
            <div class="form-group">
              <label class="form-label">Единица (например: / час)</label>
              <input type="text" class="form-input party-unit-input" data-index="${i}" value="${escapeHtml(p.unit)}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Примечание к тарифу</label>
            <input type="text" class="form-input party-note-input" data-index="${i}" value="${escapeHtml(p.note || '')}">
          </div>
        </div>
      `).join('');
    }

    // 5. Night
    if (siteData.night) {
      setVal('night_title', siteData.night.title);
      setVal('night_time', siteData.night.time);
      setVal('night_lead', siteData.night.lead);
    }

    // 6. Contacts
    if (siteData.contacts) {
      setVal('contacts_phone1', siteData.contacts.phone1);
      setVal('contacts_phone1Name', siteData.contacts.phone1Name);
      setVal('contacts_phone2', siteData.contacts.phone2);
      setVal('contacts_phone2Name', siteData.contacts.phone2Name);
      setVal('contacts_address', siteData.contacts.address);
      setVal('contacts_hoursWorkdays', siteData.contacts.hoursWorkdays);
      setVal('contacts_hoursWeekends', siteData.contacts.hoursWeekends);
      setVal('contacts_hoursSummer', siteData.contacts.hoursSummer);
      setVal('contacts_instagram', siteData.contacts.instagram);
      setVal('contacts_instagramHandle', siteData.contacts.instagramHandle);
      setVal('contacts_telegram', siteData.contacts.telegram);
    }
  }

  /* --------------------------------------------------------------------------
     Collect Updated Data from Forms
     -------------------------------------------------------------------------- */
  function collectData() {
    const updated = JSON.parse(JSON.stringify(siteData || {}));

    // Hero
    if (!updated.hero) updated.hero = {};
    updated.hero.status = getVal('hero_status');
    updated.hero.statusOpen = getVal('hero_statusOpen') === 'true';
    updated.hero.titlePrefix = getVal('hero_titlePrefix');
    updated.hero.titleEm = getVal('hero_titleEm');
    updated.hero.lead = getVal('hero_lead');

    // Facts
    const numInputs = document.querySelectorAll('.fact-num');
    const labelInputs = document.querySelectorAll('.fact-label');
    updated.hero.facts = [];
    numInputs.forEach((numIn, idx) => {
      updated.hero.facts.push({
        num: numIn.value,
        label: labelInputs[idx] ? labelInputs[idx].value : ''
      });
    });

    // Prices
    if (!updated.prices) updated.prices = {};
    updated.prices.singleRateAmount = getVal('prices_singleRateAmount');
    updated.prices.singleRateUnit = getVal('prices_singleRateUnit');
    updated.prices.singleRateNote = getVal('prices_singleRateNote');
    updated.prices.vrPrice = getVal('prices_vrPrice');

    // Zones
    document.querySelectorAll('.zone-card').forEach((card, idx) => {
      if (updated.zones && updated.zones[idx]) {
        updated.zones[idx].title = card.querySelector('.zone-title-input').value;
        updated.zones[idx].tag = card.querySelector('.zone-tag-input').value;
        updated.zones[idx].text = card.querySelector('.zone-text-input').value;
      }
    });

    // Parties
    document.querySelectorAll('.party-card').forEach((card, idx) => {
      if (updated.parties && updated.parties[idx]) {
        updated.parties[idx].name = card.querySelector('.party-name-input').value;
        updated.parties[idx].for = card.querySelector('.party-for-input').value;
        updated.parties[idx].price = card.querySelector('.party-price-input').value;
        updated.parties[idx].unit = card.querySelector('.party-unit-input').value;
        updated.parties[idx].note = card.querySelector('.party-note-input').value;
      }
    });

    // Night
    if (!updated.night) updated.night = {};
    updated.night.title = getVal('night_title');
    updated.night.time = getVal('night_time');
    updated.night.lead = getVal('night_lead');

    // Contacts
    if (!updated.contacts) updated.contacts = {};
    updated.contacts.phone1 = getVal('contacts_phone1');
    updated.contacts.phone1Name = getVal('contacts_phone1Name');
    updated.contacts.phone2 = getVal('contacts_phone2');
    updated.contacts.phone2Name = getVal('contacts_phone2Name');
    updated.contacts.address = getVal('contacts_address');
    updated.contacts.hoursWorkdays = getVal('contacts_hoursWorkdays');
    updated.contacts.hoursWeekends = getVal('contacts_hoursWeekends');
    updated.contacts.hoursSummer = getVal('contacts_hoursSummer');
    updated.contacts.instagram = getVal('contacts_instagram');
    updated.contacts.instagramHandle = getVal('contacts_instagramHandle');
    updated.contacts.telegram = getVal('contacts_telegram');

    return updated;
  }

  /* --------------------------------------------------------------------------
     Media Upload Handlers
     -------------------------------------------------------------------------- */
  function setupMediaDropZones() {
    // Hero Video
    const videoInput = document.getElementById('heroVideoInput');
    if (videoInput) {
      videoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          const path = 'assets/video/' + file.name;
          stagedMedia[path] = { base64, filename: file.name };
          siteData.hero.video = path;
          document.getElementById('heroVideoName').textContent = file.name + ' (Готов к отправке)';
          const preview = document.querySelector('#heroVideoPreview video');
          if (preview) preview.src = reader.result;
          showToast(`Видео ${file.name} выбрано`, 'info');
        };
        reader.readAsDataURL(file);
      });
    }

    // Hero Poster
    const posterInput = document.getElementById('heroPosterInput');
    if (posterInput) {
      posterInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          const path = 'assets/img/' + file.name;
          stagedMedia[path] = { base64, filename: file.name };
          siteData.hero.poster = path;
          document.getElementById('heroPosterName').textContent = file.name + ' (Готов к отправке)';
          const img = document.querySelector('#heroPosterPreview img');
          if (img) img.src = reader.result;
          showToast(`Изображение ${file.name} выбрано`, 'info');
        };
        reader.readAsDataURL(file);
      });
    }
  }

  function handleZoneImageChange(e, index) {
    const file = e.target.files[0];
    if (!file || !siteData.zones[index]) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      const path = 'assets/img/' + file.name;
      stagedMedia[path] = { base64, filename: file.name };
      siteData.zones[index].image = path;
      document.getElementById(`zoneImgName_${index}`).textContent = file.name + ' (Готов к отправке)';
      const img = document.getElementById(`zoneImgPreview_${index}`);
      if (img) img.src = reader.result;
      showToast(`Фото для "${siteData.zones[index].title}" выбрано`, 'info');
    };
    reader.readAsDataURL(file);
  }

  /* --------------------------------------------------------------------------
     GitHub Save & Commit API
     -------------------------------------------------------------------------- */
  saveBtn.addEventListener('click', async () => {
    const updated = collectData();
    siteData = updated;

    // Cache locally
    localStorage.setItem('gamehub_preview_content', JSON.stringify(updated));

    const token = localStorage.getItem('gamehub_gh_token');
    const repo = localStorage.getItem('gamehub_gh_repo') || DEFAULT_REPO;
    const branch = localStorage.getItem('gamehub_gh_branch') || DEFAULT_BRANCH;

    if (!token) {
      // Prompt user to enter token
      settingsModal.classList.add('is-open');
      showToast('Укажите GitHub токен для публикации на GitHub', 'error');
      return;
    }

    saveBtn.classList.add('is-saving');
    saveBtn.querySelector('.btn-save__text').textContent = 'Saving...';

    try {
      // 1. Commit any newly selected media files
      for (const [path, media] of Object.entries(stagedMedia)) {
        await commitFileToGitHub(repo, branch, path, media.base64, `Upload ${media.filename} via Game Hub Editor`, token);
      }
      stagedMedia = {}; // reset staged

      // 2. Commit data/content.json
      const contentJsonStr = JSON.stringify(updated, null, 2);
      const contentBase64 = btoa(unescape(encodeURIComponent(contentJsonStr)));
      await commitFileToGitHub(repo, branch, DATA_PATH, contentBase64, 'Update website content via Game Hub Editor', token);

      showToast('✓ Успешно сохранено и отправлено в GitHub!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Ошибка сохранения в GitHub: ' + err.message, 'error');
    } finally {
      saveBtn.classList.remove('is-saving');
      saveBtn.querySelector('.btn-save__text').textContent = 'Save';
    }
  });

  async function commitFileToGitHub(repo, branch, path, contentBase64, message, token) {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
    
    // Check if file already exists to get SHA
    let sha = null;
    try {
      const getRes = await fetch(`${apiUrl}?ref=${branch}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const existingData = await getRes.json();
        sha = existingData.sha;
      }
    } catch (_) {}

    const body = {
      message: message,
      content: contentBase64,
      branch: branch
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const errJson = await putRes.json().catch(() => ({}));
      throw new Error(errJson.message || `HTTP ${putRes.status}`);
    }
  }

  /* --------------------------------------------------------------------------
     Settings Modal & Local Storage
     -------------------------------------------------------------------------- */
  function loadSettings() {
    // 1. Auto-detect token from URL parameter or hash (e.g. edit/#token=ghp_... or ?token=...)
    try {
      const hashClean = window.location.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(hashClean);
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = hashParams.get('token') || searchParams.get('token');

      if (urlToken) {
        localStorage.setItem('gamehub_gh_token', urlToken.trim());
        // Clean URL to keep token out of address bar / browser history
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        showToast('✓ Токен доступа успешно подключен!', 'success');
      }
    } catch (_) {}

    const token = localStorage.getItem('gamehub_gh_token');
    const repo = localStorage.getItem('gamehub_gh_repo') || DEFAULT_REPO;
    const branch = localStorage.getItem('gamehub_gh_branch') || DEFAULT_BRANCH;

    if (ghRepoInput) ghRepoInput.value = repo;
    if (ghBranchInput) ghBranchInput.value = branch;
    if (ghTokenInput && token) ghTokenInput.value = token;

    if (token) {
      userStatusEl.textContent = 'GitHub Connected';
      userStatusEl.style.color = '#22c55e';
    } else {
      userStatusEl.textContent = 'Not Connected';
      userStatusEl.style.color = '#ef4444';
    }
  }

  function setupModal() {
    const open = () => settingsModal.classList.add('is-open');
    const close = () => settingsModal.classList.remove('is-open');

    if (configureBtn) configureBtn.addEventListener('click', open);
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', open);
    if (closeSettingsModal) closeSettingsModal.addEventListener('click', close);

    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        const token = ghTokenInput.value.trim();
        const repo = ghRepoInput.value.trim() || DEFAULT_REPO;
        const branch = ghBranchInput.value.trim() || DEFAULT_BRANCH;

        if (token) localStorage.setItem('gamehub_gh_token', token);
        else localStorage.removeItem('gamehub_gh_token');

        localStorage.setItem('gamehub_gh_repo', repo);
        localStorage.setItem('gamehub_gh_branch', branch);

        loadSettings();
        close();
        showToast('Настройки сохранены', 'success');
      });
    }

    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        const updated = collectData();
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(updated, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', 'content.json');
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Файл content.json скачан', 'success');
      });
    }
  }

  /* --------------------------------------------------------------------------
     Helpers
     -------------------------------------------------------------------------- */
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(msg, type = 'info') {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast is-show toast--' + type;
    setTimeout(() => {
      toast.classList.remove('is-show');
    }, 3500);
  }

  function getFallbackData() {
    return {
      hero: {
        status: "Сегодня открыто до 23:00",
        statusOpen: true,
        titlePrefix: "Больше, ",
        titleEm: "чем игры",
        lead: "PlayStation 5, игровые ПК, VR, 3D-творчество и развивающие занятия — в одном пространстве в центре Бендер.",
        video: "assets/video/hero.mp4",
        poster: "assets/img/hero-poster.jpg",
        facts: []
      },
      prices: {
        singleRateAmount: "80 ₽",
        singleRateUnit: "/ час за ребёнка",
        vrPrice: "30 ₽ / 10 минут",
        packages: []
      },
      zones: [],
      parties: [],
      night: {},
      contacts: {}
    };
  }

  // Run on start
  init();
})();
