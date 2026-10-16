/* UniPark+ Diagram Studio — autosave add-on (injected by vite.config.diagram.ts, keeps index.html untouched).
 * - Wraps the built-in save(): surfaces errors (quota) instead of swallowing them.
 * - Polls for uncommitted edits (typing in fields) and flushes on tab hide / close.
 * - Keeps rolling backups so a "new"/"sample"/import that replaced the doc can be restored after reload.
 * Relies on globals from the main script: doc, snapshot, save, normDoc, commit, afterLoad, LS_KEY, modal, closeModal, confirmModal, toast, esc, uiIcon, $.
 */
(() => {
  if (typeof snapshot !== 'function' || typeof LS_KEY !== 'string') return;

  const BK_KEY = LS_KEY + '.backups';
  const POLL_MS = 1500;
  const BACKUP_EVERY_MS = 5 * 60 * 1000;
  const MAX_BACKUPS = 20;

  let lastSaved = null;
  let lastSavedAt = null;
  let status = 'saved';

  /* ---------- status chip ---------- */
  const chip = document.createElement('button');
  chip.className = 'btn flex-none';
  chip.id = 'autosaveChip';
  chip.style.cssText = 'height:24px;padding:0 8px;font-size:12px;color:var(--muted);font-weight:400';
  chip.title = 'Tự động lưu vào trình duyệt — bấm để xem các bản lưu';
  chip.onclick = openBackups;
  const nameInput = $('#docName');
  if (nameInput) nameInput.parentElement.appendChild(chip);

  const hhmm = t => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateTime = t => new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  function paint() {
    if (status === 'error') {
      chip.innerHTML = `${uiIcon('circle-alert', 14)}<span>Lỗi lưu — hãy Xuất JSON</span>`;
      chip.style.color = 'var(--danger)';
    } else if (status === 'dirty') {
      chip.innerHTML = `${uiIcon('save', 14)}<span>Đang lưu…</span>`;
      chip.style.color = 'var(--muted)';
    } else {
      chip.innerHTML = `${uiIcon('cloud-check', 14)}<span>Đã lưu${lastSavedAt ? ' · ' + hhmm(lastSavedAt) : ''}</span>`;
      chip.style.color = 'var(--muted)';
    }
  }

  /* ---------- storage ---------- */
  function readBackups() {
    try { const a = JSON.parse(localStorage.getItem(BK_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function writeBackups(list) {
    // Drop oldest entries until it fits; the main document always has priority over backups.
    while (list.length) {
      try { localStorage.setItem(BK_KEY, JSON.stringify(list)); return true; } catch (e) { list.shift(); }
    }
    try { localStorage.removeItem(BK_KEY); } catch (e) {}
    return false;
  }
  function addBackup(data, reason) {
    const list = readBackups();
    if (list.length && list[list.length - 1].data === data) return;
    let name = '';
    try { name = JSON.parse(data).name || ''; } catch (e) {}
    list.push({ t: Date.now(), name, reason, data });
    while (list.length > MAX_BACKUPS) list.shift();
    writeBackups(list);
  }

  function persist(force) {
    const s = snapshot();
    if (!force && s === lastSaved) return;
    try {
      localStorage.setItem(LS_KEY, s);
    } catch (e) {
      // Free space taken by backups, then retry once.
      try { localStorage.removeItem(BK_KEY); localStorage.setItem(LS_KEY, s); } catch (e2) {
        if (status !== 'error') toast('Không lưu được vào trình duyệt (bộ nhớ đầy). Hãy dùng Xuất JSON.');
        status = 'error'; paint(); return;
      }
    }
    lastSaved = s; lastSavedAt = Date.now(); status = 'saved'; paint();
  }

  // Replace the built-in silent save() — the main script calls it via the global binding.
  window.save = () => persist(false);

  /* ---------- backups ---------- */
  let lastBackupAt = Date.now();
  function maybeBackup(reason) {
    if (lastSaved == null) return;
    addBackup(lastSaved, reason);
    lastBackupAt = Date.now();
  }

  // Snapshot the doc before actions that replace it wholesale.
  document.addEventListener('click', e => {
    const b = e.target.closest('#myes, [data-act="importFile"], [data-act="importPaste"]');
    if (b) { persist(false); maybeBackup('Trước khi thay nội dung'); }
  }, true);

  /* ---------- autosave loop ---------- */
  setInterval(() => {
    if (snapshot() !== lastSaved) { status = 'dirty'; paint(); persist(false); }
    if (Date.now() - lastBackupAt >= BACKUP_EVERY_MS && readBackups().slice(-1)[0]?.data !== lastSaved) maybeBackup('Tự động');
  }, POLL_MS);
  const flush = () => persist(false);
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  // Another tab of the studio saved: warn instead of silently overwriting each other.
  window.addEventListener('storage', e => {
    if (e.key === LS_KEY && e.newValue && e.newValue !== snapshot()) toast('Sơ đồ vừa được sửa ở tab khác — tải lại trang để đồng bộ.');
  });

  /* ---------- restore UI ---------- */
  function openBackups() {
    const list = readBackups().slice().reverse();
    const kb = s => (s.length / 1024).toFixed(0) + ' KB';
    const rows = list.length
      ? list.map((b, i) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)">
          <div style="flex:1;min-width:0"><div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(b.name || 'Sơ đồ')}</div>
          <div style="font-size:12px;color:var(--muted)">${dateTime(b.t)} · ${esc(b.reason || '')} · ${kb(b.data)}</div></div>
          <button class="btn outline" data-bk="${i}">${uiIcon('history', 14)}Khôi phục</button></div>`).join('')
      : `<p style="color:var(--muted)">Chưa có bản sao lưu nào. Bản sao lưu được tạo mỗi 5 phút khi có thay đổi, khi mở trang và trước khi thay nội dung (Sơ đồ trống, Mẫu, Nhập JSON).</p>`;
    modal('Bản lưu tự động',
      `<p style="font-size:12px;color:var(--muted);margin-bottom:8px">Lưu lần cuối: ${lastSavedAt ? dateTime(lastSavedAt) : '—'}. Dữ liệu chỉ nằm trong trình duyệt này (theo địa chỉ ${esc(location.origin)}).</p>${rows}`,
      `<button class="btn outline" id="bkNow">${uiIcon('save', 14)}Tạo bản sao lưu ngay</button><button class="btn outline" id="bkClear">Xoá các bản sao lưu</button>`, 520);
    $('#bkNow').onclick = () => { persist(true); maybeBackup('Thủ công'); openBackups(); toast('Đã tạo bản sao lưu'); };
    $('#bkClear').onclick = () => { try { localStorage.removeItem(BK_KEY); } catch (e) {} openBackups(); };
    document.querySelectorAll('[data-bk]').forEach(btn => btn.onclick = () => {
      const b = list[+btn.dataset.bk];
      closeModal();
      confirmModal('Khôi phục bản lưu?', `Sơ đồ hiện tại sẽ được thay bằng bản lúc ${dateTime(b.t)}. Bạn có thể hoàn tác bằng Ctrl+Z.`, () => {
        try { doc = normDoc(JSON.parse(b.data)); commit(); afterLoad(); toast('Đã khôi phục'); } catch (e) { toast('Bản lưu bị hỏng, không khôi phục được'); }
      });
    });
  }

  /* ---------- boot ---------- */
  persist(true);
  maybeBackup('Khi mở trang');
})();
