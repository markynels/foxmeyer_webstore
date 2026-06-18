/* Fox Meyer Store — front-end behaviour for the Shop page + PDP.
   Self-contained: AJAX cart (add / change / remove), slide-in cart drawer,
   free-shipping progress, quantity steppers, sticky mobile buy bar, toasts.
   Config is read from window.FMS (set in the section template). */
(function () {
  'use strict';

  var CFG = window.FMS || {};
  var FREE_SHIP_QTY = CFG.freeShipQty || 4;        // cans needed for free shipping
  var MONEY_FORMAT = CFG.moneyFormat || '${{amount}}';
  var ROOT = (CFG.routesRoot || '/').replace(/\/$/, '');

  /* ---------- helpers ---------- */
  function money(cents) {
    var v = (cents / 100).toFixed(2);
    return MONEY_FORMAT.replace(/\{\{\s*amount\s*\}\}/, v);
  }
  function el(sel, ctx) { return (ctx || document).querySelector(sel); }
  function els(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- drawer markup (injected once) ---------- */
  var drawer, overlay, toastEl;
  function buildDrawer() {
    overlay = document.createElement('div');
    overlay.className = 'fms-drawer-overlay';
    overlay.addEventListener('click', closeDrawer);

    drawer = document.createElement('aside');
    drawer.className = 'fms-drawer';
    drawer.setAttribute('aria-label', 'Cart');
    drawer.innerHTML =
      '<div class="fms-drawer-head"><h2>Your cart</h2>' +
      '<button class="fms-drawer-close" aria-label="Close cart">&times;</button></div>' +
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
      body.innerHTML = '<div class="fms-drawer-empty">Your cart is empty.<br>Fresh cans are one click away.</div>';
      foot.innerHTML = '';
      return;
    }

    // free-shipping progress is based on total can quantity
    var qty = cart.item_count;
    var remaining = Math.max(0, FREE_SHIP_QTY - qty);
    var pct = Math.min(100, Math.round((qty / FREE_SHIP_QTY) * 100));
    var progress =
      '<div class="fms-ship-progress">' +
      (remaining > 0
        ? '<p>Add <strong>' + remaining + ' more</strong> ' + (remaining === 1 ? 'can' : 'cans') + ' for <strong>free shipping</strong>.</p>'
        : '<p><strong>You’ve unlocked free shipping.</strong> Nice.</p>') +
      '<div class="fms-bar"><i style="width:' + pct + '%"></i></div></div>';

    var lines = cart.items.map(function (item, i) {
      var img = item.image
        ? '<img src="' + item.image.replace(/(\.[a-z]+)(\?|$)/i, '_120x$1$2') + '" alt="">'
        : '';
      return '<div class="fms-line" data-line="' + (i + 1) + '">' +
        '<div class="fms-line-img">' + img + '</div>' +
        '<div class="fms-line-info">' +
          '<div class="fms-line-title">' + item.product_title + '</div>' +
          '<div class="fms-line-meta">' + (item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title + ' · ' : '') + money(item.price) + ' each</div>' +
          '<div class="fms-line-bottom">' +
            '<div class="fms-qty fms-qty-sm">' +
              '<button type="button" data-line-step="-1" data-line="' + (i + 1) + '" aria-label="Decrease">&minus;</button>' +
              '<input type="text" inputmode="numeric" value="' + item.quantity + '" data-line-input="' + (i + 1) + '" aria-label="Quantity">' +
              '<button type="button" data-line-step="1" data-line="' + (i + 1) + '" aria-label="Increase">+</button>' +
            '</div>' +
            '<div class="fms-line-price">' + money(item.line_price) + '</div>' +
          '</div>' +
          '<button class="fms-line-remove" data-line-remove="' + (i + 1) + '">Remove</button>' +
        '</div></div>';
    }).join('');

    body.innerHTML = progress + lines;

    foot.innerHTML =
      '<div class="fms-subtotal"><span>Subtotal</span><strong>' + money(cart.total_price) + '</strong></div>' +
      '<a class="fms-btn fms-btn-orange" href="' + ROOT + '/checkout">Checkout</a>' +
      '<p class="fms-drawer-fine">Taxes &amp; shipping calculated at checkout · Secure payment</p>';

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
  function addToCart(id, quantity, btn) {
    if (btn) btn.classList.add('is-loading');
    return fetch(ROOT + '/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: id, quantity: quantity }] })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) { toast(res.data.description || 'Could not add to cart'); throw res.data; }
        return getCart();
      })
      .then(function (cart) {
        renderCart(cart);
        toast('Added to cart');
        openDrawer();
      })
      .catch(function () {})
      .finally(function () { if (btn) btn.classList.remove('is-loading'); });
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
