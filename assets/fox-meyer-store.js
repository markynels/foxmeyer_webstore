/* Fox Meyer Store — front-end behaviour for the Shop page + PDP.
   Self-contained: AJAX cart (add / change / remove), slide-in cart drawer,
   the 4/8-can box builder, quantity steppers, sticky mobile buy bar, toasts.
   Every DTC order is a box (4 or 8 cans), so shipping is always free — there
   is no free-shipping threshold or progress bar.
   Config is read from window.FMS (set in the section template). */
(function () {
  'use strict';

  var CFG = window.FMS || {};
  var MONEY_FORMAT = CFG.moneyFormat || '${{amount}}';
  var ROOT = (CFG.routesRoot || '/').replace(/\/$/, '');
  var CHAR = { fox: CFG.lineFox || '', gren: CFG.lineGren || '' };  // builder character art for cart lines
  var S = CFG.strings || {};  // locale strings (see snippets/fox-meyer-store-config.liquid); EN fallbacks below

  /* ---------- helpers ---------- */
  function money(cents) {
    var v = (cents / 100).toFixed(2);
    return MONEY_FORMAT.replace(/\{\{\s*amount\s*\}\}/, v);
  }
  function el(sel, ctx) { return (ctx || document).querySelector(sel); }
  function els(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function fmt(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }
  function cansWord(n) { return n === 1 ? (S.canOne || 'can') : (S.canOther || 'cans'); }

  // The DTC store sells whole boxes only (a 4-can box or an 8-can box). The cart
  // holds individual can variants, so a valid cart is any positive multiple of 4
  // (every combination of 4- and 8-can boxes sums to a multiple of 4). The drawer
  // lets shoppers rebalance Fox / Grenouille freely, but blocks checkout until the
  // cans add up to complete boxes — mirroring the box builder's "add N more cans".
  function boxState(count) {
    var remainder = count % 4;
    return {
      complete: count > 0 && remainder === 0,
      need: remainder === 0 ? 0 : 4 - remainder, // cans to reach the next full box
      over: remainder                            // cans spilling past the last full box
    };
  }

  // The two coffees ship without a product photo, so show the fox / frog
  // character in the cart drawer to match the box builder.
  function lineImage(item) {
    var h = (item.handle || '').toLowerCase();
    var t = (item.product_title || '').toLowerCase();
    if (CHAR.gren && (h.indexOf('grenouille') > -1 || t.indexOf('grenouille') > -1)) return CHAR.gren;
    if (CHAR.fox && (h.indexOf('fox') > -1 || t.indexOf('fox') > -1)) return CHAR.fox;
    return item.image ? item.image.replace(/(\.[a-z]+)(\?|$)/i, '_120x$1$2') : '';
  }

  /* ---------- drawer markup (injected once) ---------- */
  var drawer, overlay, toastEl;
  function buildDrawer() {
    overlay = document.createElement('div');
    overlay.className = 'fms-drawer-overlay';
    overlay.addEventListener('click', closeDrawer);

    drawer = document.createElement('aside');
    drawer.className = 'fms-drawer';
    drawer.setAttribute('aria-label', S.cartAria || 'Cart');
    drawer.innerHTML =
      '<div class="fms-drawer-head"><h2>' + (S.cartTitle || 'Your cart') + '</h2>' +
      '<button class="fms-drawer-close" aria-label="' + (S.close || 'Close cart') + '">&times;</button></div>' +
      '<div class="fms-drawer-body"></div>' +
      '<div class="fms-drawer-foot"></div>';
    el('.fms-drawer-close', drawer).addEventListener('click', closeDrawer);

    toastEl = document.createElement('div');
    toastEl.className = 'fms-toast';
    toastEl.setAttribute('role', 'status');

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    document.body.appendChild(toastEl);
  }

  function openDrawer() { overlay.classList.add('is-open'); drawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { overlay.classList.remove('is-open'); drawer.classList.remove('is-open'); document.body.style.overflow = ''; }

  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2200);
  }

  /* ---------- cart rendering ---------- */
  function renderCart(cart) {
    updateBubble(cart.item_count);

    var body = el('.fms-drawer-body', drawer);
    var foot = el('.fms-drawer-foot', drawer);

    if (!cart.item_count) {
      body.innerHTML = '<div class="fms-drawer-empty">' + (S.emptyHtml || 'Your cart is empty.<br>Build a box — shipping’s on us.') + '</div>';
      foot.innerHTML = '';
      return;
    }

    var lines = cart.items.map(function (item, i) {
      var src = lineImage(item);
      var img = src ? '<img src="' + src + '" alt="">' : '';
      return '<div class="fms-line" data-line="' + (i + 1) + '">' +
        '<div class="fms-line-img">' + img + '</div>' +
        '<div class="fms-line-info">' +
          '<div class="fms-line-title">' + item.product_title + '</div>' +
          '<div class="fms-line-meta">' + (item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title + ' · ' : '') + money(item.price) + ' ' + (S.each || 'each') + '</div>' +
          '<div class="fms-line-bottom">' +
            '<div class="fms-qty fms-qty-sm">' +
              '<button type="button" data-line-step="-1" data-line="' + (i + 1) + '" aria-label="' + (S.decrease || 'Decrease') + '">&minus;</button>' +
              '<input type="text" inputmode="numeric" value="' + item.quantity + '" data-line-input="' + (i + 1) + '" aria-label="' + (S.quantity || 'Quantity') + '">' +
              '<button type="button" data-line-step="1" data-line="' + (i + 1) + '" aria-label="' + (S.increase || 'Increase') + '">+</button>' +
            '</div>' +
            '<div class="fms-line-price">' + money(item.line_price) + '</div>' +
          '</div>' +
          '<button class="fms-line-remove" data-line-remove="' + (i + 1) + '">' + (S.remove || 'Remove') + '</button>' +
        '</div></div>';
    }).join('');

    var box = boxState(cart.item_count);
    var banner = box.complete
      ? '<div class="fms-ship-included">' + (S.freeShipping || 'Free shipping included') + '</div>'
      : '<div class="fms-box-warn" role="status">' +
          '<strong>' + (S.almostTitle || 'Almost a box') + '</strong>' +
          '<span>' + fmt(S.almostBody || 'Boxes come in 4 or 8 cans. Add {need} more {need_cans} — or remove {over} — to check out.',
            { need: box.need, need_cans: cansWord(box.need), over: box.over }) + '</span>' +
        '</div>';

    body.innerHTML = banner + lines;

    var action = box.complete
      ? '<a class="fms-btn fms-btn-orange" href="' + ROOT + '/checkout">' + (S.checkout || 'Checkout') + '</a>'
      : '<button type="button" class="fms-btn fms-btn-orange" disabled>' + fmt(S.addMore || 'Add {count} more {cans}', { count: box.need, cans: cansWord(box.need) }) + '</button>';

    foot.innerHTML =
      '<div class="fms-subtotal"><span>' + (S.subtotal || 'Subtotal') + '</span><strong>' + money(cart.total_price) + '</strong></div>' +
      action +
      '<p class="fms-drawer-fine">' + (S.finePrint || 'Taxes &amp; shipping calculated at checkout · Secure payment') + '</p>';

    // bind line controls
    els('[data-line-step]', body).forEach(function (b) {
      b.addEventListener('click', function () {
        var line = +b.getAttribute('data-line');
        var input = el('[data-line-input="' + line + '"]', body);
        var next = Math.max(0, (parseInt(input.value, 10) || 0) + parseInt(b.getAttribute('data-line-step'), 10));
        changeLine(line, next);
      });
    });
    els('[data-line-input]', body).forEach(function (inp) {
      inp.addEventListener('change', function () {
        changeLine(+inp.getAttribute('data-line-input'), Math.max(0, parseInt(inp.value, 10) || 0));
      });
    });
    els('[data-line-remove]', body).forEach(function (b) {
      b.addEventListener('click', function () { changeLine(+b.getAttribute('data-line-remove'), 0); });
    });
  }

  function updateBubble(count) {
    els('.fms-cart-count').forEach(function (b) {
      b.textContent = count;
      b.hidden = count < 1;
    });
  }

  /* ---------- cart API ---------- */
  function getCart() {
    return fetch(ROOT + '/cart.js', { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); });
  }
  function addItems(items, btn, toastMsg) {
    if (btn) btn.classList.add('is-loading');
    return fetch(ROOT + '/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: items })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) { toast(res.data.description || S.addError || 'Could not add to cart'); throw res.data; }
        return getCart();
      })
      .then(function (cart) {
        renderCart(cart);
        toast(toastMsg || S.added || 'Added to cart');
        openDrawer();
      })
      .catch(function () {})
      .finally(function () { if (btn) btn.classList.remove('is-loading'); });
  }
  function addToCart(id, quantity, btn) {
    return addItems([{ id: id, quantity: quantity }], btn);
  }
  function changeLine(line, quantity) {
    return fetch(ROOT + '/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ line: line, quantity: quantity })
    })
      .then(function (r) { return r.json(); })
      .then(renderCart);
  }

  /* ---------- box builder (4 / 8-can mix-and-match) ---------- */
  function bindBoxBuilder() {
    var root = el('[data-box-builder]');
    if (!root) return;

    var cans = {
      fox:  { id: root.getAttribute('data-fox-id'),  price: parseInt(root.getAttribute('data-fox-price'), 10) || 0 },
      gren: { id: root.getAttribute('data-gren-id'), price: parseInt(root.getAttribute('data-gren-price'), 10) || 0 }
    };
    if (!cans.fox.id || !cans.gren.id) return;

    var size = 4;
    var counts = { fox: 2, gren: 2 };

    var sizeBtns = els('[data-box-size]', root);
    var inputs   = { fox: el('[data-can-input="fox"]', root), gren: el('[data-can-input="gren"]', root) };
    var totalEl  = el('[data-box-total]', root);
    var countEl  = el('[data-box-count]', root);
    var targetEl = el('[data-box-target]', root);
    var dotsEl   = el('[data-box-dots]', root);
    var addBtn   = el('[data-box-add]', root);
    var addLabel = el('[data-box-add-label]', root);
    var musette  = el('[data-box-musette]', root);

    function sum()   { return counts.fox + counts.gren; }
    function total() { return counts.fox * cans.fox.price + counts.gren * cans.gren.price; }

    function render() {
      if (inputs.fox)  inputs.fox.value  = counts.fox;
      if (inputs.gren) inputs.gren.value = counts.gren;

      var picked = sum();
      if (countEl)  countEl.textContent  = picked;
      if (targetEl) targetEl.textContent = size;
      if (totalEl)  totalEl.textContent  = money(total());

      if (dotsEl) {
        var html = '';
        for (var i = 0; i < size; i++) html += '<i' + (i < picked ? ' class="is-on"' : '') + '></i>';
        dotsEl.innerHTML = html;
      }

      var remaining = size - picked;
      addBtn.disabled = remaining !== 0;
      if (addLabel) {
        addLabel.textContent = remaining > 0
          ? fmt(S.addMore || 'Add {count} more {cans}', { count: remaining, cans: cansWord(remaining) })
          : fmt(S.addBox || 'Add box — {total}', { total: money(total()) });
      }

      if (musette) musette.hidden = size !== 8;
    }

    function setSize(n) {
      size = n;
      counts.fox = n / 2;          // default to an even split (the suggested sampler)
      counts.gren = n - counts.fox;
      sizeBtns.forEach(function (b) {
        var on = parseInt(b.getAttribute('data-box-size'), 10) === n;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      render();
    }

    sizeBtns.forEach(function (b) {
      b.addEventListener('click', function () { setSize(parseInt(b.getAttribute('data-box-size'), 10)); });
    });

    els('[data-can-step]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var wrap = b.closest('[data-can-stepper]');
        if (!wrap) return;
        var can = wrap.getAttribute('data-can-stepper');
        var step = parseInt(b.getAttribute('data-can-step'), 10);
        if (step > 0 && sum() >= size) return;       // box is full
        var next = counts[can] + step;
        if (next < 0) return;
        counts[can] = next;
        render();
      });
    });

    addBtn.addEventListener('click', function () {
      if (sum() !== size) return;
      var items = [];
      if (counts.fox  > 0) items.push({ id: cans.fox.id,  quantity: counts.fox });
      if (counts.gren > 0) items.push({ id: cans.gren.id, quantity: counts.gren });
      if (!items.length) return;
      addItems(items, addBtn, fmt(S.boxAdded || '{size}-can box added', { size: size }));
    });

    setSize(4);
  }

  /* ---------- quantity steppers (product forms) ---------- */
  function bindSteppers() {
    els('.fms-qty[data-stepper]').forEach(function (wrap) {
      var input = el('input', wrap);
      els('[data-step]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          var next = Math.max(1, (parseInt(input.value, 10) || 1) + parseInt(b.getAttribute('data-step'), 10));
          input.value = next;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });
  }

  /* ---------- product forms (add to cart) ---------- */
  function bindForms() {
    els('form[data-fms-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var id = el('[name="id"]', form).value;
        var qtyInput = el('[name="quantity"]', form);
        var qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
        var btn = el('[data-add]', form);
        addToCart(id, qty, btn);
      });
    });
  }

  /* ---------- open-cart triggers ---------- */
  function bindCartTriggers() {
    els('[data-open-cart]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); getCart().then(function (c) { renderCart(c); openDrawer(); }); });
    });
  }

  /* ---------- sticky mobile buy bar (PDP) ---------- */
  function bindStickyBar() {
    var bar = el('.fms-stickybar');
    if (!bar) return;
    var anchor = el('[data-sticky-anchor]');
    if (!anchor) { return; }
    var io = new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-visible', !entries[0].isIntersecting);
    }, { rootMargin: '0px 0px -40% 0px' });
    io.observe(anchor);

    // sticky "add" button mirrors the main product form
    var stickyAdd = el('[data-sticky-add]', bar);
    if (stickyAdd) {
      stickyAdd.addEventListener('click', function () {
        var form = el('form[data-fms-form]');
        if (!form) return;
        var id = el('[name="id"]', form).value;
        var qtyInput = el('[name="quantity"]', form);
        var qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
        addToCart(id, qty, stickyAdd);
      });
    }
  }

  /* ---------- PDP gallery thumbs ---------- */
  function bindGallery() {
    var main = el('[data-gallery-main]');
    if (!main) return;
    els('[data-thumb]').forEach(function (t) {
      t.addEventListener('click', function () {
        var src = t.getAttribute('data-thumb');
        main.src = src;
        els('[data-thumb]').forEach(function (x) { x.classList.remove('is-active'); });
        t.classList.add('is-active');
      });
    });
  }

  /* ---------- init ---------- */
  function init() {
    buildDrawer();
    bindBoxBuilder();
    bindSteppers();
    bindForms();
    bindCartTriggers();
    bindStickyBar();
    bindGallery();
    getCart().then(function (c) { updateBubble(c.item_count); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
