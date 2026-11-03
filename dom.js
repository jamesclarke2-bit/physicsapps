/**
 * Small DOM helpers shared by every view. No framework: `h()` builds an
 * element tree, `UI.toast()` shows a transient message, and a few
 * builders make the recurring pieces (stars, tier tags, feedback boxes,
 * multiple-choice lists) look the same everywhere.
 */
(function () {
  /**
   * h('div', { class: 'x', onclick: fn, html: '<b>raw</b>' }, child, 'text', [more])
   * Attribute values of false/null/undefined are skipped.
   */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    const a = attrs || {};
    Object.keys(a).forEach((k) => {
      const v = a[k];
      if (v === false || v === null || v === undefined) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    for (let i = 2; i < arguments.length; i++) appendChild(el, arguments[i]);
    return el;
  }

  function appendChild(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) child.forEach((c) => appendChild(el, c));
    else if (child instanceof Node) el.appendChild(child);
    else el.appendChild(document.createTextNode(String(child)));
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  function starsEl(n, max) {
    const total = max || 3;
    const span = h('span', { class: 'stars', 'aria-label': n + ' of ' + total + ' stars' });
    for (let i = 0; i < total; i++) span.appendChild(h('span', { class: i < n ? '' : 'off', 'aria-hidden': 'true' }, '★'));
    return span;
  }

  const TIER_LABEL = { gcse: 'GCSE', alevel: 'A-level', extension: 'Extension · A/A*' };

  function tierTag(tier) {
    return h('span', { class: 'tag tag-' + tier }, TIER_LABEL[tier] || tier);
  }

  function toast(message, kind) {
    let zone = document.querySelector('.toast-zone');
    if (!zone) {
      zone = h('div', { class: 'toast-zone', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(zone);
    }
    const t = h('div', { class: 'toast' + (kind === 'badge' ? ' badge-toast' : '') }, message);
    zone.appendChild(t);
    setTimeout(() => t.remove(), kind === 'badge' ? 5200 : 3200);
  }

  /** Show the events returned by Progress (badges, rank-ups) as toasts. */
  function announce(events) {
    (events || []).forEach((e) => {
      if (e.kind === 'badge') toast(h('span', null, h('b', null, '🏅 Badge: ' + e.title), ' — ' + e.desc), 'badge');
      if (e.kind === 'rank') toast(h('span', null, '⬆ New rank: ', h('b', null, e.title)), 'badge');
    });
  }

  /** Feedback box: kind 'ok' | 'no' | 'info'. Body may be a node, string or array. */
  function feedback(kind, title, body) {
    return h('div', { class: 'feedback ' + (kind || ''), role: 'status' }, h('div', { class: 'fb-title' }, title), body);
  }

  function misconceptionCallout(id) {
    const m = window.Misconceptions.getMisconception(id);
    if (!m) return null;
    return h(
      'div',
      { class: 'misconception-callout' },
      h('strong', null, 'Common misconception: '),
      '“' + m.title + '.” ',
      m.truth,
      ' ',
      h('a', { href: '#/fix/' + id }, 'Practise this →')
    );
  }

  /**
   * Multiple choice. options: [{ label (string|node), value, correct, feedback?, misconception? }]
   * onAnswer(option, index) is called once; the list then locks and shows right/wrong.
   */
  function choiceList(options, onAnswer, opts) {
    const o = opts || {};
    const wrap = h('div', { class: o.grid ? 'choice-grid' : 'choice-list', role: 'group', 'aria-label': o.ariaLabel || 'Answer options' });
    let locked = false;
    const buttons = options.map((opt, i) => {
      const b = h('button', { type: 'button', class: 'choice' }, opt.label);
      b.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        buttons.forEach((bb, k) => {
          bb.disabled = true;
          if (options[k].correct) bb.classList.add('correct');
        });
        if (!opt.correct) b.classList.add('wrong');
        onAnswer(opt, i);
      });
      wrap.appendChild(b);
      return b;
    });
    return wrap;
  }

  /** A segmented single-select control. Returns { el, value(), lock(correctValue) }. */
  function segmented(options, onChange, ariaLabel) {
    let value = null;
    const el = h('div', { class: 'segmented', role: 'group', 'aria-label': ariaLabel || '' });
    const buttons = options.map((opt) => {
      const b = h('button', { type: 'button', 'aria-pressed': 'false' }, opt.label);
      b.addEventListener('click', () => {
        if (el.dataset.locked) return;
        value = opt.value;
        buttons.forEach((bb) => bb.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        if (onChange) onChange(value);
      });
      el.appendChild(b);
      return b;
    });
    return {
      el,
      value: () => value,
      lock(correctValue) {
        el.dataset.locked = '1';
        buttons.forEach((b, i) => {
          b.disabled = true;
          if (options[i].value === correctValue) b.classList.add('correct');
          else if (options[i].value === value) b.classList.add('wrong');
        });
      },
    };
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      const t = copy[i];
      copy[i] = copy[k];
      copy[k] = t;
    }
    return copy;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Printing only works on the real site, not when the page is embedded in another page's frame.
  let embedded = false;
  try {
    embedded = window.self !== window.top;
  } catch (e) {
    embedded = true;
  }
  const canPrint = !embedded;

  window.UI = { canPrint, h, clear, starsEl, tierTag, toast, announce, feedback, misconceptionCallout, choiceList, segmented, shuffle, prefersReducedMotion, TIER_LABEL };
})();
