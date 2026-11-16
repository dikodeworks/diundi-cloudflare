(() => {
  'use strict';

  const STORAGE_KEY = 'diputer:v1';
  const MAX_ITEMS = 24;
  const MAX_WINNERS = 60;
  const REEL_ROWS = 5;
  const REEL_COPIES = 5;

  const DEFAULTS = {
    participants: ['Budi', 'Sari', 'Rizky', 'Nadia', 'Fajar', 'Intan'],
    prizes: ['Voucher Rp100.000', 'Voucher Rp50.000', 'Merchandise', 'Pulsa Rp25.000', 'Zonk'],
    foods: ['Sate Ayam', 'Nasi Goreng', 'Mie Ayam', 'Bakso', 'Ayam Geprek', 'Martabak', 'Pecel Lele', 'Ramen'],
    places: ['Cafe', 'Mall', 'Taman Kota', 'Bioskop', 'Coffee Shop', 'Museum', 'Pasar Malam', 'Dufan']
  };

  const PRESETS = {
    makanan: [
      { label: 'Warung', items: ['Nasi Goreng', 'Mie Ayam', 'Bakso', 'Sate Ayam', 'Pecel Lele', 'Soto Ayam'] },
      { label: 'Cepat saji', items: ['Burger', 'Pizza', 'Ayam Geprek', 'Kentang Goreng', 'Ramen', 'Sandwich'] },
      { label: 'Sehat', items: ['Gado-gado', 'Salad', 'Soto Ayam', 'Pepes Ikan', 'Tumis Sayur', 'Buah Potong'] },
      { label: 'Nongkrong', items: ['Kafe', 'Coffee Shop', 'Martabak', 'Bakso', 'Roti Bakar', 'Es Kopi'] }
    ],
    tempat: [
      { label: 'Hemat', items: ['Taman Kota', 'Perpustakaan', 'Pasar Malam', 'Cafe Lokal', 'Alun-alun', 'Museum'] },
      { label: 'Nongkrong', items: ['Kafe', 'Coffee Shop', 'Mall', 'Bioskop', 'Rooftop', 'Pujasera'] },
      { label: 'Jalan-jalan', items: ['Pantai', 'Gunung', 'Kebun Binatang', 'Museum', 'Taman Rekreasi', 'Wisata Alam'] }
    ]
  };

  const TRASH_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12"/><path d="M10 11v5M14 11v5"/></svg>';

  const elements = {
    reel: document.getElementById('reel'),
    reelWindow: document.getElementById('reelWindow'),
    reelTrack: document.getElementById('reelTrack'),
    reelEmpty: document.getElementById('reelEmpty'),
    spinBtn: document.getElementById('spinBtn'),
    spinLabel: document.getElementById('spinLabel'),
    spinMeta: document.getElementById('spinMeta'),
    prizePicker: document.getElementById('prizePicker'),
    prizeSelect: document.getElementById('prizeSelect'),
    result: document.getElementById('result'),
    modeSwitch: document.getElementById('modeSwitch'),
    tabs: document.getElementById('tabs'),
    panelTitle: document.getElementById('panelTitle'),
    clearWinnersBtn: document.getElementById('clearWinnersBtn'),
    presets: document.getElementById('presets'),
    addForm: document.getElementById('addForm'),
    addInput: document.getElementById('addInput'),
    list: document.getElementById('list'),
    panelNote: document.getElementById('panelNote'),
    countPeserta: document.getElementById('countPeserta'),
    countHadiah: document.getElementById('countHadiah'),
    countPemenang: document.getElementById('countPemenang'),
    soundBtn: document.getElementById('soundBtn'),
    winModal: document.getElementById('winModal'),
    winName: document.getElementById('winName'),
    winPrize: document.getElementById('winPrize'),
    againBtn: document.getElementById('againBtn'),
    doneBtn: document.getElementById('doneBtn'),
    toast: document.getElementById('toast')
  };

  const state = {
    mode: 'undian',
    tab: 'peserta',
    participants: [],
    prizes: [],
    winners: [],
    foods: [],
    places: [],
    lastResult: null,
    prizeForSpin: null,
    sound: true,
    spinning: false
  };

  const ui = {
    toastTimer: 0,
    saveTimer: 0,
    tickGuard: 0,
    audioCtx: null,
    spinPrize: '',
    hold: null,
    center: 0,
    reelY: 0,
    resizeFrame: 0
  };

  /* ---------- helpers ---------- */
  const clampText = (value) => String(value).slice(0, 40);
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function randomInt(max) {
    if (max <= 0) return 0;
    if (window.crypto && window.crypto.getRandomValues) {
      const limit = Math.floor(0x100000000 / max) * max;
      const buffer = new Uint32Array(1);
      let value = 0;
      do {
        window.crypto.getRandomValues(buffer);
        value = buffer[0];
      } while (value >= limit);
      return value % max;
    }
    return Math.floor(Math.random() * max);
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    clearTimeout(ui.toastTimer);
    ui.toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 2300);
  }

  function reelItems() {
    if (state.mode === 'undian') return state.participants;
    return state.mode === 'makanan' ? state.foods : state.places;
  }

  function activeList() {
    if (state.mode === 'undian') {
      if (state.tab === 'peserta') return state.participants;
      if (state.tab === 'hadiah') return state.prizes;
      return null;
    }
    return state.mode === 'makanan' ? state.foods : state.places;
  }

  function resolvedPrize() {
    if (state.prizeForSpin === '') return '';
    if (state.prizeForSpin && state.prizes.includes(state.prizeForSpin)) return state.prizeForSpin;
    return state.prizes[0] || '';
  }

  /* ---------- storage ---------- */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: state.mode,
        tab: state.tab,
        participants: state.participants,
        prizes: state.prizes,
        winners: state.winners,
        foods: state.foods,
        places: state.places,
        prizeForSpin: state.prizeForSpin,
        lastResult: state.lastResult,
        sound: state.sound
      }));
    } catch (error) { /* ignore unavailable storage */ }
  }

  function scheduleSave() {
    clearTimeout(ui.saveTimer);
    ui.saveTimer = window.setTimeout(save, 350);
  }

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function load() {
    const saved = readStore();
    if (!saved || typeof saved !== 'object') return false;

    const stringList = (value) => {
      if (!Array.isArray(value)) return null;
      return value
        .filter((item) => typeof item === 'string')
        .map((item) => clampText(item))
        .slice(0, MAX_ITEMS);
    };

    const participants = stringList(saved.participants);
    if (participants) state.participants = participants;
    const prizes = stringList(saved.prizes);
    if (prizes) state.prizes = prizes;
    const foods = stringList(saved.foods);
    if (foods) state.foods = foods;
    const places = stringList(saved.places);
    if (places) state.places = places;

    if (Array.isArray(saved.winners)) {
      state.winners = saved.winners
        .filter((entry) => entry && typeof entry.name === 'string')
        .slice(0, MAX_WINNERS)
        .map((entry) => ({
          name: clampText(entry.name),
          prize: typeof entry.prize === 'string' ? clampText(entry.prize) : '',
          at: Number(entry.at) || Date.now()
        }));
    }

    if (saved.mode === 'undian' || saved.mode === 'makanan' || saved.mode === 'tempat') state.mode = saved.mode;
    if (saved.tab === 'peserta' || saved.tab === 'hadiah' || saved.tab === 'pemenang') state.tab = saved.tab;
    if (typeof saved.sound === 'boolean') state.sound = saved.sound;
    if (typeof saved.prizeForSpin === 'string') state.prizeForSpin = clampText(saved.prizeForSpin);
    else state.prizeForSpin = null;

    if (saved.lastResult && typeof saved.lastResult === 'object' && typeof saved.lastResult.name === 'string') {
      state.lastResult = {
        kind: saved.lastResult.kind === 'makanan' || saved.lastResult.kind === 'tempat' ? saved.lastResult.kind : 'undian',
        name: clampText(saved.lastResult.name),
        prize: typeof saved.lastResult.prize === 'string' ? clampText(saved.lastResult.prize) : '',
        at: Number(saved.lastResult.at) || Date.now()
      };
    }

    return true;
  }

  /* ---------- reel ---------- */
  function reelRowHeight() {
    const row = elements.reelTrack.querySelector('.reel-row');
    if (row) {
      const height = row.getBoundingClientRect().height;
      if (height > 0) return height;
    }
    return Math.max(40, elements.reelWindow.clientHeight / REEL_ROWS);
  }

  function setReelY(value) {
    ui.reelY = value;
    elements.reelTrack.style.transform = 'translateY(' + value + 'px)';
  }

  function buildReel(items, copies) {
    const fragment = document.createDocumentFragment();
    for (let copy = 0; copy < copies; copy++) {
      items.forEach((label) => {
        const row = document.createElement('div');
        row.className = 'reel-row';

        const name = document.createElement('span');
        name.className = 'reel-label';
        name.textContent = label;

        row.appendChild(name);
        fragment.appendChild(row);
      });
    }
    elements.reelTrack.textContent = '';
    elements.reelTrack.appendChild(fragment);
    elements.reelTrack.setAttribute('aria-hidden', 'true');
  }

  function centerRow(index, total, copies) {
    const rowHeight = reelRowHeight();
    const global = Math.floor(copies / 2) * total + index;
    const y = (Math.floor(REEL_ROWS / 2) - global) * rowHeight;
    setReelY(y);
  }

  function renderReel() {
    const list = reelItems();
    let items = list;
    let center = Math.min(ui.center, Math.max(0, list.length - 1));

    if (ui.hold && ui.hold.mode === state.mode && ui.hold.items.length) {
      items = ui.hold.items;
      center = Math.min(ui.hold.index, items.length - 1);
    }

    elements.reelEmpty.hidden = items.length > 0;
    elements.reelEmpty.textContent = state.mode === 'undian' ? 'Tambahkan peserta' : 'Tambahkan pilihan';

    if (!items.length) {
      elements.reelTrack.textContent = '';
      setReelY(0);
      return;
    }

    buildReel(items, REEL_COPIES);
    centerRow(center, items.length, REEL_COPIES);
  }

  function scheduleReelRender() {
    if (state.spinning) return;
    if (ui.resizeFrame) return;
    ui.resizeFrame = window.requestAnimationFrame(() => {
      ui.resizeFrame = 0;
      renderReel();
    });
  }

  /* ---------- audio ---------- */
  function ensureAudio() {
    if (!state.sound) return null;
    if (!ui.audioCtx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      ui.audioCtx = new AudioCtor();
    }
    if (ui.audioCtx.state === 'suspended') ui.audioCtx.resume();
    return ui.audioCtx;
  }

  function playTick() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(820, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.04);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function playWin() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      const start = ctx.currentTime + index * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  function updateSoundButton() {
    elements.soundBtn.setAttribute('aria-pressed', String(state.sound));
    elements.soundBtn.setAttribute('aria-label', state.sound ? 'Matikan suara' : 'Nyalakan suara');
    elements.soundBtn.title = state.sound ? 'Suara: aktif' : 'Suara: mati';
  }

  function toggleSound() {
    state.sound = !state.sound;
    updateSoundButton();
    if (state.sound) {
      ensureAudio();
      playTick();
    }
    save();
  }

  /* ---------- spin ---------- */
  function spin() {
    if (state.spinning) return;
    if (elements.winModal.open) return;

    const list = reelItems();
    if (list.length < 2) {
      showToast(state.mode === 'undian' ? 'Butuh minimal 2 peserta' : 'Butuh minimal 2 pilihan');
      return;
    }

    ensureAudio();
    state.spinning = true;
    ui.hold = null;
    ui.spinPrize = state.mode === 'undian' ? resolvedPrize() : '';
    elements.spinBtn.disabled = true;
    elements.spinBtn.classList.add('spinning');
    elements.spinLabel.textContent = 'Memutar…';
    renderPrizePicker();
    renderResult();

    const snapshot = list.slice();
    const total = snapshot.length;
    const winner = randomInt(total);
    const reduced = prefersReducedMotion();
    const cycles = reduced ? 2 : Math.min(7, Math.max(2, Math.ceil(14 / total)));
    const copies = cycles + 4;

    buildReel(snapshot, copies);
    const rowHeight = reelRowHeight();
    const targetGlobal = total + winner;
    const targetY = (Math.floor(REEL_ROWS / 2) - targetGlobal) * rowHeight;
    const distance = cycles * total * rowHeight;
    const startY = targetY - distance;
    const duration = reduced ? 700 : 2700 + Math.random() * 700;
    const startedAt = performance.now();

    setReelY(startY);
    ui.center = winner;
    let lastIndex = Math.floor(-startY / rowHeight);

    function frame(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 5);
      const y = startY + distance * eased;
      setReelY(y);

      const index = Math.floor(-y / rowHeight);
      if (index !== lastIndex) {
        lastIndex = index;
        if (now - ui.tickGuard > 32) {
          ui.tickGuard = now;
          playTick();
        }
      }

      if (progress < 1) {
        window.requestAnimationFrame(frame);
        return;
      }

      setReelY(targetY);
      ui.hold = { mode: state.mode, items: snapshot.slice(), index: winner };
      finishSpin(winner);
    }

    window.requestAnimationFrame(frame);
  }

  function finishSpin(winner) {
    state.spinning = false;
    elements.spinBtn.classList.remove('spinning');
    elements.spinLabel.textContent = 'Putar';

    if (state.mode === 'undian') {
      const name = state.participants[winner];
      if (!name) {
        renderAll();
        return;
      }

      const prize = ui.spinPrize || '';
      const prizeIndex = prize ? state.prizes.indexOf(prize) : -1;
      const at = Date.now();
      state.winners.unshift({ name: name, prize: prize, at: at });
      state.winners = state.winners.slice(0, MAX_WINNERS);
      state.participants.splice(winner, 1);
      if (prizeIndex >= 0) state.prizes.splice(prizeIndex, 1);
      state.prizeForSpin = null;
      state.lastResult = { kind: 'undian', name: name, prize: prize, at: at };

      ui.center = Math.min(winner, Math.max(0, state.participants.length - 1));
      renderAll();
      save();
      openWinModal(name, prize);
      playWin();
      return;
    }

    const name = reelItems()[winner];
    if (!name) {
      renderAll();
      return;
    }

    state.lastResult = { kind: state.mode, name: name, prize: '', at: Date.now() };
    ui.center = winner;
    renderAll();
    save();
    playWin();
  }

  /* ---------- modal ---------- */
  function openWinModal(name, prize) {
    elements.winName.textContent = name;
    elements.winPrize.textContent = prize || 'Tanpa hadiah';
    elements.winPrize.classList.toggle('muted', !prize);
    if (!elements.winModal.open) elements.winModal.showModal();
  }

  /* ---------- rendering ---------- */
  function renderAll() {
    renderModeButtons();
    renderTabs();
    renderPanel();
    renderPrizePicker();
    renderMeta();
    renderResult();
    updateSpinAvailability();
    renderReel();
  }

  function renderModeButtons() {
    const buttons = elements.modeSwitch.querySelectorAll('button[data-mode]');
    buttons.forEach((button) => {
      const on = button.dataset.mode === state.mode;
      button.classList.toggle('on', on);
      button.setAttribute('aria-pressed', String(on));
    });
  }

  function renderTabs() {
    elements.countPeserta.textContent = String(state.participants.length);
    elements.countHadiah.textContent = String(state.prizes.length);
    elements.countPemenang.textContent = String(state.winners.length);

    const buttons = elements.tabs.querySelectorAll('button[data-tab]');
    buttons.forEach((button) => {
      const on = button.dataset.tab === state.tab;
      button.classList.toggle('on', on);
      button.setAttribute('aria-pressed', String(on));
    });
  }

  function renderPrizePicker() {
    const isUndian = state.mode === 'undian';
    elements.prizePicker.hidden = !isUndian;
    if (!isUndian) return;

    if (state.prizeForSpin && !state.prizes.includes(state.prizeForSpin)) state.prizeForSpin = null;

    const current = resolvedPrize();
    elements.prizeSelect.textContent = '';

    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'Tanpa hadiah';
    elements.prizeSelect.appendChild(none);

    state.prizes.forEach((prize) => {
      const option = document.createElement('option');
      option.value = prize;
      option.textContent = prize;
      elements.prizeSelect.appendChild(option);
    });

    elements.prizeSelect.value = current;
    elements.prizeSelect.disabled = state.spinning || state.prizes.length === 0;
    elements.prizePicker.classList.toggle('is-muted', !current);
  }

  function setPanel(title, placeholder, note) {
    elements.panelTitle.firstChild.nodeValue = title;
    elements.addInput.placeholder = placeholder;
    elements.addInput.setAttribute('aria-label', placeholder.replace('…', ''));
    elements.panelNote.textContent = note;
  }

  function renderPanel() {
    const isUndian = state.mode === 'undian';
    elements.tabs.hidden = !isUndian;
    elements.presets.hidden = isUndian;
    elements.clearWinnersBtn.hidden = !(isUndian && state.tab === 'pemenang' && state.winners.length > 0);

    if (isUndian) {
      if (state.tab === 'peserta') {
        setPanel('Peserta', 'Tambah nama peserta…', 'Peserta yang menang otomatis keluar dari daftar. Reel selalu memutar nama peserta.');
        elements.addForm.hidden = false;
        renderRows(state.participants, 'peserta', 'Belum ada peserta. Tambahkan minimal 2.');
      } else if (state.tab === 'hadiah') {
        setPanel('Hadiah', 'Tambah hadiah…', 'Pilih hadiah yang diputar lewat "Hadiah diputar". Hadiah pemenang otomatis keluar dari daftar.');
        elements.addForm.hidden = false;
        renderRows(state.prizes, 'hadiah', 'Belum ada hadiah. Pemenang tetap bisa diundi tanpa hadiah.');
      } else {
        setPanel('Pemenang', '', 'Riwayat undian tersimpan otomatis di perangkat ini.');
        elements.addForm.hidden = true;
        renderWinners();
      }
      return;
    }

    const food = state.mode === 'makanan';
    setPanel(
      food ? 'Pilihan makanan' : 'Pilihan tempat',
      food ? 'Tambah makanan…' : 'Tambah tempat…',
      'Kalau dia jawab "terserah", putar ini lalu ikuti hasilnya. Bisa diubah kapan saja.'
    );
    renderPresets(food);
    elements.addForm.hidden = false;
    renderRows(food ? state.foods : state.places, food ? 'makanan' : 'tempat', 'Belum ada pilihan. Tambahkan minimal 2.');
  }

  function renderPresets(food) {
    elements.presets.textContent = '';
    const presets = PRESETS[food ? 'makanan' : 'tempat'] || [];
    presets.forEach((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = preset.label;
      button.addEventListener('click', () => applyPreset(preset));
      elements.presets.appendChild(button);
    });
  }

  function renderRows(items, ariaPrefix, emptyText) {
    elements.list.textContent = '';

    if (!items.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = emptyText;
      elements.list.appendChild(empty);
      return;
    }

    items.forEach((label, index) => {
      const row = document.createElement('li');
      row.className = 'row';
      row.dataset.index = String(index);

      const number = document.createElement('span');
      number.className = 'row-index';
      number.textContent = String(index + 1);

      const input = document.createElement('input');
      input.type = 'text';
      input.value = label;
      input.maxLength = 40;
      input.dataset.action = 'edit';
      input.setAttribute('aria-label', ariaPrefix + ' ' + (index + 1));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'row-del';
      remove.dataset.action = 'delete';
      remove.setAttribute('aria-label', 'Hapus ' + label);
      remove.innerHTML = TRASH_ICON;

      row.append(number, input, remove);
      elements.list.appendChild(row);
    });
  }

  function renderWinners() {
    elements.list.textContent = '';

    if (!state.winners.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'Belum ada pemenang. Putar reel untuk mulai.';
      elements.list.appendChild(empty);
      return;
    }

    state.winners.forEach((entry, index) => {
      const row = document.createElement('li');
      row.className = 'winner';

      const rank = document.createElement('span');
      rank.className = 'winner-rank';
      rank.textContent = String(state.winners.length - index);

      const body = document.createElement('div');
      body.className = 'winner-body';

      const name = document.createElement('div');
      name.className = 'winner-name';
      name.textContent = entry.name;

      const prize = document.createElement('div');
      prize.className = 'winner-prize';
      prize.textContent = entry.prize || 'Tanpa hadiah';

      const time = document.createElement('span');
      time.className = 'winner-time';
      time.textContent = timeAgo(entry.at);

      body.append(name, prize);
      row.append(rank, body, time);
      elements.list.appendChild(row);
    });
  }

  function timeAgo(timestamp) {
    const diff = Math.max(0, Date.now() - timestamp);
    if (diff < 60000) return 'baru saja';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' mnt lalu';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' jam lalu';
    if (diff < 7 * 86400000) return Math.floor(diff / 86400000) + ' hari lalu';
    try {
      return new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch (error) {
      return '';
    }
  }

  function renderMeta() {
    const total = reelItems().length;

    if (state.mode === 'undian') {
      elements.spinMeta.textContent = total < 2
        ? 'Tambahkan minimal 2 peserta untuk memutar.'
        : total + ' peserta · ' + state.prizes.length + ' hadiah tersisa';
      return;
    }

    const noun = state.mode === 'makanan' ? 'pilihan makanan' : 'pilihan tempat';
    elements.spinMeta.textContent = total < 2
      ? 'Tambahkan minimal 2 pilihan untuk memutar.'
      : total + ' ' + noun;
  }

  function renderResult() {
    elements.result.textContent = '';
    elements.reel.classList.toggle('picked', !state.spinning && !!state.lastResult);

    if (state.spinning) {
      const food = state.mode === 'makanan';
      const box = document.createElement('p');
      box.className = 'result-spin';

      const label = document.createElement('span');
      label.className = 'kicker';
      label.textContent = state.mode === 'undian' ? 'Hadiah diputar' : 'Sedang memutar';

      const name = document.createElement('strong');
      name.textContent = state.mode === 'undian'
        ? (ui.spinPrize || 'Tanpa hadiah')
        : food ? 'Pilihan makanan' : 'Pilihan tempat';

      const sub = document.createElement('span');
      sub.textContent = state.mode === 'undian'
        ? reelItems().length + ' peserta ikut diundi…'
        : 'Tunggu hasilnya…';

      box.append(label, name, sub);
      elements.result.appendChild(box);
      return;
    }

    const result = state.lastResult;

    if (!result) {
      const empty = document.createElement('p');
      empty.className = 'result-empty';
      empty.textContent = 'Hasil putaran muncul di sini.';
      elements.result.appendChild(empty);
      return;
    }

    const kicker = result.kind === 'undian' ? 'Pemenang' : result.kind === 'makanan' ? 'Makan hari ini' : 'Pergi ke';
    const sub = result.kind === 'undian'
      ? (result.prize || 'Tanpa hadiah')
      : result.kind === 'makanan'
        ? 'Selamat makan — nggak perlu debat lagi.'
        : 'Tinggal tentukan jamnya.';

    const inner = document.createElement('div');
    inner.className = 'result-inner';

    const label = document.createElement('span');
    label.className = 'result-kicker';
    label.textContent = kicker;

    const name = document.createElement('strong');
    name.className = 'result-name';
    name.textContent = result.name;

    const description = document.createElement('span');
    description.className = 'result-sub';
    description.textContent = sub;

    inner.append(label, name, description);
    elements.result.appendChild(inner);
  }

  function updateSpinAvailability() {
    const enough = reelItems().length >= 2;
    elements.spinBtn.disabled = state.spinning || !enough;
    elements.spinLabel.textContent = state.spinning ? 'Memutar…' : 'Putar';
    if (enough) elements.spinBtn.removeAttribute('title');
    else elements.spinBtn.title = 'Butuh minimal 2 pilihan';
  }

  /* ---------- actions ---------- */
  function applyPreset(preset) {
    const food = state.mode === 'makanan';
    const target = food ? state.foods : state.places;
    target.splice(0, target.length, ...preset.items.slice(0, MAX_ITEMS));
    state.lastResult = null;
    ui.hold = null;
    ui.center = 0;
    renderAll();
    save();
    showToast('Preset "' + preset.label + '" dimuat');
  }

  function setMode(mode) {
    if (state.spinning) {
      showToast('Tunggu putaran selesai dulu');
      return;
    }
    if (mode === state.mode) return;
    state.mode = mode;
    state.lastResult = null;
    ui.hold = null;
    ui.center = 0;
    renderAll();
    save();
  }

  function setTab(tab) {
    if (state.tab === tab) return;
    state.tab = tab;
    renderTabs();
    renderPanel();
    save();
  }

  function addItem(event) {
    event.preventDefault();
    const list = activeList();
    if (!list) return;

    const value = elements.addInput.value.trim();
    if (!value) {
      elements.addInput.focus();
      return;
    }
    if (list.length >= MAX_ITEMS) {
      showToast('Maksimal ' + MAX_ITEMS + ' item');
      return;
    }

    list.push(clampText(value));
    if (list === reelItems()) ui.hold = null;
    elements.addInput.value = '';
    elements.addInput.focus();
    renderAll();
    save();
    elements.list.scrollTop = elements.list.scrollHeight;
  }

  function onListInput(event) {
    const input = event.target.closest('input[data-action="edit"]');
    if (!input) return;
    const row = input.closest('.row');
    const list = activeList();
    if (!row || !list) return;
    const index = Number(row.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= list.length) return;
    const previous = list[index];
    list[index] = input.value;
    if (list === state.prizes && state.prizeForSpin === previous) {
      state.prizeForSpin = input.value;
      renderPrizePicker();
    }
    if (ui.hold && list === reelItems() && index < ui.hold.items.length) {
      ui.hold.items[index] = input.value;
    }
    scheduleReelRender();
    scheduleSave();
  }

  function onListClick(event) {
    const button = event.target.closest('button[data-action="delete"]');
    if (!button) return;
    const row = button.closest('.row');
    const list = activeList();
    if (!row || !list) return;
    const index = Number(row.dataset.index);
    if (!Number.isInteger(index)) return;
    list.splice(index, 1);
    if (list === state.prizes && state.prizeForSpin && !state.prizes.includes(state.prizeForSpin)) {
      state.prizeForSpin = null;
    }
    if (list === reelItems()) {
      ui.hold = null;
      if (index < ui.center) ui.center = Math.max(0, ui.center - 1);
      ui.center = Math.min(ui.center, Math.max(0, list.length - 1));
    }
    renderAll();
    save();
  }

  function clearWinners() {
    if (!state.winners.length) return;
    if (!window.confirm('Hapus seluruh riwayat pemenang?')) return;
    state.winners = [];
    renderAll();
    save();
    showToast('Riwayat pemenang dihapus');
  }

  /* ---------- events ---------- */
  function bindEvents() {
    elements.spinBtn.addEventListener('click', spin);
    elements.addForm.addEventListener('submit', addItem);
    elements.list.addEventListener('input', onListInput);
    elements.list.addEventListener('click', onListClick);
    elements.list.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.matches('input')) event.target.blur();
    });
    elements.clearWinnersBtn.addEventListener('click', clearWinners);
    elements.soundBtn.addEventListener('click', toggleSound);

    elements.prizeSelect.addEventListener('change', () => {
      state.prizeForSpin = elements.prizeSelect.value || '';
      renderPrizePicker();
      save();
    });

    elements.modeSwitch.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-mode]');
      if (!button) return;
      setMode(button.dataset.mode);
    });

    elements.tabs.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-tab]');
      if (!button) return;
      setTab(button.dataset.tab);
    });

    elements.doneBtn.addEventListener('click', () => elements.winModal.close());
    elements.againBtn.addEventListener('click', () => {
      elements.winModal.close();
      window.setTimeout(spin, 250);
    });
    elements.winModal.addEventListener('click', (event) => {
      if (event.target === elements.winModal) elements.winModal.close();
    });
    elements.winModal.addEventListener('close', () => {
      elements.spinBtn.focus();
    });

    document.addEventListener('keydown', (event) => {
      if (event.code !== 'Space' && event.key !== ' ') return;
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON' || target.isContentEditable)) return;
      if (elements.winModal.open) return;
      event.preventDefault();
      spin();
    });

    window.addEventListener('resize', scheduleReelRender);

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(scheduleReelRender);
      observer.observe(elements.reelWindow);
    }
  }

  /* ---------- pwa ---------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache is optional */ });
  }

  /* ---------- init ---------- */
  function init() {
    const restored = load();

    if (!restored) {
      state.participants = DEFAULTS.participants.slice();
      state.prizes = DEFAULTS.prizes.slice();
      state.foods = DEFAULTS.foods.slice();
      state.places = DEFAULTS.places.slice();
    }

    let requestedMode = '';
    try {
      requestedMode = new URLSearchParams(window.location.search).get('mode') || '';
    } catch (error) {
      requestedMode = '';
    }
    if (requestedMode === 'undian' || requestedMode === 'makanan' || requestedMode === 'tempat') {
      state.mode = requestedMode;
      state.lastResult = null;
    }

    updateSoundButton();
    renderAll();
    bindEvents();
    if (document.readyState === 'complete') registerServiceWorker();
    else window.addEventListener('load', registerServiceWorker);
    if (!restored || requestedMode) save();
  }

  init();
})();
