/* UniPark+ Diagram Studio — add-on "liên kết thông minh" (tiêm qua vite.config.diagram.ts, giữ index.html nguyên vẹn).
 * - Kiểu nối "Thông minh": đường vuông góc tự né các khối, tránh chạy chồng lên đường khác, ít khúc gấp,
 *   tự đặt nhãn vào chỗ trống và vẽ cầu nhảy tại chỗ hai đường cắt nhau.
 * - Mục "Gợi ý bố cục" trong Inspector: chọn một khối / đường nối sẽ thấy vài cách dời hoặc nối lại kèm
 *   số giao cắt, khúc gấp giảm được; rê chuột lên gợi ý để xem trước, bấm để áp dụng (Ctrl+Z hoàn tác được).
 * - Kéo thả trên khung vẽ không còn bôi đen chữ.
 * Dùng biến/hàm toàn cục của script chính: doc, S, byId, anchorPt, cleanPts, autoOrtho, edgePts, renderEdge,
 * renderInspector, segField, lastEdgeStyle, roundedPath, pointAt, polyLen, layoutText, drawLines, arrowHead,
 * dashFor, textW, childrenOf, commit, render, toast, uiIcon, esc, r1, isTyping, $.
 */
(() => {
  if (typeof edgePts !== 'function' || typeof renderEdge !== 'function' || typeof autoOrtho !== 'function') return;

  const origEdgePts = edgePts;
  const origRenderEdge = renderEdge;
  const origRenderInspector = renderInspector;
  const origSegField = segField;
  const origLastEdgeStyle = lastEdgeStyle;

  // Đơn vị phạt quy về "px đường đi": thuật toán chấp nhận đi vòng thêm chừng ấy px để tránh một lỗi
  const MARGIN = 14;          // khoảng hở giữa đường và mép khối
  const BEND = 34;            // mỗi khúc gấp
  const OVERLAP_BASE = 20;    // chạy trùng lên đường khác (mỗi đoạn lưới)
  const OVERLAP_PER_PX = 6;
  const NEAR_DIST = 10;       // chạy song song quá sát
  const NEAR_PER_PX = 1.2;
  const CROSS = 26;           // cắt ngang đường khác
  const HUG_PER_PX = 0.35;    // đi men sát mép khối thay vì giữa khe
  const SOFT_PER_PX = 2.5;    // đi qua dòng tiêu đề của nhóm
  const HOP_R = 4.5;
  const MAX_ITER = 250000;

  const DV = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const DIR_OF = { right: 0, bottom: 1, left: 2, top: 3 };
  const SIDES = ['top', 'right', 'bottom', 'left'];

  const isSmart = e => e.routing === 'smart' && !(e.points && e.points.length);
  const portKey = (e, end) => `${e[end].id}|${e[end].side}|${e[end].t}`;

  /* ================= Chặn bôi đen chữ khi kéo ================= */
  const style = document.createElement('style');
  style.textContent = `
    #canvasWrap, #stage, #stage * { -webkit-user-select: none; user-select: none; }
    body.ds-dragging, body.ds-dragging * { -webkit-user-select: none !important; user-select: none !important; }
    .ds-sug { display: grid; grid-template-columns: 22px 1fr; gap: 8px; width: 100%; text-align: left; padding: 8px 9px;
      border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--text); cursor: pointer;
      transition: border-color .15s, background .15s; }
    .ds-sug:hover, .ds-sug:focus-visible { border-color: var(--accent); background: var(--accent-soft); outline: none; }
    .ds-sug .ds-ico { color: var(--accent); padding-top: 1px; }
    .ds-sug .ds-t { display: block; font-size: 12px; font-weight: 600; line-height: 1.35; }
    .ds-sug .ds-d { display: block; margin-top: 2px; font-size: 11px; line-height: 1.4; color: var(--muted); font-weight: 400; }
    .ds-sug[aria-busy="true"] { opacity: .6; pointer-events: none; }
    .ds-sug .ds-m { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .ds-chip { font-size: 10.5px; line-height: 1; padding: 3px 5px; border-radius: 4px; background: var(--panel-2); color: var(--muted); }
    .ds-chip.good { color: var(--ok); } .ds-chip.bad { color: var(--danger); }
    .ds-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .ds-stat { background: var(--panel-2); border-radius: 6px; padding: 6px 4px; text-align: center; }
    .ds-stat b { display: block; font-size: 15px; } .ds-stat span { font-size: 10.5px; color: var(--muted); }
    [data-seg="routing"] button { white-space: nowrap; font-size: 11.5px; padding-left: 2px; padding-right: 2px; }
    .ds-note { font-size: 11.5px; line-height: 1.5; color: var(--muted); }
    .ds-spin { animation: ds-spin 1s linear infinite; display: inline-flex; } @keyframes ds-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);

  const stageEl = $('#stage');
  // pointerdown không ngăn được trình duyệt bắt đầu chọn chữ - phải chặn ở mousedown
  stageEl.addEventListener('mousedown', ev => {
    if (ev.button !== 0 || ev.target.closest('input, textarea, [contenteditable="true"]')) return;
    ev.preventDefault();
    if (isTyping()) document.activeElement.blur();
  });
  stageEl.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    window.getSelection()?.removeAllRanges();
    document.body.classList.add('ds-dragging');
  });
  /* ================= Nháy đúp ================= */
  // Studio vẽ lại toàn bộ khung (innerHTML) ngay trong pointerdown. Chrome/Edge thấy phần tử bị nhấn đã bị
  // thay mới nên KHÔNG phát click/dblclick, khiến nháy đúp lên đường (thêm/xoá điểm uốn) và lên khối (sửa
  // chữ) của bản gốc không bao giờ chạy. Tự nhận diện nháy đúp từ hai lần nhấn liên tiếp, và tìm đường /
  // điểm uốn theo toạ độ con trỏ thay vì theo phần tử DOM.
  const HIT_PX = 8, DOUBLE_MS = 450, DOUBLE_PX = 6;
  let lastDown = null, handledAt = 0;

  function insertWaypoint(wx, wy, tol, labelHit) {
    let best = null;
    for (const e of doc.edges) {
      const A = byId(e.from.id), B = byId(e.to.id);
      if (!A || !B || A.hidden || B.hidden) continue;
      const pts = edgePts(e);
      if (!pts) continue;
      for (let i = 1; i < pts.length; i++) {
        // Đường đang chọn được ưu tiên khi hai đường nằm sát nhau
        const d = segDist([wx, wy], pts[i - 1], pts[i]) - (e.id === S.edgeSel ? tol / 2 : 0);
        if ((d <= tol || e.id === labelHit) && (!best || d < best.d)) best = { e, i, d, pts };
      }
    }
    if (!best) return false;
    const { e, i, pts } = best;
    const inner = pts.slice(1, -1).map(p => ({ x: r1(p[0]), y: r1(p[1]) }));
    inner.splice(i - 1, 0, { x: r1(wx), y: r1(wy) });
    e.points = inner;
    S.sel.clear();
    S.edgeSel = e.id;
    return true;
  }

  function handleDouble(ev) {
    const [wx, wy] = toWorld(ev.clientX, ev.clientY), tol = HIT_PX / S.zoom;
    const selected = S.edgeSel && doc.edges.find(e => e.id === S.edgeSel);
    // 1. Trúng điểm uốn của đường đang chọn -> xoá điểm đó
    if (selected?.points) {
      const i = selected.points.findIndex(p => Math.hypot(p.x - wx, p.y - wy) <= tol * 1.2);
      if (i >= 0) {
        selected.points.splice(i, 1);
        if (!selected.points.length) selected.points = null;
        commit(); render(); renderInspector();
        return true;
      }
    }
    // 2. Trúng đường nối -> thêm điểm uốn (đường chuyển sang "Tự chỉnh", hiện nút kéo)
    if (insertWaypoint(wx, wy, tol, ev.target.closest?.('[data-edge]')?.dataset.edge)) {
      commit(); render(); renderInspector();
      return true;
    }
    // 3. Trúng khối -> chọn và đưa con trỏ vào ô nội dung, đúng như ý định của trình xử lý gốc
    const hit = elAt(wx, wy);
    if (!hit) return false;
    S.edgeSel = null;
    S.sel = new Set([hit.id]);
    render(); renderInspector();
    const field = $('#inspector [data-focus]');
    if (field) { openRight(); field.focus(); field.select?.(); }
    return true;
  }

  stageEl.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || S.space || S.tool === 'hand') { lastDown = null; return; }
    const now = performance.now();
    const isDouble = lastDown && now - lastDown.t < DOUBLE_MS && Math.hypot(ev.clientX - lastDown.x, ev.clientY - lastDown.y) < DOUBLE_PX;
    lastDown = isDouble ? null : { t: now, x: ev.clientX, y: ev.clientY };
    if (isDouble && handleDouble(ev)) {
      // Chặn pointerdown gốc để lần nhấn thứ hai không bắt đầu kéo / quét chọn
      handledAt = now;
      ev.stopImmediatePropagation();
      ev.preventDefault();
    }
  }, true);
  // Trình duyệt nào vẫn phát dblclick thì chặn trình xử lý gốc để không thêm điểm uốn hai lần
  stageEl.addEventListener('dblclick', ev => {
    if (performance.now() - handledAt < 800) { ev.stopImmediatePropagation(); ev.preventDefault(); }
  }, true);

  const stopDragging = () => document.body.classList.remove('ds-dragging');
  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);
  window.addEventListener('blur', stopDragging);

  /* ================= Hình học ================= */
  const overlapLen = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1);
  const overlapArea = (a, b) => Math.max(0, overlapLen(a.x, a.x + a.w, b.x, b.x + b.w)) * Math.max(0, overlapLen(a.y, a.y + a.h, b.y, b.y + b.h));
  const containsRect = (o, i) => i.x >= o.x - .5 && i.y >= o.y - .5 && i.x + i.w <= o.x + o.w + .5 && i.y + i.h <= o.y + o.h + .5;

  function addSegs(list, e, pts) {
    const fk = portKey(e, 'from'), tk = portKey(e, 'to');
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      if (Math.abs(ay - by) < .5 && Math.abs(ax - bx) > .5) list.push({ h: true, c: ay, a: Math.min(ax, bx), b: Math.max(ax, bx), eid: e.id, fk, tk });
      else if (Math.abs(ax - bx) < .5 && Math.abs(ay - by) > .5) list.push({ h: false, c: ax, a: Math.min(ay, by), b: Math.max(ay, by), eid: e.id, fk, tk });
    }
  }
  // Hai đường đi ra từ cùng một điểm nối thì đi chung đoạn đầu là bình thường, không tính là chồng
  const sharePort = (s, fk, tk) => s.fk === fk || s.tk === tk || s.fk === tk || s.tk === fk;

  /* ================= Vật cản ================= */
  function buildCtx() {
    const els = doc.elements.filter(e => !e.hidden);
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    els.forEach(e => { x1 = Math.min(x1, e.x); y1 = Math.min(y1, e.y); x2 = Math.max(x2, e.x + e.w); y2 = Math.max(y2, e.y + e.h); });
    const box = isFinite(x1) ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : { x: 0, y: 0, w: 1000, h: 800 };
    // Hình nền (khoá, hoặc ôm trọn nhiều khối khác) không phải vật cản
    const backdrop = new Set(els.filter(e => e.type === 'shape' && (e.locked || els.filter(o => o !== e && containsRect(e, o)).length >= 2)).map(e => e.id));
    const hard = [], soft = [];
    els.forEach(e => {
      if (e.type === 'group') {
        const title = String(e.title || '').split('\n')[0].replace(/\*\*/g, '');
        if (!title) return;
        const tw = Math.min(e.w, textW(title, e.titleSize || 14, e.titleWeight || 500) + 28);
        soft.push({ x: e.titleAlign === 'center' ? e.x + (e.w - tw) / 2 : e.x, y: e.y, w: tw, h: (e.titleSize || 14) * 1.35 + 14 });
      } else if (!backdrop.has(e.id)) hard.push({ id: e.id, x: e.x, y: e.y, w: e.w, h: e.h });
    });
    return { box, hard, soft };
  }

  /* ================= Định tuyến A* trên lưới thưa ================= */
  function uniqSorted(arr) {
    arr.sort((a, b) => a - b);
    const out = [];
    arr.forEach(v => { if (!out.length || v - out[out.length - 1] > .5) out.push(v); });
    return out;
  }
  // Thêm các đường giữa khe để đường nối chạy chính giữa khoảng trống thay vì men sát mép khối
  function withChannels(arr) {
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      out.push(arr[i]);
      const gap = i + 1 < arr.length ? arr[i + 1] - arr[i] : 0;
      if (gap > 2 * NEAR_DIST + 4) {
        const mid = (arr[i] + arr[i + 1]) / 2;
        out.push(mid);
        if (gap > 56) out.push(mid - 12, mid + 12);
      }
    }
    return uniqSorted(out);
  }
  const lowerIdx = (arr, v) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v - .25) lo = m + 1; else hi = m; } return lo; };
  const upperIdx = (arr, v) => lowerIdx(arr, v + .5) - 1;
  const nearestIdx = (arr, v) => { const i = lowerIdx(arr, v); if (i >= arr.length) return arr.length - 1; if (i > 0 && Math.abs(arr[i - 1] - v) < Math.abs(arr[i] - v)) return i - 1; return i; };

  function makeHeap() {
    const ks = [], vs = [];
    return {
      get size() { return ks.length; },
      push(k, v) {
        let i = ks.length; ks.push(k); vs.push(v);
        while (i > 0) { const p = (i - 1) >> 1; if (ks[p] <= k) break; ks[i] = ks[p]; vs[i] = vs[p]; i = p; }
        ks[i] = k; vs[i] = v;
      },
      pop() {
        const k0 = ks[0], v0 = vs[0], k = ks.pop(), v = vs.pop();
        if (ks.length) {
          let i = 0; const n = ks.length;
          for (;;) {
            let c = 2 * i + 1; if (c >= n) break;
            if (c + 1 < n && ks[c + 1] < ks[c]) c++;
            if (ks[c] >= k) break;
            ks[i] = ks[c]; vs[i] = vs[c]; i = c;
          }
          ks[i] = k; vs[i] = v;
        }
        return [k0, v0];
      },
    };
  }

  function astar(e, p1, p2, m, pad, ctx, segs) {
    const d1 = DIR_OF[e.from.side] ?? 1, d2 = DIR_OF[e.to.side] ?? 3;
    let stub = m + 6;
    // Hai cạnh quay mặt vào nhau qua một khe hẹp: đoạn chìa ra dài quá sẽ vượt qua nhau và sinh vòng thừa
    if (d2 === (d1 + 2) % 4) {
      const gap = (p2[0] - p1[0]) * DV[d1][0] + (p2[1] - p1[1]) * DV[d1][1];
      if (gap > 0 && gap < 2 * stub) stub = gap / 2;
    }
    const s1 = [p1[0] + DV[d1][0] * stub, p1[1] + DV[d1][1] * stub];
    const s2 = [p2[0] + DV[d2][0] * stub, p2[1] + DV[d2][1] * stub];
    const bx = ctx.box;
    const minX = Math.min(s1[0], s2[0], Math.max(Math.min(s1[0], s2[0]) - pad, bx.x - 60));
    const maxX = Math.max(s1[0], s2[0], Math.min(Math.max(s1[0], s2[0]) + pad, bx.x + bx.w + 60));
    const minY = Math.min(s1[1], s2[1], Math.max(Math.min(s1[1], s2[1]) - pad, bx.y - 60));
    const maxY = Math.max(s1[1], s2[1], Math.min(Math.max(s1[1], s2[1]) + pad, bx.y + bx.h + 60));
    const inside = (r, p) => p[0] > r.L + .01 && p[0] < r.R - .01 && p[1] > r.T + .01 && p[1] < r.B - .01;

    const rects = [];
    for (const o of ctx.hard) {
      let r = { L: o.x - m, R: o.x + o.w + m, T: o.y - m, B: o.y + o.h + m };
      if (r.R < minX || r.L > maxX || r.B < minY || r.T > maxY) continue;
      // Khối đứng quá sát điểm nối: chỉ né đúng thân khối, không né cả vùng đệm
      if (inside(r, s1) || inside(r, s2)) {
        r = { L: o.x, R: o.x + o.w, T: o.y, B: o.y + o.h };
        if (inside(r, s1) || inside(r, s2)) continue;
      }
      rects.push(r);
    }
    const softs = ctx.soft
      .map(o => ({ L: o.x, R: o.x + o.w, T: o.y, B: o.y + o.h }))
      .filter(r => !(r.R < minX || r.L > maxX || r.B < minY || r.T > maxY) && !inside(r, s1) && !inside(r, s2));

    const xs0 = [minX, maxX, s1[0], s2[0]], ys0 = [minY, maxY, s1[1], s2[1]];
    rects.forEach(r => { xs0.push(r.L, r.R); ys0.push(r.T, r.B); });
    const xs = withChannels(uniqSorted(xs0.filter(v => v >= minX - .5 && v <= maxX + .5)));
    const ys = withChannels(uniqSorted(ys0.filter(v => v >= minY - .5 && v <= maxY + .5)));
    const nx = xs.length, ny = ys.length;
    const hb = new Uint8Array(ny * (nx - 1)), vb = new Uint8Array((ny - 1) * nx);
    const hc = new Float32Array(ny * (nx - 1)), vc = new Float32Array((ny - 1) * nx);

    for (const r of rects) {
      const i0 = lowerIdx(xs, r.L), i1 = upperIdx(xs, r.R), j0 = lowerIdx(ys, r.T), j1 = upperIdx(ys, r.B);
      for (let j = j0; j <= j1; j++) {
        const onEdge = Math.abs(ys[j] - r.T) < .5 || Math.abs(ys[j] - r.B) < .5;
        for (let i = i0; i < i1; i++) { const k = j * (nx - 1) + i; if (onEdge) hc[k] += HUG_PER_PX * (xs[i + 1] - xs[i]); else hb[k] = 1; }
      }
      for (let i = i0; i <= i1; i++) {
        const onEdge = Math.abs(xs[i] - r.L) < .5 || Math.abs(xs[i] - r.R) < .5;
        for (let j = j0; j < j1; j++) { const k = j * nx + i; if (onEdge) vc[k] += HUG_PER_PX * (ys[j + 1] - ys[j]); else vb[k] = 1; }
      }
    }
    for (const r of softs) {
      const i0 = lowerIdx(xs, r.L), i1 = upperIdx(xs, r.R), j0 = lowerIdx(ys, r.T), j1 = upperIdx(ys, r.B);
      for (let j = j0; j <= j1; j++) for (let i = i0; i < i1; i++) hc[j * (nx - 1) + i] += SOFT_PER_PX * (xs[i + 1] - xs[i]);
      for (let i = i0; i <= i1; i++) for (let j = j0; j < j1; j++) vc[j * nx + i] += SOFT_PER_PX * (ys[j + 1] - ys[j]);
    }

    // Phạt chạy trùng / song song quá sát / cắt ngang các đường đã vẽ
    const fk = portKey(e, 'from'), tk = portKey(e, 'to');
    for (const s of segs) {
      if (s.eid === e.id || sharePort(s, fk, tk)) continue;
      const along = s.h ? xs : ys, across = s.h ? ys : xs, nA = along.length;
      const cost = s.h ? hc : vc, stride = s.h ? nx - 1 : nx;
      const idx = s.h ? (i, j) => j * stride + i : (i, j) => i * stride + j;
      const a0 = Math.max(0, lowerIdx(along, s.a) - 1), a1 = Math.min(nA - 1, upperIdx(along, s.b) + 1);
      for (let j = lowerIdx(across, s.c - NEAR_DIST); j <= upperIdx(across, s.c + NEAR_DIST); j++) {
        const dist = Math.abs(across[j] - s.c), same = dist < 1;
        for (let i = a0; i < a1; i++) {
          const ov = overlapLen(along[i], along[i + 1], s.a, s.b);
          if (ov > .5) cost[idx(i, j)] += same ? OVERLAP_BASE + OVERLAP_PER_PX * ov : NEAR_PER_PX * (1 - dist / NEAR_DIST) * ov;
        }
      }
      // Đường đang xét chạy vuông góc và cắt qua s
      const pCost = s.h ? vc : hc, pStride = s.h ? nx : nx - 1;
      const pIdx = s.h ? (col, j) => j * pStride + col : (row, i) => row * pStride + i;
      const cols = s.h ? xs : ys, rows = s.h ? ys : xs;
      for (let c = lowerIdx(cols, s.a + 1); c <= upperIdx(cols, s.b - 1); c++) {
        const r = lowerIdx(rows, s.c);
        if (r < rows.length && Math.abs(rows[r] - s.c) < .5) {
          if (r > 0) pCost[pIdx(c, r - 1)] += CROSS / 2;
          if (r < rows.length - 1) pCost[pIdx(c, r)] += CROSS / 2;
        } else if (r > 0 && r < rows.length) pCost[pIdx(c, r - 1)] += CROSS;
      }
    }

    const si = nearestIdx(xs, s1[0]), sj = nearestIdx(ys, s1[1]), gi = nearestIdx(xs, s2[0]), gj = nearestIdx(ys, s2[1]);
    const want = (d2 + 2) % 4;
    const N = nx * ny * 4;
    const g = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const hd = (i, j) => Math.abs(xs[i] - xs[gi]) + Math.abs(ys[j] - ys[gj]);
    const heap = makeHeap();
    const start = ((sj * nx + si) << 2) + d1;
    g[start] = 0; heap.push(hd(si, sj), start);
    let best = Infinity, bestS = -1, iter = 0;
    while (heap.size) {
      const [f, s] = heap.pop();
      if (f >= best || ++iter > MAX_ITER) break;
      const d = s & 3, n = s >> 2, i = n % nx, j = (n / nx) | 0, gs = g[s];
      if (gs + hd(i, j) < f - 1e-6) continue;
      if (i === gi && j === gj) {
        const c = gs + (d === want ? 0 : d === (want + 2) % 4 ? BEND * 3 : BEND);
        if (c < best) { best = c; bestS = s; }
        continue;
      }
      for (let nd = 0; nd < 4; nd++) {
        if (nd === (d + 2) % 4) continue;
        let ni = i, nj = j, len, k, add;
        if (nd === 0) { if (i + 1 >= nx) continue; k = j * (nx - 1) + i; if (hb[k]) continue; len = xs[i + 1] - xs[i]; add = hc[k]; ni = i + 1; }
        else if (nd === 2) { if (i === 0) continue; k = j * (nx - 1) + i - 1; if (hb[k]) continue; len = xs[i] - xs[i - 1]; add = hc[k]; ni = i - 1; }
        else if (nd === 1) { if (j + 1 >= ny) continue; k = j * nx + i; if (vb[k]) continue; len = ys[j + 1] - ys[j]; add = vc[k]; nj = j + 1; }
        else { if (j === 0) continue; k = (j - 1) * nx + i; if (vb[k]) continue; len = ys[j] - ys[j - 1]; add = vc[k]; nj = j - 1; }
        const ns = ((nj * nx + ni) << 2) + nd, ng = gs + len + add + (nd !== d ? BEND : 0);
        if (ng < g[ns]) { g[ns] = ng; prev[ns] = s; heap.push(ng + hd(ni, nj), ns); }
      }
    }
    if (bestS < 0) return null;
    const nodes = [];
    for (let s = bestS; s >= 0; s = prev[s]) { const n = s >> 2; nodes.push([xs[n % nx], ys[(n / nx) | 0]]); }
    nodes.reverse();
    return cleanPts([p1, ...nodes, p2]);
  }

  function routeEdge(e, ctx, segs) {
    const A = byId(e.from.id), B = byId(e.to.id);
    const p1 = anchorPt(A, e.from.side, e.from.t), p2 = anchorPt(B, e.to.side, e.to.t);
    if (A.id === B.id) return autoOrtho(p1, e.from.side, p2, e.to.side);
    // Thử vùng tìm kiếm nhỏ trước cho nhanh, bí thì nới rộng rồi giảm khoảng hở
    for (const [m, pad] of [[MARGIN, 240], [MARGIN, 5000], [6, 5000], [2, 5000]]) {
      const r = astar(e, p1, p2, m, pad, ctx, segs);
      if (r) return r;
    }
    return autoOrtho(p1, e.from.side, p2, e.to.side);
  }

  /* ================= Đặt nhãn ================= */
  const labelSizeCache = new Map();
  function labelSize(text) {
    let s = labelSizeCache.get(text);
    if (!s) {
      const lines = layoutText(text, 12, 500, 220);
      s = { w: Math.max(...lines.map(l => l.width)) + 12, h: lines.length * 12 * 1.3 + 6 };
      labelSizeCache.set(text, s);
    }
    return s;
  }
  // lab: số (labelPos gốc) hoặc { t, ox, oy } do placeLabels chọn - ox/oy dời nhãn ra cạnh đường kẻ
  const labelBox = (pts, lab, text) => {
    const L = typeof lab === 'number' ? { t: lab, ox: 0, oy: 0 } : lab;
    const [x, y] = pointAt(pts, L.t), s = labelSize(text);
    return { x: x + L.ox - s.w / 2, y: y + L.oy - s.h / 2, w: s.w, h: s.h };
  };
  function segmentAt(pts, along) {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + L >= along) return Math.abs(pts[i][1] - pts[i - 1][1]) < .5 ? 'h' : Math.abs(pts[i][0] - pts[i - 1][0]) < .5 ? 'v' : 'd';
      acc += L;
    }
    return 'd';
  }
  const segHitsBox = (s, b) => s.h
    ? s.c > b.y && s.c < b.y + b.h && overlapLen(s.a, s.b, b.x, b.x + b.w) > 0
    : s.c > b.x && s.c < b.x + b.w && overlapLen(s.a, s.b, b.y, b.y + b.h) > 0;

  function placeLabels(paths, ctx, segs) {
    const out = new Map(), placed = [];
    // Né cả dòng tiêu đề nhóm: nhãn đè lên tiêu đề khó đọc hơn đè lên nền nhóm
    const occ = [...ctx.hard.filter(o => o.w > 6 && o.h > 6), ...ctx.soft];
    const withLabel = doc.edges.filter(e => e.label && paths.has(e.id));
    withLabel.filter(e => !isSmart(e)).forEach(e => placed.push(labelBox(paths.get(e.id), e.labelPos, e.label)));
    for (const e of withLabel.filter(isSmart)) {
      const pts = paths.get(e.id), total = polyLen(pts) || 1, sz = labelSize(e.label);
      const ts = [.5, .4, .6, .3, .7, .22, .78];
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        const need = Math.abs(pts[i][1] - pts[i - 1][1]) < .5 ? sz.w : sz.h;
        if (L > need + 16) [.5, .3, .7].forEach(f => ts.push((acc + L * f) / total));
        acc += L;
      }
      let best = null;
      for (const t of ts) {
        const along = t * total, dir = segmentAt(pts, along);
        // Nằm đè giữa đường là mặc định; khe hẹp thì thử đặt sát bên cạnh đường kẻ
        const offsets = [[0, 0]];
        if (dir === 'v') offsets.push([sz.w / 2 + 5, 0], [-sz.w / 2 - 5, 0]);
        if (dir === 'h') offsets.push([0, -sz.h / 2 - 4], [0, sz.h / 2 + 4]);
        for (const [ox, oy] of offsets) {
          const lab = { t, ox, oy }, b = labelBox(pts, lab, e.label);
          let sc = Math.abs(t - .5) * 40 + (ox || oy ? 18 : 0);
          if (along < 26 || total - along < 32) sc += 300;
          occ.forEach(o => { sc += overlapArea(b, o); });
          placed.forEach(o => { sc += overlapArea(b, o) * 3; });
          segs.forEach(s => { if (s.eid !== e.id && segHitsBox(s, b)) sc += 220; });
          for (let i = 1; i < pts.length - 1; i++) if (pts[i][0] > b.x && pts[i][0] < b.x + b.w && pts[i][1] > b.y && pts[i][1] < b.y + b.h) sc += 120;
          if (!best || sc < best.sc) best = { sc, lab, b };
        }
      }
      out.set(e.id, best.lab);
      placed.push(best.b);
    }
    return out;
  }

  /* ================= Bộ nhớ đệm tuyến ================= */
  let SR = { sig: null, routes: new Map(), paths: new Map(), labels: new Map(), partial: false };
  let PV = null; // gợi ý đang xem trước

  function sig() {
    let s = '';
    for (const e of doc.elements) s += `${e.id}:${e.x},${e.y},${e.w},${e.h}${e.hidden ? 'h' : ''}${e.type === 'group' ? e.title : ''};`;
    s += '#';
    for (const e of doc.edges) s += `${e.id}:${e.from.id}${e.from.side}${e.from.t}>${e.to.id}${e.to.side}${e.to.t}${e.routing}${e.points ? JSON.stringify(e.points) : ''}${e.label || ''};`;
    return s;
  }
  const manhattan = e => {
    const A = byId(e.from.id), B = byId(e.to.id);
    return Math.abs(A.x + A.w / 2 - B.x - B.w / 2) + Math.abs(A.y + A.h / 2 - B.y - B.h / 2);
  };

  // only = tập id đường cần định tuyến lại; null = định tuyến lại tất cả
  // fast = đang kéo: dùng đường vuông góc đơn giản cho mượt, dừng tay mới tính tuyến thông minh
  function routePass(only, fast = false) {
    const ctx = buildCtx(), segs = [], routes = new Map(), paths = new Map(), pending = [];
    for (const e of doc.edges) {
      const A = byId(e.from.id), B = byId(e.to.id);
      if (!A || !B || A.hidden || B.hidden) continue;
      if (!isSmart(e)) { const p = origEdgePts(e); if (p) { paths.set(e.id, p); addSegs(segs, e, p); } continue; }
      if (only && !only.has(e.id) && SR.routes.has(e.id)) {
        const p = SR.routes.get(e.id);
        routes.set(e.id, p); paths.set(e.id, p); addSegs(segs, e, p);
        continue;
      }
      pending.push(e);
    }
    // Đường ngắn chọn trước để giữ được dạng thẳng, đường dài đi vòng theo sau
    pending.sort((a, b) => manhattan(a) - manhattan(b));
    for (const e of pending) {
      const p = fast
        ? autoOrtho(anchorPt(byId(e.from.id), e.from.side, e.from.t), e.from.side, anchorPt(byId(e.to.id), e.to.side, e.to.t), e.to.side)
        : routeEdge(e, ctx, segs);
      routes.set(e.id, p); paths.set(e.id, p); addSegs(segs, e, p);
    }
    return { ctx, segs, routes, paths, labels: placeLabels(paths, ctx, segs) };
  }

  function movedDuringDrag() {
    const d = S.drag;
    if (!d) return null;
    if (S.mode === 'move' && d.start) return new Set(Object.keys(d.start));
    if (S.mode === 'resize' && d.id) return new Set([d.id]);
    return null;
  }
  let settleTimer = null, settled = false;
  function ensure() {
    const s = sig(), dragMoved = movedDuringDrag();
    const moved = dragMoved || (PV && PV.moved);
    const changed = s !== SR.sig;
    if (!changed && !(SR.partial && !moved) && !(dragMoved && SR.fast && settled)) return;
    if (changed) settled = false;
    let only = null;
    if (moved && SR.sig) {
      only = new Set(doc.edges.filter(e => moved.has(e.from.id) || moved.has(e.to.id) || (PV && PV.edgeIds.has(e.id))).map(e => e.id));
    }
    const fast = !!dragMoved && !settled;
    const r = routePass(only, fast);
    SR = { sig: s, routes: r.routes, paths: r.paths, labels: r.labels, partial: !!only, fast };
    if (fast) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => { if (movedDuringDrag()) { settled = true; render(); } }, 110);
    }
  }

  /* ================= Ghi đè hàm vẽ của Studio ================= */
  window.edgePts = function (e) {
    if (!isSmart(e)) return origEdgePts(e);
    ensure();
    const p = SR.routes.get(e.id);
    return p ? p.map(q => [...q]) : origEdgePts(e);
  };

  function hopsFor(e, p) {
    const hops = [];
    for (let i = 1; i < p.length; i++) {
      const [ax, ay] = p[i - 1], [bx, by] = p[i];
      if (Math.abs(ay - by) > .5 || Math.abs(ax - bx) < 4 * HOP_R) continue;
      const lo = Math.min(ax, bx), hi = Math.max(ax, bx), list = [];
      SR.paths.forEach((q, id) => {
        if (id === e.id) return;
        for (let k = 1; k < q.length; k++) {
          const [cx, cy] = q[k - 1], [dx, dy] = q[k];
          if (Math.abs(cx - dx) > .5) continue;
          if (cx > lo + 2 * HOP_R + 6 && cx < hi - 2 * HOP_R - 6 && ay > Math.min(cy, dy) + 2 && ay < Math.max(cy, dy) - 2) list.push(Math.abs(cx - ax));
        }
      });
      list.sort((a, b) => a - b);
      hops[i - 1] = list.filter((v, k) => k === 0 || v - list[k - 1] > 2 * HOP_R + 2);
    }
    return hops;
  }
  function hopPath(pts, r, hops) {
    const n = pts.length, P = q => `${r1(q[0])},${r1(q[1])}`;
    const rad = pts.map((q, i) => {
      if (i === 0 || i === n - 1) return 0;
      const rr = Math.min(r, Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) / 2, Math.hypot(pts[i + 1][0] - q[0], pts[i + 1][1] - q[1]) / 2);
      return rr < .5 ? 0 : rr;
    });
    let d = `M${P(pts[0])}`;
    for (let i = 0; i < n - 1; i++) {
      const A = pts[i], B = pts[i + 1], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
      const at = t => [A[0] + ux * t, A[1] + uy * t];
      (hops[i] || []).forEach(h => {
        if (h - HOP_R <= rad[i] + 1 || h + HOP_R >= L - rad[i + 1] - 1) return;
        d += ` L${P(at(h - HOP_R))} A${HOP_R},${HOP_R} 0 0 ${ux > 0 ? 1 : 0} ${P(at(h + HOP_R))}`;
      });
      const endR = rad[i + 1];
      d += ` L${P(at(L - endR))}`;
      if (endR) {
        const C = pts[i + 2], L2 = Math.hypot(C[0] - B[0], C[1] - B[1]) || 1;
        d += ` Q${P(B)} ${P([B[0] + (C[0] - B[0]) / L2 * endR, B[1] + (C[1] - B[1]) / L2 * endR])}`;
      }
    }
    return d;
  }

  window.renderEdge = function (e, forExport) {
    if (!isSmart(e)) return origRenderEdge(e, forExport);
    const pts = edgePts(e); if (!pts || pts.length < 2) return '';
    const A = byId(e.from.id), B = byId(e.to.id); if (A.hidden || B.hidden) return '';
    const size = 7 + e.width * 2;
    const p = pts.map(q => [...q]);
    const shrink = (i, j) => { const dx = p[i][0] - p[j][0], dy = p[i][1] - p[j][1], L = Math.hypot(dx, dy) || 1, k = Math.min(size * .8, L - 1); p[i] = [p[i][0] - dx / L * k, p[i][1] - dy / L * k]; };
    if (e.arrowEnd) shrink(p.length - 1, p.length - 2);
    if (e.arrowStart) shrink(0, 1);
    let s = `<g data-edge="${e.id}">`;
    if (!forExport) s += `<path d="${roundedPath(pts, e.radius)}" fill="none" stroke="transparent" stroke-width="14" style="cursor:pointer"/>`;
    s += `<path d="${hopPath(p, e.radius, hopsFor(e, p))}" fill="none" stroke="${e.color}" stroke-width="${e.width}" stroke-linecap="round" stroke-linejoin="round"${e.dash ? ` stroke-dasharray="${dashFor(e.width)}"` : ''}/>`;
    if (e.arrowEnd) s += arrowHead(pts[pts.length - 1], pts[pts.length - 2], size, e.color);
    if (e.arrowStart) s += arrowHead(pts[0], pts[1], size, e.color);
    if (e.label) {
      const lab = SR.labels.get(e.id) || { t: e.labelPos, ox: 0, oy: 0 };
      const [px, py] = pointAt(pts, lab.t), lx = px + lab.ox, ly = py + lab.oy, fs = 12, lines = layoutText(e.label, fs, 500, 220), lh = fs * 1.3;
      const w = Math.max(...lines.map(l => l.width)) + 12, h = lines.length * lh + 6;
      s += `<rect x="${r1(lx - w / 2)}" y="${r1(ly - h / 2)}" width="${r1(w)}" height="${r1(h)}" rx="4" fill="${doc.background}" stroke="${e.color}" stroke-width=".8"/>`;
      s += drawLines(lines, lx, ly - h / 2 + 3, fs, e.color, 'center', lh);
    }
    return s + '</g>';
  };

  window.segField = function (label, prop, val, opts) {
    if (prop === 'routing') opts = [['smart', 'Thông minh'], ...opts];
    return origSegField(label, prop, val, opts);
  };
  window.lastEdgeStyle = function () { return { ...origLastEdgeStyle(), routing: 'smart' }; };

  /* ================= Đánh giá bố cục ================= */
  function metrics(paths, labels, ctx) {
    const segs = [];
    let bends = 0, length = 0;
    const ends = new Map();
    for (const e of doc.edges) {
      const p = paths.get(e.id); if (!p) continue;
      bends += Math.max(0, p.length - 2);
      length += polyLen(p);
      addSegs(segs, e, p);
      ends.set(e.id, [e.from.id, e.to.id]);
    }
    const hs = segs.filter(s => s.h), vs = segs.filter(s => !s.h);
    let cross = 0, overlap = 0, hits = 0, labelHits = 0;
    for (const h of hs) for (const v of vs) {
      if (h.eid !== v.eid && !sharePort(h, v.fk, v.tk) && v.c > h.a + 1 && v.c < h.b - 1 && h.c > v.a + 1 && h.c < v.b - 1) cross++;
    }
    [hs, vs].forEach(list => {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.eid !== b.eid && Math.abs(a.c - b.c) < 1 && !sharePort(a, b.fk, b.tk)) overlap += Math.max(0, overlapLen(a.a, a.b, b.a, b.b));
      }
    });
    for (const s of segs) {
      const own = ends.get(s.eid);
      for (const o of ctx.hard) {
        if (own.includes(o.id) || o.w <= 6 || o.h <= 6) continue;
        const inX = s.h ? overlapLen(s.a, s.b, o.x + 2, o.x + o.w - 2) > 0 : s.c > o.x + 2 && s.c < o.x + o.w - 2;
        const inY = s.h ? s.c > o.y + 2 && s.c < o.y + o.h - 2 : overlapLen(s.a, s.b, o.y + 2, o.y + o.h - 2) > 0;
        if (inX && inY) hits++;
      }
    }
    const boxes = doc.edges.filter(e => e.label && paths.has(e.id)).map(e => labelBox(paths.get(e.id), labels.get(e.id) ?? e.labelPos, e.label));
    boxes.forEach((b, i) => {
      if (ctx.hard.some(o => o.w > 6 && o.h > 6 && overlapArea(b, o) > 24)) labelHits++;
      for (let j = i + 1; j < boxes.length; j++) if (overlapArea(b, boxes[j]) > 24) labelHits++;
    });
    return { cross, overlap: Math.round(overlap), bends, hits, labelHits, length: Math.round(length), elOverlap: 0, outside: 0 };
  }
  const scoreOf = m => m.cross * 30 + m.bends * 10 + m.overlap * .6 + m.hits * 150 + m.labelHits * 35 + m.elOverlap * .05 + m.outside * 200 + m.length * .015;

  function parentGroupOf(el, movers) {
    let best = null;
    doc.elements.forEach(g => {
      if (g.type !== 'group' || g.hidden || g.id === el.id || movers.has(g.id) || !containsRect(g, el)) return;
      if (!best || g.w * g.h < best.w * best.h) best = g;
    });
    return best;
  }
  function placementPenalty(movers, parents) {
    let area = 0, outside = 0;
    const hard = buildCtx().hard;
    movers.forEach(id => {
      const e = byId(id);
      if (!e || e.type === 'group') return;
      hard.forEach(o => { if (!movers.has(o.id)) area += overlapArea(e, o); });
      const pg = parents.get(id);
      if (pg && !containsRect(pg, e)) outside++;
    });
    return { elOverlap: Math.round(area), outside };
  }

  function moveSet(movers, dx, dy) {
    const shifted = [];
    movers.forEach(id => { const e = byId(id); if (e && !e.locked) { e.x = r1(e.x + dx); e.y = r1(e.y + dy); shifted.push(e); } });
    const edgeMoves = doc.edges.filter(ed => ed.points && movers.has(ed.from.id) && movers.has(ed.to.id));
    edgeMoves.forEach(ed => { ed.points = ed.points.map(p => ({ x: r1(p.x + dx), y: r1(p.y + dy) })); });
    return () => {
      shifted.forEach(e => { e.x = r1(e.x - dx); e.y = r1(e.y - dy); });
      edgeMoves.forEach(ed => { ed.points = ed.points.map(p => ({ x: r1(p.x - dx), y: r1(p.y - dy) })); });
    };
  }

  function evaluate(apply, moved, edgeIds, parents) {
    const revert = apply();
    const only = new Set(edgeIds);
    doc.edges.forEach(e => { if (moved.has(e.from.id) || moved.has(e.to.id)) only.add(e.id); });
    const r = routePass(only);
    const m = { ...metrics(r.paths, r.labels, r.ctx), ...placementPenalty(moved, parents) };
    revert();
    return m;
  }

  const shortName = e => {
    const raw = String(e.title || e.text || e.name || e.id).replace(/\*\*/g, '').split('\n')[0].trim();
    return raw.length > 26 ? raw.slice(0, 25) + '…' : raw;
  };
  const DIFF_LABELS = [['cross', 'giao cắt'], ['bends', 'khúc gấp'], ['hits', 'đè lên khối'], ['labelHits', 'nhãn bị đè'], ['overlap', 'px chạy chồng'], ['elOverlap', 'px² chồng khối'], ['outside', 'ra ngoài nhóm']];
  function diffChips(m0, m1) {
    const chips = [];
    DIFF_LABELS.forEach(([k, label]) => {
      const d = m1[k] - m0[k];
      if (Math.abs(d) < (k === 'overlap' ? 4 : k === 'elOverlap' ? 50 : 1)) return;
      chips.push(`<span class="ds-chip ${d < 0 ? 'good' : 'bad'}">${d < 0 ? '−' : '+'}${Math.abs(d)} ${label}</span>`);
    });
    return chips;
  }

  /* ================= Sinh gợi ý ================= */
  function nodeSuggestions(el) {
    const movers = childrenOf([el.id]);
    const parents = new Map();
    movers.forEach(id => { const e = byId(id); if (e) parents.set(id, parentGroupOf(e, movers)); });
    const base = { ...metrics(SR.paths, SR.labels, buildCtx()), ...placementPenalty(movers, parents) };
    const baseScore = scoreOf(base);
    const cands = [], seen = new Set();
    const add = (dx, dy, icon, title, tidy) => {
      dx = r1(dx); dy = r1(dy);
      const key = `${dx},${dy}`;
      if ((Math.abs(dx) < .5 && Math.abs(dy) < .5) || seen.has(key)) return;
      seen.add(key);
      cands.push({ dx, dy, icon, title, tidy });
    };

    // 1. Nắn thẳng các đường nối tới khối khác
    doc.edges.forEach(ed => {
      if (ed.points) return;
      const mine = movers.has(ed.from.id), theirs = movers.has(ed.to.id);
      if (mine === theirs) return;
      const [me, other] = mine ? [ed.from, ed.to] : [ed.to, ed.from];
      const O = byId(other.id), M = byId(me.id);
      if (!O || !M) return;
      const pm = anchorPt(M, me.side, me.t), po = anchorPt(O, other.side, other.t);
      const horiz = s => s === 'left' || s === 'right';
      if (horiz(me.side) && horiz(other.side) && Math.abs(po[1] - pm[1]) <= 220) add(0, po[1] - pm[1], 'move-vertical', `Nắn thẳng đường tới “${shortName(O)}”`, true);
      if (!horiz(me.side) && !horiz(other.side) && Math.abs(po[0] - pm[0]) <= 220) add(po[0] - pm[0], 0, 'move-horizontal', `Nắn thẳng đường tới “${shortName(O)}”`, true);
    });

    // 2. Căn thẳng hàng với khối lân cận cùng nhóm
    const parent = parents.get(el.id);
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    const peers = doc.elements
      .filter(o => !o.hidden && !movers.has(o.id) && o.type !== 'group' && o.w > 6 && o.h > 6 && parentGroupOf(o, movers) === parent)
      .sort((a, b) => Math.hypot(a.x + a.w / 2 - cx, a.y + a.h / 2 - cy) - Math.hypot(b.x + b.w / 2 - cx, b.y + b.h / 2 - cy))
      .slice(0, 6);
    peers.forEach(o => {
      const n = shortName(o);
      [[o.y - el.y, 'Căn mép trên'], [o.y + o.h / 2 - cy, 'Căn giữa ngang'], [o.y + o.h - el.y - el.h, 'Căn mép dưới']]
        .forEach(([d, t]) => { if (Math.abs(d) <= 48) add(0, d, 'align-center-horizontal', `${t} với “${n}”`, true); });
      [[o.x - el.x, 'Căn mép trái'], [o.x + o.w / 2 - cx, 'Căn giữa dọc'], [o.x + o.w - el.x - el.w, 'Căn mép phải']]
        .forEach(([d, t]) => { if (Math.abs(d) <= 48) add(d, 0, 'align-center-vertical', `${t} với “${n}”`, true); });
    });

    // 3. Cách đều hai khối hai bên (cùng hàng / cùng cột)
    const rowMates = peers.filter(o => overlapLen(o.y, o.y + o.h, el.y, el.y + el.h) > 0);
    const left = rowMates.filter(o => o.x + o.w <= el.x).sort((a, b) => b.x - a.x)[0];
    const right = rowMates.filter(o => o.x >= el.x + el.w).sort((a, b) => a.x - b.x)[0];
    if (left && right) add((left.x + left.w + right.x - el.w) / 2 - el.x, 0, 'align-horizontal-space-around', `Cách đều “${shortName(left)}” và “${shortName(right)}”`, true);
    const colMates = peers.filter(o => overlapLen(o.x, o.x + o.w, el.x, el.x + el.w) > 0);
    const above = colMates.filter(o => o.y + o.h <= el.y).sort((a, b) => b.y - a.y)[0];
    const below = colMates.filter(o => o.y >= el.y + el.h).sort((a, b) => a.y - b.y)[0];
    if (above && below) add(0, (above.y + above.h + below.y - el.h) / 2 - el.y, 'align-horizontal-space-around', `Cách đều “${shortName(above)}” và “${shortName(below)}”`, true);

    // 4. Gỡ chồng lên khối khác
    buildCtx().hard.forEach(o => {
      if (movers.has(o.id) || overlapArea(el, o) <= 0) return;
      const gap = 24;
      add(o.x - gap - (el.x + el.w), 0, 'shrink', `Dời sang trái, hết chồng “${shortName(byId(o.id))}”`);
      add(o.x + o.w + gap - el.x, 0, 'shrink', `Dời sang phải, hết chồng “${shortName(byId(o.id))}”`);
      add(0, o.y - gap - (el.y + el.h), 'shrink', `Dời lên, hết chồng “${shortName(byId(o.id))}”`);
      add(0, o.y + o.h + gap - el.y, 'shrink', `Dời xuống, hết chồng “${shortName(byId(o.id))}”`);
    });

    // 5. Đưa trở lại trong nhóm cha
    const host = doc.elements.filter(g => g.type === 'group' && !movers.has(g.id) && overlapArea(g, el) > el.w * el.h * .4 && !containsRect(g, el))[0];
    if (host) {
      const pad = 16;
      const nx = Math.min(Math.max(el.x, host.x + pad), host.x + host.w - el.w - pad), ny = Math.min(Math.max(el.y, host.y + 36), host.y + host.h - el.h - pad);
      add(nx - el.x, ny - el.y, 'maximize-2', `Đưa gọn vào trong “${shortName(host)}”`);
    }

    const out = [];
    cands.slice(0, 24).forEach(c => {
      const m = evaluate(() => moveSet(movers, c.dx, c.dy), movers, [], parents);
      const delta = scoreOf(m) - baseScore;
      // Căn hàng / nắn thẳng được giữ cả khi điểm không đổi vì nhìn gọn hơn; dời vì lý do khác thì phải có lợi
      if (delta < -1 || (c.tidy && delta <= 4 && m.elOverlap <= base.elOverlap && m.outside <= base.outside)) {
        out.push({ ...c, delta, chips: diffChips(base, m), moved: movers, edgeIds: new Set(), apply: () => moveSet(movers, c.dx, c.dy) });
      }
    });
    edgeSideSuggestions(doc.edges.filter(ed => isSmart(ed) && (movers.has(ed.from.id) || movers.has(ed.to.id))), base, baseScore, parents)
      .forEach(s => out.push(s));
    return out.sort((a, b) => a.delta - b.delta).slice(0, 6);
  }

  function facingSides(A, B) {
    const dx = B.x + B.w / 2 - (A.x + A.w / 2), dy = B.y + B.h / 2 - (A.y + A.h / 2);
    return SIDES.filter(s => (s === 'right' && dx > -A.w / 4) || (s === 'left' && dx < A.w / 4) || (s === 'bottom' && dy > -A.h / 4) || (s === 'top' && dy < A.h / 4));
  }
  function setEnds(ed, fs, ts) {
    const old = { from: { ...ed.from }, to: { ...ed.to }, routing: ed.routing, points: ed.points };
    if (fs !== ed.from.side) ed.from = { ...ed.from, side: fs, t: .5 };
    if (ts !== ed.to.side) ed.to = { ...ed.to, side: ts, t: .5 };
    return () => { ed.from = old.from; ed.to = old.to; ed.routing = old.routing; ed.points = old.points; };
  }
  const SIDE_VI = { top: 'trên', right: 'phải', bottom: 'dưới', left: 'trái' };

  function edgeSideSuggestions(edges, base, baseScore, parents = new Map()) {
    const out = [];
    edges.forEach(ed => {
      const A = byId(ed.from.id), B = byId(ed.to.id);
      if (!A || !B) return;
      let best = null;
      facingSides(A, B).forEach(fs => facingSides(B, A).forEach(ts => {
        if (fs === ed.from.side && ts === ed.to.side) return;
        const m = evaluate(() => setEnds(ed, fs, ts), new Set(), [ed.id], parents);
        const delta = scoreOf(m) - baseScore;
        if (delta < -3 && (!best || delta < best.delta)) best = { fs, ts, m, delta };
      }));
      if (best) out.push({
        icon: 'route', delta: best.delta, chips: diffChips(base, best.m), moved: new Set(), edgeIds: new Set([ed.id]),
        title: `Nối “${shortName(A)}” (cạnh ${SIDE_VI[best.fs]}) → “${shortName(B)}” (cạnh ${SIDE_VI[best.ts]})`,
        apply: () => setEnds(ed, best.fs, best.ts),
      });
    });
    return out;
  }

  function edgeSuggestions(ed) {
    const base = metrics(SR.paths, SR.labels, buildCtx());
    const baseScore = scoreOf(base);
    const out = [];
    if (!isSmart(ed)) {
      const apply = () => { const old = { routing: ed.routing, points: ed.points }; ed.routing = 'smart'; ed.points = null; return () => Object.assign(ed, old); };
      const m = evaluate(apply, new Set(), [ed.id]);
      out.push({ icon: 'wand-sparkles', delta: scoreOf(m) - baseScore - 1000, chips: diffChips(base, m), moved: new Set(), edgeIds: new Set([ed.id]), title: 'Chuyển sang nối thông minh (tự né khối, tự đặt nhãn)', apply });
    }
    if (isSmart(ed)) edgeSideSuggestions([ed], base, baseScore).forEach(s => out.push(s));
    return out.sort((a, b) => a.delta - b.delta);
  }

  /* ================= Thao tác toàn sơ đồ ================= */
  function spreadPorts() {
    const groups = new Map();
    doc.edges.filter(isSmart).forEach(ed => ['from', 'to'].forEach(end => {
      const key = `${ed[end].id}|${ed[end].side}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ ed, end });
    }));
    let changed = 0;
    groups.forEach(list => {
      if (list.length < 2) return;
      const side = list[0].ed[list[0].end].side, vertical = side === 'left' || side === 'right';
      const otherPos = ({ ed, end }) => { const o = byId(ed[end === 'from' ? 'to' : 'from'].id); return vertical ? o.y + o.h / 2 : o.x + o.w / 2; };
      list.sort((a, b) => otherPos(a) - otherPos(b));
      list.forEach((it, i) => {
        const t = r1((i + 1) / (list.length + 1) * 100) / 100;
        if (it.ed[it.end].t !== t) { it.ed[it.end] = { ...it.ed[it.end], t }; changed++; }
      });
    });
    return changed;
  }

  function optimizeAllSides() {
    const edges = doc.edges.filter(isSmart);
    if (!edges.length) { toast('Chưa có liên kết thông minh nào'); return; }
    let i = 0, improved = 0;
    const step = () => {
      ensure();
      const base = metrics(SR.paths, SR.labels, buildCtx()), baseScore = scoreOf(base);
      const end = Math.min(edges.length, i + 4);
      for (; i < end; i++) {
        const [s] = edgeSideSuggestions([edges[i]], base, baseScore);
        if (s) { s.apply(); improved++; SR.sig = null; ensure(); }
      }
      toast(`Đang tối ưu cạnh nối… ${i}/${edges.length}`);
      if (i < edges.length) setTimeout(step, 0);
      else { commit(); render(); renderInspector(); toast(`Xong: đổi cạnh nối cho ${improved} liên kết`); }
    };
    setTimeout(step, 0);
  }

  /* ================= Inspector: mục gợi ý ================= */
  let pending = null;
  function startPreview(sug) {
    endPreview();
    PV = { saved: SR, revert: sug.apply(), moved: sug.moved, edgeIds: sug.edgeIds };
    render();
  }
  function endPreview() {
    if (!PV) return;
    PV.revert();
    SR = PV.saved;
    PV = null;
    render();
  }

  function card(s, i) {
    return `<button type="button" class="ds-sug" data-sug="${i}"><span class="ds-ico">${uiIcon(s.icon, 16)}</span>
      <span><span class="ds-t">${esc(s.title)}</span><span class="ds-m">${s.chips.length ? s.chips.join('') : '<span class="ds-chip">gọn, thẳng hàng hơn</span>'}</span></span></button>`;
  }

  function fillSuggestions(holder, list) {
    holder.innerHTML = list.length
      ? `<div class="grid gap-1.5">${list.map(card).join('')}</div><p class="ds-note">Rê chuột để xem trước, bấm để áp dụng (Ctrl+Z để hoàn tác).</p>`
      : '<p class="ds-note">Vị trí hiện tại đã ổn: không tìm thấy cách dời hay nối lại nào giảm được giao cắt, khúc gấp hoặc chồng lấn.</p>';
    holder.querySelectorAll('[data-sug]').forEach(b => {
      const s = list[+b.dataset.sug];
      b.addEventListener('mouseenter', () => startPreview(s));
      b.addEventListener('focus', () => startPreview(s));
      b.addEventListener('mouseleave', endPreview);
      b.addEventListener('blur', endPreview);
      b.addEventListener('click', () => {
        endPreview();
        s.apply();
        commit(); render(); renderInspector();
      });
    });
  }

  // Cùng khung với thẻ gợi ý để mục "Liên kết thông minh" nhìn đồng bộ
  const actionCard = (key, icon, title, desc) => `<button type="button" class="ds-sug" data-ds="${key}"><span class="ds-ico">${uiIcon(icon, 16)}</span>
      <span><span class="ds-t">${title}</span><span class="ds-d">${desc}</span></span></button>`;

  function overviewHtml() {
    ensure();
    const m = metrics(SR.paths, SR.labels, buildCtx());
    const nonSmart = doc.edges.filter(e => !isSmart(e) && e.routing !== 'straight').length;
    return `<div class="ds-stats">
        <div class="ds-stat"><b>${m.cross}</b><span>giao cắt</span></div>
        <div class="ds-stat"><b>${m.bends}</b><span>khúc gấp</span></div>
        <div class="ds-stat"><b>${m.hits + m.labelHits}</b><span>đè khối / nhãn</span></div></div>
      <div class="grid gap-1.5">
        ${nonSmart ? actionCard('all', 'wand-sparkles', 'Chuyển sang nối thông minh', `${nonSmart} liên kết còn nối vuông góc / tự chỉnh`) : ''}
        ${actionCard('spread', 'chevrons-left-right-ellipsis', 'Dàn đều điểm nối', 'Các đường chung một cạnh khối được tách đều, không đè nhau')}
        ${actionCard('sides', 'route', 'Tự chọn cạnh nối tối ưu', 'Thử đổi cạnh đi / đến của từng đường để bớt giao cắt')}
      </div>
      <p class="ds-note">Chọn một khối hoặc một đường nối để xem gợi ý dời / nối lại cho riêng nó.</p>`;
  }

  function mountSuggestions() {
    const box = $('#inspector');
    if (!box || S.view === 'gantt') return;
    const sel = [...S.sel].map(byId).filter(Boolean);
    const ed = S.edgeSel && doc.edges.find(e => e.id === S.edgeSel);
    const single = !ed && sel.length === 1 && !sel[0].locked ? sel[0] : null;
    if (!ed && !single && sel.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'pgroup';
    wrap.id = 'dsSuggest';
    wrap.innerHTML = `<div class="pgroup-h">${ed || single ? 'Gợi ý bố cục' : 'Liên kết thông minh'}</div><div id="dsBody"></div>`;
    box.insertBefore(wrap, box.firstElementChild ? box.firstElementChild.nextSibling : null);
    const body = wrap.querySelector('#dsBody');

    if (!ed && !single) {
      body.innerHTML = overviewHtml();
      body.querySelector('[data-ds="all"]')?.addEventListener('click', () => {
        doc.edges.forEach(e => { if (e.routing !== 'straight') { e.routing = 'smart'; e.points = null; } });
        commit(); render(); renderInspector(); toast('Đã chuyển sang nối thông minh');
      });
      body.querySelector('[data-ds="spread"]').addEventListener('click', () => {
        const n = spreadPorts(); commit(); render(); renderInspector();
        toast(n ? `Đã dàn đều ${n} điểm nối` : 'Các điểm nối đã cách đều');
      });
      body.querySelector('[data-ds="sides"]').addEventListener('click', ev => {
        ev.currentTarget.setAttribute('aria-busy', 'true');
        optimizeAllSides();
      });
      return;
    }

    body.innerHTML = `<p class="ds-note flex items-center gap-1.5"><span class="ds-spin">${uiIcon('loader-circle', 14)}</span>Đang thử các vị trí…</p>`;
    // Chạy sau khi giao diện vẽ xong để bấm chọn / bắt đầu kéo không bị khựng
    clearTimeout(pending);
    const token = `${S.edgeSel}|${[...S.sel].join(',')}|${sig()}`;
    pending = setTimeout(() => {
      if (S.mode || !document.body.contains(body)) return;
      if (`${S.edgeSel}|${[...S.sel].join(',')}|${sig()}` !== token) return;
      ensure();
      try {
        fillSuggestions(body, ed ? edgeSuggestions(ed) : nodeSuggestions(single));
      } catch (err) {
        body.innerHTML = `<p class="ds-note">Không phân tích được: ${esc(err.message || String(err))}</p>`;
      }
    }, 180);
  }

  window.renderInspector = function () {
    endPreview();
    origRenderInspector.apply(this, arguments);
    mountSuggestions();
  };

  render();
  renderInspector();
})();
