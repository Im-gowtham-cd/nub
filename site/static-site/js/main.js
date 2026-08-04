/* ==========================================================================
   Nub Static Site — JavaScript
   Handles: install tabs, copy-to-clipboard, theme toggle, parallax, scroll spy
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Theme Toggle ---------- */
  const THEME_KEY = 'nub-theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
    // Update toggle icon
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      const sun = btn.querySelector('.sun-icon');
      const moon = btn.querySelector('.moon-icon');
      if (sun && moon) {
        sun.style.display = theme === 'dark' ? 'none' : 'block';
        moon.style.display = theme === 'dark' ? 'block' : 'none';
      }
    });
  }

  // Apply theme immediately to prevent flash
  applyTheme(getPreferredTheme());

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.theme-toggle');
    if (!toggle) return;
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  /* ---------- Install Tabs ---------- */
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.install-tab-btn');
    if (!tab) return;

    const group = tab.closest('.install-tabs');
    if (!group) return;

    // Update active tab
    group.querySelectorAll('.install-tab-btn').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    // Update command display
    const cmd = tab.getAttribute('data-command');
    const display = group.querySelector('.install-copy-btn .cmd');
    if (display && cmd) display.textContent = cmd;

    // Update copy button
    const copyBtn = group.querySelector('.install-copy-btn');
    if (copyBtn) copyBtn.setAttribute('data-command', cmd);
  });

  /* ---------- Copy to Clipboard ---------- */
  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.install-copy-btn, .copy-prompt-btn');
    if (!copyBtn) return;

    const cmd = copyBtn.getAttribute('data-command');
    if (!cmd) return;

    navigator.clipboard.writeText(cmd).then(() => {
      // Show copied state
      const icon = copyBtn.querySelector('.copy-icon');
      const checkIcon = copyBtn.querySelector('.check-icon');
      if (icon) icon.style.display = 'none';
      if (checkIcon) checkIcon.style.display = 'inline';

      setTimeout(() => {
        if (icon) icon.style.display = 'inline';
        if (checkIcon) checkIcon.style.display = 'none';
      }, 1600);
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = cmd;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      const icon = copyBtn.querySelector('.copy-icon');
      const checkIcon = copyBtn.querySelector('.check-icon');
      if (icon) icon.style.display = 'none';
      if (checkIcon) checkIcon.style.display = 'inline';

      setTimeout(() => {
        if (icon) icon.style.display = 'inline';
        if (checkIcon) checkIcon.style.display = 'none';
      }, 1600);
    });
  });

  /* ---------- Parallax Effect ---------- */
  function initParallax() {
    const elements = document.querySelectorAll('[data-parallax]');
    if (!elements.length) return;

    function update() {
      elements.forEach((el) => {
        const speed = parseFloat(el.getAttribute('data-parallax') || '0.3');
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - window.innerHeight / 2;
        el.style.setProperty('--parallax-y', `${center * speed}px`);
      });
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------- Scroll Spy for TOC ---------- */
  function initScrollSpy() {
    const tocLinks = document.querySelectorAll('.toc-list a');
    if (!tocLinks.length) return;

    const headings = [];
    tocLinks.forEach((link) => {
      const id = link.getAttribute('href')?.replace('#', '');
      const heading = document.getElementById(id);
      if (heading) headings.push({ link, heading });
    });

    if (!headings.length) return;

    function update() {
      let current = headings[0];
      for (const h of headings) {
        const rect = h.heading.getBoundingClientRect();
        if (rect.top <= 120) current = h;
      }
      tocLinks.forEach((link) => link.classList.remove('active'));
      if (current) current.link.classList.add('active');
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- Mobile Nav Toggle ---------- */
  function initMobileNav() {
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('.mobile-nav-toggle');
      if (!toggle) return;

      const nav = document.querySelector('.mobile-nav');
      if (nav) {
        nav.classList.toggle('hidden');
      }
    });
  }

  /* ---------- Copy Agent Prompt ---------- */
  function initCopyPrompt() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-prompt-btn');
      if (!btn) return;

      const prompt = btn.getAttribute('data-prompt');
      if (!prompt) return;

      navigator.clipboard.writeText(prompt).then(() => {
        const label = btn.querySelector('.prompt-label');
        if (label) {
          const original = label.textContent;
          label.textContent = 'Copied!';
          setTimeout(() => { label.textContent = original; }, 1600);
        }
      }).catch(() => {});
    });
  }

  /* ---------- Smooth Scroll for Anchor Links ---------- */
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const id = link.getAttribute('href')?.slice(1);
      if (!id) return;

      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ---------- Toolkit Tabs (Home Page V2) ---------- */
  function initToolkitTabs() {
    const tabBtns = document.querySelectorAll('.toolkit-tab');
    if (!tabBtns.length) return;

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.toolkit-tabs');
        if (!group) return;

        // Deactivate all tabs
        group.querySelectorAll('.toolkit-tab').forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });

        // Activate clicked tab
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        // Show corresponding panel
        const target = btn.getAttribute('data-target');
        group.querySelectorAll('.toolkit-panel').forEach((panel) => {
          panel.style.display = panel.id === target ? 'block' : 'none';
        });
      });
    });
  }

  /* ---------- Init Everything ---------- */
  function init() {
    initParallax();
    initScrollSpy();
    initMobileNav();
    initCopyPrompt();
    initSmoothScroll();
    initToolkitTabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
