/* ===========================
   日程管理系统 — 核心逻辑
   =========================== */

(function () {
  'use strict';

  // ── 常量 ──────────────────────────────────────────────
  const STORAGE_KEY = 'daily_routine_schedules';
  const DAY_NAMES   = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const MONTH_NAMES = ['一月','二月','三月','四月','五月','六月',
                       '七月','八月','九月','十月','十一月','十二月'];
  const CAT_LABELS  = { work:'工作', study:'学习', life:'生活', health:'健康', social:'社交', other:'其他' };
  const PRI_LABELS  = { high:'高', medium:'中', low:'低' };

  // ── 数据层 ────────────────────────────────────────────
  function loadSchedules() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (_) {
      return [];
    }
  }

  function saveSchedules(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function addSchedule(item) {
    const list = loadSchedules();
    item.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    list.push(item);
    saveSchedules(list);
  }

  function deleteSchedule(id) {
    const list = loadSchedules().filter(s => s.id !== id);
    saveSchedules(list);
  }

  function getScheduleById(id) {
    return loadSchedules().find(s => s.id === id) || null;
  }

  // ── 日期工具 ──────────────────────────────────────────
  function today() {
    return new Date();
  }

  function toDateStr(d) {
    // yyyy-MM-dd
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** 获取本周一到周日（以周一为起始） */
  function getWeekDays() {
    const d = today();
    const dow = d.getDay(); // 0=Sun
    // 偏移到本周一
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((dow + 6) % 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(mon);
      day.setDate(mon.getDate() + i);
      days.push(day);
    }
    return days;
  }

  // ── 视图切换 ──────────────────────────────────────────
  const views   = document.querySelectorAll('.view');
  const navBtns = document.querySelectorAll('.nav-btn');

  function switchView(name) {
    views.forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === name));

    if (name === 'weekly') renderWeekly();
    if (name === 'future') renderFuture();
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // ── 本周日程渲染 ──────────────────────────────────────
  function renderWeekly() {
    const weekDays  = getWeekDays();
    const allSched  = loadSchedules();
    const todayStr  = toDateStr(today());
    const grid      = document.getElementById('weeklyGrid');
    const weekLabel = document.getElementById('weekLabel');

    // 标题：起止日期
    weekLabel.textContent = `${weekDays[0].getMonth()+1}月${weekDays[0].getDate()}日 — ${weekDays[6].getMonth()+1}月${weekDays[6].getDate()}日`;

    grid.innerHTML = '';

    weekDays.forEach(date => {
      const dateStr = toDateStr(date);
      const isToday = dateStr === todayStr;
      const events  = allSched.filter(s => s.date === dateStr);

      const col = document.createElement('div');
      col.className = 'day-column' + (isToday ? ' today' : '');

      col.innerHTML = `
        <div class="day-header">
          <div class="day-name">${DAY_NAMES[date.getDay()]}</div>
          <div class="day-date">${date.getDate()}</div>
        </div>
        <div class="day-events" id="events-${dateStr}"></div>
      `;

      grid.appendChild(col);

      const eventsEl = col.querySelector('.day-events');
      if (events.length === 0) {
        eventsEl.innerHTML = '<span class="no-events-msg">无日程</span>';
      } else {
        events.forEach(ev => {
          const chip = document.createElement('div');
          chip.className = `event-chip cat-${ev.category}`;
          chip.innerHTML = `
            ${ev.startTime ? `<span class="event-time">${ev.startTime}${ev.endTime ? ' – ' + ev.endTime : ''}</span>` : ''}
            ${escHtml(ev.title)}
          `;
          chip.addEventListener('click', () => openModal(ev.id));
          eventsEl.appendChild(chip);
        });
      }
    });
  }

  // ── 未来计划渲染 ──────────────────────────────────────
  function renderFuture() {
    const todayStr  = toDateStr(today());
    const future    = loadSchedules()
      .filter(s => s.date > todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const list      = document.getElementById('futureList');
    const emptyTip  = document.getElementById('futureEmpty');
    const countBadge= document.getElementById('futureCount');

    list.innerHTML   = '';
    countBadge.textContent = `${future.length} 项计划`;

    if (future.length === 0) {
      emptyTip.classList.add('visible');
      return;
    }
    emptyTip.classList.remove('visible');

    future.forEach(s => {
      const d = new Date(s.date + 'T00:00:00');
      const card = document.createElement('div');
      card.className = `plan-card cat-${s.category}`;
      card.innerHTML = `
        <div class="plan-date-block">
          <div class="plan-month">${MONTH_NAMES[d.getMonth()]}</div>
          <div class="plan-day">${d.getDate()}</div>
        </div>
        <div class="plan-info">
          <h3>${escHtml(s.title)}</h3>
          <div class="plan-meta">
            <span>${DAY_NAMES[d.getDay()]}</span>
            ${s.startTime ? `<span>🕐 ${s.startTime}${s.endTime ? ' – ' + s.endTime : ''}</span>` : ''}
            <span class="plan-tag cat-label cat-${s.category}">${CAT_LABELS[s.category] || s.category}</span>
            <span class="plan-tag pri-${s.priority}">${PRI_LABELS[s.priority] || s.priority}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => openModal(s.id));
      list.appendChild(card);
    });
  }

  // ── 添加日程表单 ──────────────────────────────────────
  const addForm    = document.getElementById('addForm');
  const clearBtn   = document.getElementById('clearFormBtn');
  const dateInput  = document.getElementById('scheduleDate');

  // 默认填今天日期
  dateInput.value = toDateStr(today());

  addForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const item = {
      title:     addForm.scheduleTitle.value.trim(),
      date:      addForm.scheduleDate.value,
      startTime: addForm.scheduleStart.value,
      endTime:   addForm.scheduleEnd.value,
      category:  addForm.scheduleCategory.value,
      priority:  addForm.schedulePriority.value,
      note:      addForm.scheduleNote.value.trim(),
    };

    if (!item.title || !item.date) {
      showToast('请填写标题和日期！');
      return;
    }

    addSchedule(item);
    showToast('日程已保存 ✓');
    clearForm();
    switchView('weekly');
  });

  clearBtn.addEventListener('click', clearForm);

  function clearForm() {
    addForm.reset();
    dateInput.value = toDateStr(today());
    addForm.schedulePriority.value = 'medium';
  }

  // ── 详情弹窗 ──────────────────────────────────────────
  const overlay    = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody  = document.getElementById('modalBody');
  let   activeId   = null;

  function openModal(id) {
    const s = getScheduleById(id);
    if (!s) return;
    activeId = id;

    modalTitle.textContent = s.title;

    const d = new Date(s.date + 'T00:00:00');
    const dateLabel = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${DAY_NAMES[d.getDay()]}`;

    modalBody.innerHTML = `
      <div class="detail-row"><span class="detail-label">日期</span><span class="detail-value">${dateLabel}</span></div>
      ${s.startTime ? `<div class="detail-row"><span class="detail-label">时间</span><span class="detail-value">${s.startTime}${s.endTime ? ' – ' + s.endTime : ''}</span></div>` : ''}
      <div class="detail-row"><span class="detail-label">分类</span><span class="detail-value">${CAT_LABELS[s.category] || s.category}</span></div>
      <div class="detail-row"><span class="detail-label">优先级</span><span class="detail-value">${PRI_LABELS[s.priority] || s.priority}</span></div>
      ${s.note ? `<div class="detail-row"><span class="detail-label">备注</span><span class="detail-value">${escHtml(s.note)}</span></div>` : ''}
    `;

    overlay.classList.add('open');
  }

  function closeModal() {
    overlay.classList.remove('open');
    activeId = null;
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  document.getElementById('modalDelete').addEventListener('click', () => {
    if (!activeId) return;
    deleteSchedule(activeId);
    closeModal();
    showToast('日程已删除');
    // 刷新当前视图
    const activeView = document.querySelector('.view.active');
    if (activeView && activeView.id === 'view-future') renderFuture();
    else renderWeekly();
  });

  document.getElementById('modalEdit').addEventListener('click', () => {
    if (!activeId) return;
    const s = getScheduleById(activeId);
    if (!s) return;
    // 填充表单，切换到添加视图进行编辑（先删再提交即为更新）
    closeModal();
    switchView('add');
    addForm.scheduleTitle.value    = s.title;
    addForm.scheduleDate.value     = s.date;
    addForm.scheduleStart.value    = s.startTime || '';
    addForm.scheduleEnd.value      = s.endTime   || '';
    addForm.scheduleCategory.value = s.category;
    addForm.schedulePriority.value = s.priority;
    addForm.scheduleNote.value     = s.note || '';
    deleteSchedule(s.id);
  });

  // ── Toast 消息 ─────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ── 工具：HTML 转义 ───────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── 初始化 ────────────────────────────────────────────
  function init() {
    // 注入示例数据（若为首次访问）
    if (loadSchedules().length === 0) {
      const td = toDateStr(today());
      const nextWeek = new Date(today());
      nextWeek.setDate(nextWeek.getDate() + 3);
      const futureDate = toDateStr(nextWeek);

      const twoWeeks = new Date(today());
      twoWeeks.setDate(twoWeeks.getDate() + 10);
      const futureDate2 = toDateStr(twoWeeks);

      [
        { title: '晨跑', date: td, startTime: '07:00', endTime: '07:45', category: 'health', priority: 'medium', note: '公园跑步 5km' },
        { title: '团队站会', date: td, startTime: '09:30', endTime: '10:00', category: 'work', priority: 'high', note: '同步本周工作进展' },
        { title: '阅读《深度工作》', date: td, startTime: '21:00', endTime: '22:00', category: 'study', priority: 'low', note: '' },
        { title: '季度复盘会议', date: futureDate, startTime: '14:00', endTime: '16:00', category: 'work', priority: 'high', note: '准备Q1数据报告' },
        { title: '朋友聚餐', date: futureDate, startTime: '18:30', endTime: '21:00', category: 'social', priority: 'medium', note: '老友叙旧' },
        { title: '健身房月卡续费', date: futureDate2, startTime: '', endTime: '', category: 'health', priority: 'low', note: '' },
      ].forEach(addSchedule);
    }

    renderWeekly();
  }

  init();

})();
