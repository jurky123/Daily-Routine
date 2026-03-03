          function importSchedules(list) {
            if (!currentUser || !Array.isArray(list)) return;
            memorySchedules = memorySchedules.concat(list);
            saveSchedules(memorySchedules);
          }
        // 当前账号
        let currentUser = '';

        // 登录弹窗逻辑
        document.addEventListener('DOMContentLoaded', function() {
          const loginBtn = document.getElementById('loginBtn');
          const loginOverlay = document.getElementById('loginOverlay');
          const loginClose = document.getElementById('loginClose');
          const loginConfirm = document.getElementById('loginConfirm');
          const loginUsername = document.getElementById('loginUsername');
          const loginPassword = document.getElementById('loginPassword');
          const currentUserSpan = document.getElementById('currentUser');

          // 显示弹窗
          if (loginBtn && loginOverlay) {
            loginBtn.addEventListener('click', function() {
              loginOverlay.classList.add('open');
            });
          }
          // 关闭弹窗
          if (loginClose && loginOverlay) {
            loginClose.addEventListener('click', function() {
              loginOverlay.classList.remove('open');
            });
          }
          if (loginOverlay) {
            loginOverlay.addEventListener('click', function(e) {
              if (e.target === loginOverlay) loginOverlay.classList.remove('open');
            });
          }
          // 登录确认
          if (loginConfirm) {
            loginConfirm.addEventListener('click', function() {
              const username = loginUsername.value.trim();
              const password = loginPassword.value.trim();
              if (!username) {
                alert('请输入用户名');
                return;
              }
              // 登录API
              fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
              }).then(res => res.json()).then(data => {
                if (data.success) {
                  currentUser = username;
                  currentUserSpan.textContent = '当前账号：' + username;
                  currentUserSpan.style.display = '';
                  loginOverlay.classList.remove('open');
                  showToast('登录成功');
                  // 登录后加载数据
                  loadUserSchedules();
                } else {
                  alert(data.error || '登录失败');
                }
              }).catch(() => alert('网络错误'));
            });
          }
        });

        // 加载当前账号日程
        function loadUserSchedules() {
          if (!currentUser) return;
          fetch('/api/load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser })
          }).then(res => res.json()).then(data => {
            if (Array.isArray(data.data)) {
              memorySchedules = data.data;
              renderWeekly();
              renderFuture();
            }
          });
        }
      // 设置弹窗逻辑
      document.addEventListener('DOMContentLoaded', function() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsOverlay = document.getElementById('settingsOverlay');
        const settingsClose = document.getElementById('settingsClose');
        // 显示弹窗
        if (settingsBtn && settingsOverlay) {
          settingsBtn.addEventListener('click', function() {
            console.log('[调试] 设置按钮被点击');
            settingsOverlay.classList.add('open');
            console.log('[调试] 设置弹窗已添加open类');
          });
        } else {
          console.log('[调试] 未找到settingsBtn或settingsOverlay', settingsBtn, settingsOverlay);
        }
        // 关闭弹窗
        if (settingsClose && settingsOverlay) {
          settingsClose.addEventListener('click', function() {
            settingsOverlay.classList.remove('open');
            console.log('[调试] 设置弹窗已关闭');
          });
        } else {
          console.log('[调试] 未找到settingsClose或settingsOverlay', settingsClose, settingsOverlay);
        }
        if (settingsOverlay) {
          settingsOverlay.addEventListener('click', function(e) {
            if (e.target === settingsOverlay) {
              settingsOverlay.classList.remove('open');
              console.log('[调试] 点击遮罩关闭设置弹窗');
            }
          });
        }
      });
    // 批量导入日程解析
    function parseBatchImport(text) {
      // 每行格式：日期 [开始-结束] 标题 分类 优先级 [备注]
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const result = [];
      lines.forEach(line => {
        // 正则匹配：2026-03-05 09:00-10:00 会议 工作 高 需准备材料
        const m = line.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*(.*)$/);
        if (m) {
          result.push({
            date: m[1],
            startTime: m[2],
            endTime: m[3],
            title: m[4],
            category: m[5],
            priority: m[6],
            note: m[7] || '',
            period: 'none',
            repeat: 1,
            doneCount: 0,
            done: false
          });
          return;
        }
        // 允许无时间：2026-03-05 会议 工作 高 备注
        const m2 = line.match(/^(\d{4}-\d{2}-\d{2})\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s*(.*)$/);
        if (m2) {
          result.push({
            date: m2[1],
            startTime: '',
            endTime: '',
            title: m2[2],
            category: m2[3],
            priority: m2[4],
            note: m2[5] || '',
            period: 'none',
            repeat: 1,
            doneCount: 0,
            done: false
          });
        }
      });
      return result;
    }

    // 批量导入按钮事件
    document.addEventListener('DOMContentLoaded', function() {
      const btn = document.getElementById('batchImportBtn');
      if (btn) {
        btn.addEventListener('click', function() {
          const textarea = document.getElementById('batchImport');
          if (!textarea) return;
          const items = parseBatchImport(textarea.value);
          if (items.length === 0) {
            alert('未识别到有效日程，请检查格式！');
            return;
          }
          items.forEach(addSchedule);
          textarea.value = '';
          showToast('批量导入成功');
          renderWeekly();
          renderFuture();
        });
      }
    });
  // 获取指定天数的日期数组
  function getDaysRange(startDate, days) {
    const arr = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      arr.push(d);
    }
    return arr;
  }

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
  
    // 通过API按账号加载日程
    function loadSchedules() {
      if (!currentUser) return;
      fetch('/api/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser })
      }).then(res => res.json()).then(data => {
        if (data.success && Array.isArray(data.data)) {
          memorySchedules = data.data;
          renderSchedules();
        } else {
          memorySchedules = [];
          renderSchedules();
        }
      });
    }

  function saveSchedules(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    memorySchedules = Array.isArray(list) ? list : [];
        // 保存到后端API
        if (!currentUser) return;
        fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUser, data: memorySchedules })
        }).then(res => res.json()).then(data => {
          if (!data.success) {
            showToast('保存失败');
          }
        });
        }

  function addSchedule(item) {
    if (!currentUser) return;
    item.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    // 直接本地更新并API保存
    memorySchedules.push(item);
    saveSchedules(memorySchedules);
  }

  function deleteSchedule(id) {
    if (!currentUser) return;
    memorySchedules = memorySchedules.filter(s => s.id !== id);
    saveSchedules(memorySchedules);
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
    // 获取选择的范围
    const rangeSel = document.getElementById('rangeSelect');
    let days = 7;
    let startDate = today();
    let label = '';
    if (rangeSel) {
      switch (rangeSel.value) {
        case 'week':
          // 本周一到周日
          const d = today();
          const dow = d.getDay();
          startDate = new Date(d);
          startDate.setDate(d.getDate() - ((dow + 6) % 7));
          days = 7;
          label = `${startDate.getMonth()+1}月${startDate.getDate()}日 — `;
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          label += `${endDate.getMonth()+1}月${endDate.getDate()}日`;
          break;
        case 'nextweek':
          // 下周一到下周日
          const td = today();
          const tdow = td.getDay();
          startDate = new Date(td);
          startDate.setDate(td.getDate() - ((tdow + 6) % 7) + 7);
          days = 7;
          label = `${startDate.getMonth()+1}月${startDate.getDate()}日 — `;
          const endDate2 = new Date(startDate);
          endDate2.setDate(startDate.getDate() + 6);
          label += `${endDate2.getMonth()+1}月${endDate2.getDate()}日`;
          break;
        case '2weeks':
          // 本周一起14天
          const td2 = today();
          const tdow2 = td2.getDay();
          startDate = new Date(td2);
          startDate.setDate(td2.getDate() - ((tdow2 + 6) % 7));
          days = 14;
          const endDate3 = new Date(startDate);
          endDate3.setDate(startDate.getDate() + 13);
          label = `${startDate.getMonth()+1}月${startDate.getDate()}日 — ${endDate3.getMonth()+1}月${endDate3.getDate()}日`;
          break;
        case '30days':
          // 今天起30天
          startDate = today();
          days = 30;
          const endDate4 = new Date(startDate);
          endDate4.setDate(startDate.getDate() + 29);
          label = `${startDate.getMonth()+1}月${startDate.getDate()}日 — ${endDate4.getMonth()+1}月${endDate4.getDate()}日`;
          break;
      }
    }
    const daysArr = getDaysRange(startDate, days);
    const allSched  = loadSchedules();
    const todayStr  = toDateStr(today());
    const grid      = document.getElementById('weeklyGrid');
    const weekLabel = document.getElementById('weekLabel');
    weekLabel.textContent = label;
    grid.innerHTML = '';
    daysArr.forEach(date => {
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
          let typeLabel = '';
          if (ev.repeat && ev.repeat > 1) {
            typeLabel = '<span class="type-tag type-long">长期</span>';
          } else if (ev.period && ev.period !== 'none') {
            typeLabel = '<span class="type-tag type-cycle">周期</span>';
          } else {
            typeLabel = '<span class="type-tag type-temp">临时</span>';
          }
          chip.innerHTML = `
            ${typeLabel}
            ${ev.startTime ? `<span class="event-time">${ev.startTime}${ev.endTime ? ' – ' + ev.endTime : ''}</span>` : ''}
            ${escHtml(ev.title)}
            <span class="event-meta">
              ${ev.period && ev.period !== 'none' ? `<span class="event-period">${ev.period === 'daily' ? '每天' : ev.period === 'weekly' ? '每周' : ev.period === 'monthly' ? '每月' : ''}</span>` : ''}
              ${ev.repeat && ev.repeat > 1 ? `<span class="event-repeat">${ev.doneCount || 0}/${ev.repeat}次</span>` : ''}
              <span class="event-status ${ev.done ? 'done' : ''}">${ev.done ? '已完成' : '未完成'}</span>
            </span>
            <button class="btn btn-success btn-done" data-id="${ev.id}" ${ev.done ? 'disabled' : ''}>完成</button>
          `;
          chip.querySelector('.btn-done').addEventListener('click', function(e) {
            e.stopPropagation();
            markScheduleDone(ev.id);
          });
          chip.addEventListener('click', () => openModal(ev.id));
          eventsEl.appendChild(chip);
        });
      }
    });
    // 监听时间范围选择
    document.addEventListener('DOMContentLoaded', function() {
      const rangeSel = document.getElementById('rangeSelect');
      if (rangeSel) {
        rangeSel.addEventListener('change', renderWeekly);
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
      let typeLabel = '';
      if (s.repeat && s.repeat > 1) {
        typeLabel = '<span class="type-tag type-long">长期</span>';
      } else if (s.period && s.period !== 'none') {
        typeLabel = '<span class="type-tag type-cycle">周期</span>';
      } else {
        typeLabel = '<span class="type-tag type-temp">临时</span>';
      }
      card.innerHTML = `
        <div class="plan-date-block">
          <div class="plan-month">${MONTH_NAMES[d.getMonth()]}</div>
          <div class="plan-day">${d.getDate()}</div>
        </div>
        <div class="plan-info">
          <h3>${typeLabel}${escHtml(s.title)}</h3>
          <div class="plan-meta">
            <span>${DAY_NAMES[d.getDay()]}</span>
            ${s.startTime ? `<span>🕐 ${s.startTime}${s.endTime ? ' – ' + s.endTime : ''}</span>` : ''}
            <span class="plan-tag cat-label cat-${s.category}">${CAT_LABELS[s.category] || s.category}</span>
            <span class="plan-tag pri-${s.priority}">${PRI_LABELS[s.priority] || s.priority}</span>
            ${s.period && s.period !== 'none' ? `<span class="plan-tag period">${s.period === 'daily' ? '每天' : s.period === 'weekly' ? '每周' : s.period === 'monthly' ? '每月' : ''}</span>` : ''}
            ${s.repeat && s.repeat > 1 ? `<span class="plan-tag repeat">${s.doneCount || 0}/${s.repeat}次</span>` : ''}
            <span class="plan-tag status ${s.done ? 'done' : ''}">${s.done ? '已完成' : '未完成'}</span>
          </div>
          <button class="btn btn-success btn-done" data-id="${s.id}" ${s.done ? 'disabled' : ''}>完成</button>
        </div>
      `;
      card.querySelector('.btn-done').addEventListener('click', function(e) {
        e.stopPropagation();
        markScheduleDone(s.id);
      });
      card.addEventListener('click', () => openModal(s.id));
      list.appendChild(card);
    });
  }
  // 标记日程完成
  function markScheduleDone(id) {
    if (!currentUser) return;
    const idx = memorySchedules.findIndex(s => s.id === id);
    if (idx === -1) return;
    const s = memorySchedules[idx];
    if (s.repeat && s.repeat > 1) {
      s.doneCount = (s.doneCount || 0) + 1;
      if (s.doneCount >= s.repeat) {
        s.done = true;
      }
    } else {
      s.done = true;
    }
    saveSchedules(memorySchedules);
    renderWeekly();
    renderFuture();
    showToast('已标记为完成');
  }

  // ── 添加日程表单 ──────────────────────────────────────
  const addForm    = document.getElementById('addForm');
  const clearBtn   = document.getElementById('clearFormBtn');
  const dateInput  = document.getElementById('scheduleDate');

  // 默认填今天日期
  dateInput.value = toDateStr(today());

  addForm.addEventListener('submit', function (e) {
    e.preventDefault();


    // 新增：周期、长期、完成状态、完成次数
    const item = {
      title:     addForm.scheduleTitle.value.trim(),
      date:      addForm.scheduleDate.value,
      startTime: addForm.scheduleStart.value,
      endTime:   addForm.scheduleEnd.value,
      category:  addForm.scheduleCategory.value,
      priority:  addForm.schedulePriority.value,
      note:      addForm.scheduleNote.value.trim(),
      // 新增字段
      period:    addForm.schedulePeriod ? addForm.schedulePeriod.value : '', // 周期类型（如 daily/weekly/monthly/none）
      repeat:    addForm.scheduleRepeat ? parseInt(addForm.scheduleRepeat.value, 10) || 1 : 1, // 长期性需完成次数
      doneCount: 0, // 已完成次数
      done:      false // 是否已完成
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
