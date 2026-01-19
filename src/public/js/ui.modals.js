(function () {
    // avoid duplicate init
    if (window.UI && window.UI._initDone) return;
    window.UI = window.UI || {};
    window.UI._initDone = true;

    function createOverlay() {
        const ov = document.createElement('div');
        ov.className = 'ui-modal-overlay';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:99999;';
        return ov;
    }

    function createBox(title, message, opts = {}) {
        const box = document.createElement('div');
        box.className = 'ui-modal-box';
        box.style.cssText = 'min-width:320px;max-width:92vw;background:#0f1724;padding:18px;border-radius:12px;color:#e6eef8;box-shadow:0 8px 40px rgba(0,0,0,0.6);font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;';
        const msg = document.createElement('div');
        msg.style.cssText = 'margin-bottom:14px;white-space:pre-wrap;line-height:1.45;color:#cfe7ff;font-size:0.98rem';
        msg.textContent = message || '';
        box.appendChild(msg);

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
        // optional cancel
        if (opts.showCancel) {
            const c = document.createElement('button');
            c.className = 'ui-btn ui-cancel';
            c.textContent = opts.cancelText || 'Hủy';
            c.style.cssText = 'background:transparent;border:1px solid rgba(255,255,255,0.06);color:#eaf4ff;padding:8px 12px;border-radius:8px;cursor:pointer';
            actions.appendChild(c);
        }
        const ok = document.createElement('button');
        ok.className = 'ui-btn ui-ok';
        ok.textContent = opts.okText || 'Đồng ý';
        ok.style.cssText = 'background:linear-gradient(90deg,#4f8cff,#2563eb);border:none;color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:700';
        actions.appendChild(ok);

        box.appendChild(actions);
        return { box, ok, cancel: actions.querySelector('.ui-cancel') };
    }

    function showModal(message, opts = {}) {
        return new Promise((resolve) => {
            const ov = createOverlay();
            const { box, ok, cancel } = createBox(opts.title || '', message, opts);
            ov.appendChild(box);
            document.body.appendChild(ov);

            // focus handling
            ok.focus();

            function clean() {
                try { ov.remove(); } catch (e) { /* noop */ }
            }

            ok.addEventListener('click', () => { clean(); resolve({ action: 'ok' }); });
            if (cancel) cancel.addEventListener('click', () => { clean(); resolve({ action: 'cancel' }); });

            // keyboard
            function onKey(e) {
                if (e.key === 'Escape') { clean(); resolve({ action: 'cancel' }); }
                if (e.key === 'Enter') { clean(); resolve({ action: 'ok' }); }
            }
            document.addEventListener('keydown', onKey, { once: true });

            // click outside closes when showCancel true
            if (opts.showCancel) {
                ov.addEventListener('click', (ev) => {
                    if (ev.target === ov) { clean(); resolve({ action: 'cancel' }); }
                });
            }
        });
    }

    // Public APIs
    window.UI.alert = async function (message, opts = {}) {
        await showModal(message, Object.assign({}, opts, { showCancel: false, okText: opts.okText || 'Đóng' }));
    };

    window.UI.confirm = async function (message, opts = {}) {
        const res = await showModal(message, Object.assign({}, opts, { showCancel: true, okText: opts.okText || 'Đồng ý', cancelText: opts.cancelText || 'Hủy' }));
        return res && res.action === 'ok';
    };

    // small CSS fallback (prevent collisions)
    const style = document.createElement('style');
    style.textContent = `
    .ui-modal-overlay { animation: fadeIn .12s ease; }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    `;
    document.head.appendChild(style);
})();
