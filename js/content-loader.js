/* ============================================================================
   GAME HUB — Content Loader / Dynamic Hydration
   Connects the landing page to data/content.json & live editor previews
   ========================================================================== */

(function () {
  'use strict';

  async function loadSiteContent() {
    let data = null;

    // 1. Check for live editor preview data in localStorage
    try {
      const previewStr = localStorage.getItem('gamehub_preview_content');
      if (previewStr) {
        data = JSON.parse(previewStr);
      }
    } catch (_) {}

    // 2. Fetch official data/content.json from repository/server
    try {
      const res = await fetch('data/content.json?v=' + Date.now());
      if (res.ok) {
        data = await res.json();
      }
    } catch (_) {}

    if (!data) return; // Keep static defaults if unavailable

    // Apply Content to DOM
    applyHero(data.hero);
    applyPrices(data.prices);
    applyZones(data.zones);
    applyParties(data.parties);
    applyNight(data.night);
    applyContacts(data.contacts);
  }

  function applyHero(hero) {
    if (!hero) return;
    const statusText = document.getElementById('statusText');
    if (statusText && hero.status) statusText.textContent = hero.status;

    const heroTitle = document.querySelector('.hero__title');
    if (heroTitle && hero.titlePrefix && hero.titleEm) {
      heroTitle.innerHTML = `${escapeHtml(hero.titlePrefix)}<em>${escapeHtml(hero.titleEm)}</em>`;
    }

    const heroLead = document.querySelector('.hero__lead');
    if (heroLead && hero.lead) heroLead.textContent = hero.lead;

    const heroVideo = document.getElementById('heroVideo');
    if (heroVideo) {
      if (hero.poster) heroVideo.poster = hero.poster;
      const source = heroVideo.querySelector('source');
      if (source && hero.video && !source.src.endsWith(hero.video)) {
        source.src = hero.video;
        heroVideo.load();
      }
    }
  }

  function applyPrices(prices) {
    if (!prices) return;
    const priceAmount = document.querySelector('.pricecard__amount');
    if (priceAmount && prices.singleRateAmount) priceAmount.textContent = prices.singleRateAmount;

    const priceUnit = document.querySelector('.pricecard__unit');
    if (priceUnit && prices.singleRateUnit) priceUnit.textContent = prices.singleRateUnit;

    const priceNote = document.querySelector('.pricecard__note');
    if (priceNote && prices.singleRateNote) priceNote.textContent = prices.singleRateNote;
  }

  function applyZones(zones) {
    if (!zones || !zones.length) return;
    const zoneCards = document.querySelectorAll('.zone');
    zoneCards.forEach((card, idx) => {
      const z = zones[idx];
      if (!z) return;

      const titleEl = card.querySelector('.zone__title');
      if (titleEl && z.title) titleEl.textContent = z.title;

      const textEl = card.querySelector('.zone__text');
      if (textEl && z.text) textEl.textContent = z.text;

      const tagEl = card.querySelector('.zone__tag');
      if (tagEl && z.tag) tagEl.textContent = z.tag;

      const imgEl = card.querySelector('.zone__figure img');
      if (imgEl && z.image) {
        imgEl.src = z.image;
        imgEl.removeAttribute('srcset'); // ensure new image displays correctly
      }
    });
  }

  function applyParties(parties) {
    if (!parties || !parties.length) return;
    const partyCards = document.querySelectorAll('#parties .package');
    partyCards.forEach((card, idx) => {
      const p = parties[idx];
      if (!p) return;

      const nameEl = card.querySelector('.package__name');
      if (nameEl && p.name) nameEl.textContent = p.name;

      const forEl = card.querySelector('.package__for');
      if (forEl && p.for) forEl.textContent = p.for;

      const priceEl = card.querySelector('.package__price');
      if (priceEl && p.price) priceEl.textContent = p.price;

      const unitEl = card.querySelector('.package__unit');
      if (unitEl && p.unit) unitEl.textContent = p.unit;
    });
  }

  function applyNight(night) {
    if (!night) return;
    const nightTitle = document.querySelector('#night .section__title');
    if (nightTitle && night.title) nightTitle.textContent = night.title;

    const nightLead = document.querySelector('#night .section__lead');
    if (nightLead && night.lead) nightLead.textContent = night.lead;
  }

  function applyContacts(contacts) {
    if (!contacts) return;
    // Phones
    const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
    phoneLinks.forEach(link => {
      if (contacts.phone1Tel && link.href.includes('77895477')) {
        link.href = 'tel:' + contacts.phone1Tel;
        const span = link.querySelector('span');
        if (span) span.textContent = contacts.phone1;
      }
    });

    // Instagram
    if (contacts.instagram) {
      document.querySelectorAll('a[href*="instagram.com"]').forEach(link => {
        link.href = contacts.instagram;
      });
    }

    // Telegram
    if (contacts.telegram) {
      document.querySelectorAll('a[href*="t.me"]').forEach(link => {
        link.href = contacts.telegram;
      });
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteContent);
  } else {
    loadSiteContent();
  }
})();
