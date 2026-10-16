/* UniPark+ Diagram Studio — add-on giao diện (tiêm qua vite.config.diagram.ts, giữ index.html nguyên vẹn).
 * - Nhập JSON: hỏi "Thêm vào sơ đồ hiện tại" hay "Thay thế" thay vì luôn ghi đè sơ đồ đang có.
 * - Nút « thu gọn / » mở lại panel trái, nhớ trạng thái trong trình duyệt.
 * - Nút toàn màn hình (như F11), phím tắt F.
 * Dùng biến/hàm toàn cục của script chính: doc, S, normDoc, afterLoad, commit, fit, render, uid, modal,
 * closeModal, toast, uiIcon, isTyping, $.
 */
(() => {
  if (typeof importText !== 'function' || typeof normDoc !== 'function') return;

  const LEFT_KEY = 'unipark-diagram-studio.leftCollapsed';
  const MERGE_GAP = 120;

  const style = document.createElement('style');
  style.textContent = `
    @media (min-width: 961px) {
      .work.left-collapsed:not(.gantt-mode) { grid-template-columns: 0 1fr 280px; }
      .work.left-collapsed:not(.gantt-mode) #leftPanel { visibility: hidden; overflow: hidden; border: 0; }
    }
    #leftPanel .tabs { position: relative; padding-right: 34px; }
    #leftCollapseBtn { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); }
    #leftExpandBtn { position: absolute; left: 10px; top: 10px; z-index: 15; background: var(--panel);
      border: 1px solid var(--line); box-shadow: 0 2px 8px rgba(15,20,30,.12); }
    @media (max-width: 960px) { #leftCollapseBtn, #leftExpandBtn { display: none !important; } }
  `;
  document.head.appendChild(style);

  /* ---------- Nhập JSON: thêm vào thay vì ghi đè ---------- */
  const replaceImport = importText;

  function boxOf(elements) {
    const visible = elements.filter(e => !e.hidden);
    if (!visible.length) return null;
    const x = Math.min(...visible.map(e => e.x)), y = Math.min(...visible.map(e => e.y));
    const r = Math.max(...visible.map(e => e.x + e.w)), b = Math.max(...visible.map(e => e.y + e.h));
    return { x, y, w: r - x, h: b - y };
  }

  function mergeInto(raw) {
    const incoming = normDoc(raw);
    const taken = new Set([...doc.elements.map(e => e.id), ...doc.edges.map(e => e.id)]);
    const fresh = prefix => { let id; do { id = uid(prefix); } while (taken.has(id)); taken.add(id); return id; };
    const idMap = new Map();

    // Đặt sơ đồ mới ngay bên dưới sơ đồ cũ, căn lề trái - không chồng lên nhau
    const cur = boxOf(doc.elements), inc = boxOf(incoming.elements);
    const dx = cur && inc ? cur.x - inc.x : 0;
    const dy = cur && inc ? cur.y + cur.h + MERGE_GAP - inc.y : 0;

    const elements = incoming.elements.map(e => {
      const id = taken.has(e.id) ? fresh(e.type) : (taken.add(e.id), e.id);
      idMap.set(e.id, id);
      return { ...e, id, x: e.x + dx, y: e.y + dy };
    });
    const edges = incoming.edges
      .filter(e => idMap.has(e.from.id) && idMap.has(e.to.id))
      .map(e => ({
        ...e,
        id: taken.has(e.id) ? fresh('edge') : (taken.add(e.id), e.id),
        from: { ...e.from, id: idMap.get(e.from.id) },
        to: { ...e.to, id: idMap.get(e.to.id) },
        // Điểm uốn lưu toạ độ tuyệt đối nên phải dời cùng các phần tử
        points: Array.isArray(e.points) ? e.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) : e.points,
      }));

    doc.elements.push(...elements);
    doc.edges.push(...edges);
    S.sel = new Set(elements.filter(e => !e.locked).map(e => e.id));
    S.edgeSel = null;
    afterLoad(); commit(); fit(); closeModal();
    toast(`Đã thêm ${elements.length} đối tượng, ${edges.length} liên kết vào sơ đồ hiện tại (Gantt giữ nguyên)`);
    return true;
  }

  window.importText = txt => {
    let raw;
    try { raw = JSON.parse(txt); } catch (err) { return replaceImport(txt); }
    // Tệp chỉ có Gantt, hoặc sơ đồ hiện tại đang trống -> giữ hành vi gốc
    if (!raw || !Array.isArray(raw.elements) || !raw.elements.length || !doc.elements.length) return replaceImport(txt);

    const count = raw.elements.length;
    modal('Nhập sơ đồ',
      `<p>Tệp có <b>${count}</b> đối tượng. Sơ đồ hiện tại đang có <b>${doc.elements.length}</b> đối tượng.</p>
       <p class="text-muted mt-2" style="font-size:12.5px">
         <b>Thêm vào</b>: giữ sơ đồ cũ, đặt sơ đồ mới ngay bên dưới (Gantt giữ nguyên).<br>
         <b>Thay thế</b>: xoá sơ đồ hiện tại rồi mở tệp này. Vẫn khôi phục được bằng Ctrl+Z hoặc mục Bản lưu tự động.</p>`,
      `<button class="btn outline" id="impReplace">${uiIcon('replace')}Thay thế</button>
       <button class="btn primary" id="impMerge">${uiIcon('copy-plus')}Thêm vào sơ đồ hiện tại</button>`, 520);
    $('#impReplace').onclick = () => replaceImport(txt);
    $('#impMerge').onclick = () => {
      try { mergeInto(raw); } catch (err) { toast('Không nhập được: ' + (err.message || 'JSON không hợp lệ')); }
    };
    return true;
  };

  /* ---------- Thu gọn panel trái ---------- */
  const work = $('.work'), leftTabs = $('#leftPanel .tabs'), canvasWrap = $('#canvasWrap');

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'ibtn';
  collapseBtn.id = 'leftCollapseBtn';
  collapseBtn.title = 'Thu gọn bảng bên trái';
  collapseBtn.setAttribute('aria-label', 'Thu gọn bảng bên trái');
  collapseBtn.innerHTML = uiIcon('chevrons-left');
  leftTabs.appendChild(collapseBtn);

  const expandBtn = document.createElement('button');
  expandBtn.className = 'ibtn';
  expandBtn.id = 'leftExpandBtn';
  expandBtn.title = 'Mở bảng bên trái';
  expandBtn.setAttribute('aria-label', 'Mở bảng bên trái');
  expandBtn.innerHTML = uiIcon('chevrons-right');
  canvasWrap.appendChild(expandBtn);

  function setLeftCollapsed(collapsed) {
    work.classList.toggle('left-collapsed', collapsed);
    expandBtn.style.display = collapsed ? '' : 'none';
    try { localStorage.setItem(LEFT_KEY, collapsed ? '1' : '0'); } catch (e) {}
  }
  collapseBtn.onclick = () => setLeftCollapsed(true);
  expandBtn.onclick = () => setLeftCollapsed(false);
  let startCollapsed = false;
  try { startCollapsed = localStorage.getItem(LEFT_KEY) === '1'; } catch (e) {}
  setLeftCollapsed(startCollapsed);

  /* ---------- Toàn màn hình ---------- */
  const fsBtn = document.createElement('button');
  fsBtn.className = 'ibtn flex-none';
  fsBtn.id = 'fullscreenBtn';
  const themeBtn = $('#themeBtn');
  themeBtn.parentElement.insertBefore(fsBtn, themeBtn);

  const isFullscreen = () => !!document.fullscreenElement;
  function paintFs() {
    const on = isFullscreen();
    fsBtn.innerHTML = uiIcon(on ? 'minimize' : 'maximize');
    fsBtn.title = on ? 'Thoát toàn màn hình (F / Esc)' : 'Toàn màn hình (F)';
    fsBtn.setAttribute('aria-label', fsBtn.title);
  }
  function toggleFullscreen() {
    const req = isFullscreen() ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    req?.catch?.(() => toast('Trình duyệt không cho bật toàn màn hình'));
  }
  fsBtn.onclick = toggleFullscreen;
  document.addEventListener('fullscreenchange', paintFs);
  window.addEventListener('keydown', ev => {
    if (ev.key.toLowerCase() !== 'f' || ev.ctrlKey || ev.metaKey || ev.altKey || isTyping()) return;
    if ($('#modalRoot').children.length) return;
    ev.preventDefault();
    toggleFullscreen();
  });
  paintFs();
})();
