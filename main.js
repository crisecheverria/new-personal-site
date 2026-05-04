// ── CUSTOMIZE ME ──────────────────────────────────────────────────────────────

const ME = {
  name: "Cristian Echeverria",
  title: "software developer",
  location: "Göteborg, Sweden",
  about:
    "Fullstack developer, recently focused mainly in frontend. Experience writing fullstack apps with TypeScript and SQL databases, including unit/integration/end-to-end tests. I live in the terminal.\nNeovim, tmux, lazygit — the whole stack. I have experience using AI for daily work. I mainly use Claude code. And also have experience setup local models. I have integrated AI with my development environment and have experience writing AI agents using official SDK's and tools like Mastra for typescript. I started my AI journey with Copilot, Claude code web and then agentic claude code cli. I like to use AI in a way that makes sense to me and that increase my productivity but also dont reduce my IQ.",
  stack: [
    "TypeScript",
    "React",
    "NextJs",
    "Go",
    "GraphQL",
    "REST",
    "Node",
    "Database",
    "React Testing Library",
    "Redux",
    "Cypress/Playwright",
  ],
  learning: ["c/c++", "lua", "Go", "Rust"],
  workflow: ["Neovim", "tmux", "Ghostty", "lazygit"],
  email: "cristian.echeverri4@gmail.com",
  github: "https://github.com/crisecheverria",
  site: "https://cristianecheverria.com",
};

const PROJECTS = [
  {
    name: "Quest",
    type: "web",
    url: "https://github.com/crisecheverria/codequest-platform",
    desc: "Code challenges platform",
  },
  {
    name: "Svenska",
    type: "TUI",
    url: "https://github.com/crisecheverria/svenska",
    desc: "Terminal app for practicing Swedish",
  },
  {
    name: "github_profile",
    type: "link",
    url: "https://github.com/crisecheverria",
    desc: "all my public repos",
  },
];

// ── BUFFERS ───────────────────────────────────────────────────────────────────

const BUFFERS = {
  about: () => [
    `<span class="c-comment">-- ${ME.name} / about.lua</span>`,
    `<span class="c-comment">-- last modified: 2026-04-05</span>`,
    ``,
    `<span class="c-keyword">local</span> <span class="c-var">M</span> <span class="c-punct">=</span> <span class="c-punct">{}</span>`,
    ``,
    `<span class="c-var">M</span><span class="c-punct">.</span><span class="c-field">identity</span> <span class="c-punct">=</span> <span class="c-punct">{</span>`,
    `  <span class="c-field">name</span>     <span class="c-punct">=</span> <span class="c-string">"${ME.name}"</span><span class="c-punct">,</span>`,
    `  <span class="c-field">title</span>    <span class="c-punct">=</span> <span class="c-string">"${ME.title}"</span><span class="c-punct">,</span>`,
    `  <span class="c-field">location</span> <span class="c-punct">=</span> <span class="c-string">"${ME.location}"</span><span class="c-punct">,</span>`,
    `<span class="c-punct">}</span>`,
    ``,
    `<span class="c-var">M</span><span class="c-punct">.</span><span class="c-field">about</span> <span class="c-punct">=</span> <span class="c-string2">[[`,
    ...ME.about.split("\n").map((l) => `  ${l}`),
    `]]</span>`,
    ``,
    `<span class="c-var">M</span><span class="c-punct">.</span><span class="c-field">stack</span> <span class="c-punct">=</span> <span class="c-punct">{</span>`,
    ...ME.stack.map(
      (s, i) =>
        `  <span class="c-string">"${s}"</span>${i < ME.stack.length - 1 ? '<span class="c-punct">,</span>' : ""}`,
    ),
    `<span class="c-punct">}</span>`,
    ``,
    `<span class="c-var">M</span><span class="c-punct">.</span><span class="c-field">learning</span> <span class="c-punct">=</span> <span class="c-punct">{</span>`,
    ...ME.learning.map(
      (s, i) =>
        `  <span class="c-string">"${s}"</span>${i < ME.learning.length - 1 ? '<span class="c-punct">,</span>' : ""}`,
    ),
    `<span class="c-punct">}</span>`,
    ``,
    `<span class="c-var">M</span><span class="c-punct">.</span><span class="c-field">workflow</span> <span class="c-punct">=</span> <span class="c-punct">{</span>`,
    ...ME.workflow.map(
      (s, i) =>
        `  <span class="c-string">"${s}"</span>${i < ME.workflow.length - 1 ? '<span class="c-punct">,</span>' : ""}`,
    ),
    `<span class="c-punct">}</span>`,
    ``,
    `<span class="c-keyword">return</span> <span class="c-var">M</span>`,
  ],

  projects: () => [
    `<span class="c-comment">-- ${ME.name} / projects.lua</span>`,
    ``,
    `<span class="c-keyword">local</span> <span class="c-var">projects</span> <span class="c-punct">=</span> <span class="c-punct">{}</span>`,
    ``,
    ...PROJECTS.flatMap((p, i) => [
      `<span class="c-comment">-- [${i}] ${p.desc}</span>`,
      `<span class="c-var">projects</span><span class="c-punct">[${i + 1}]</span> <span class="c-punct">=</span> <span class="c-punct">{</span>`,
      `  <span class="c-field">name</span> <span class="c-punct">=</span> <span class="c-string">"${p.name}"</span><span class="c-punct">,</span>`,
      `  <span class="c-field">type</span> <span class="c-punct">=</span> <span class="c-string">"${p.type}"</span><span class="c-punct">,</span>`,
      `  <span class="c-field">url</span>  <span class="c-punct">=</span> <span class="c-link" onclick="window.open('${p.url}','_blank')">"${p.url}"</span><span class="c-punct">,</span>`,
      `<span class="c-punct">}</span>`,
      ``,
    ]),
    `<span class="c-keyword">return</span> <span class="c-var">projects</span>`,
  ],

  contact: () => [
    `<span class="c-comment">-- ${ME.name} / contact.lua</span>`,
    ``,
    `<span class="c-keyword">local</span> <span class="c-var">contact</span> <span class="c-punct">=</span> <span class="c-punct">{</span>`,
    `  <span class="c-field">email</span>    <span class="c-punct">=</span> <span class="c-link" onclick="window.location='mailto:${ME.email}'">"${ME.email}"</span><span class="c-punct">,</span>`,
    `  <span class="c-field">github</span>   <span class="c-punct">=</span> <span class="c-link" onclick="window.open('${ME.github}','_blank')">"${ME.github}"</span><span class="c-punct">,</span>`,
    `  <span class="c-field">site</span>     <span class="c-punct">=</span> <span class="c-link" onclick="window.open('${ME.site}','_blank')">"${ME.site}"</span><span class="c-punct">,</span>`,
    `  <span class="c-field">location</span> <span class="c-punct">=</span> <span class="c-string">"${ME.location}"</span><span class="c-punct">,</span>`,
    `<span class="c-punct">}</span>`,
    ``,
    `<span class="c-comment">-- open a message:</span>`,
    `<span class="c-fn">vim.ui</span><span class="c-punct">.</span><span class="c-fn">open</span><span class="c-punct">(</span><span class="c-link" onclick="window.location='mailto:${ME.email}'">"mailto:${ME.email}"</span><span class="c-punct">)</span>`,
    ``,
    `<span class="c-keyword">return</span> <span class="c-var">contact</span>`,
  ],
};

// ── STATE ─────────────────────────────────────────────────────────────────────

let currentBuf = "about";
let currentLine = 0;
let leaderActive = false;
let leaderTimer = null;
const FILES = {
  about: "about.lua",
  projects: "projects.lua",
  contact: "contact.lua",
};

// ── RENDER ────────────────────────────────────────────────────────────────────

function renderBuffer(name) {
  currentBuf = name;
  currentLine = 0;

  const lines = BUFFERS[name]();
  const gutter = document.getElementById("gutter");
  const buffer = document.getElementById("buffer");
  gutter.innerHTML = "";
  buffer.innerHTML = "";

  lines.forEach((html, i) => {
    const numEl = document.createElement("div");
    numEl.className = "line-num" + (i === 0 ? " current" : "");
    numEl.textContent = i === 0 ? 1 : i;
    gutter.appendChild(numEl);

    const lineEl = document.createElement("div");
    lineEl.className = "code-line" + (i === 0 ? " cursor-line" : "");
    lineEl.innerHTML = html || " ";
    lineEl.addEventListener("click", () => setLine(i));
    buffer.appendChild(lineEl);
  });

  updateSL();
  updateTabs(name);
}

function setLine(n) {
  const lines = document.querySelectorAll(".code-line");
  const nums = document.querySelectorAll(".line-num");
  lines.forEach((l, i) => l.classList.toggle("cursor-line", i === n));
  nums.forEach((el, i) => {
    el.classList.remove("current", "relative");
    if (i === n) {
      el.classList.add("current");
      el.textContent = i + 1;
    } else {
      el.classList.add("relative");
      el.textContent = Math.abs(i - n);
    }
  });
  currentLine = n;
  updateSL();
}

function updateSL() {
  document.getElementById("sl-file").textContent = FILES[currentBuf];
  const total = BUFFERS[currentBuf]().length;
  const pct = Math.round(((currentLine + 1) / total) * 100);
  document.getElementById("sl-pos").textContent =
    `${currentLine + 1}:1  ${pct}%`;
}

function updateTabs(active) {
  document.querySelectorAll("#tabline .tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.buf === active);
  });
}

// ── CMDLINE ───────────────────────────────────────────────────────────────────

let cmdTimer = null;

function showCmd(html, duration) {
  const el = document.getElementById("cmdline-text");
  const cur = document.getElementById("cmdline-cursor");
  el.innerHTML = html;
  cur.style.display = duration ? "none" : "inline-block";
  if (cmdTimer) clearTimeout(cmdTimer);
  if (duration > 0) cmdTimer = setTimeout(clearCmd, duration);
}

function clearCmd() {
  document.getElementById("cmdline-text").innerHTML = "";
  document.getElementById("cmdline-cursor").style.display = "none";
}

// ── PICKER ────────────────────────────────────────────────────────────────────

const PICKER_FILES = [
  { name: "about.lua", type: "lua", buf: "about" },
  { name: "projects.lua", type: "lua", buf: "projects" },
  { name: "contact.lua", type: "lua", buf: "contact" },
];
let pickerIdx = 0;

function openPicker() {
  document.getElementById("picker").classList.add("open");
  const inp = document.getElementById("picker-input");
  inp.value = "";
  inp.focus();
  pickerIdx = 0;
  renderPicker("");
}

function closePicker() {
  document.getElementById("picker").classList.remove("open");
}

function renderPicker(q) {
  const filtered = PICKER_FILES.filter((f) => f.name.includes(q.toLowerCase()));
  const res = document.getElementById("picker-results");
  res.innerHTML = filtered
    .map(
      (f, i) =>
        `<div class="picker-item ${i === pickerIdx ? "selected" : ""}" data-buf="${f.buf}">
       <span class="pi-name">${f.name}</span>
       <span class="pi-type">${f.type}</span>
     </div>`,
    )
    .join("");
  res.querySelectorAll(".picker-item").forEach((el) => {
    el.addEventListener("click", () => {
      closePicker();
      renderBuffer(el.dataset.buf);
    });
  });
}

document.getElementById("picker-input").addEventListener("input", (e) => {
  pickerIdx = 0;
  renderPicker(e.target.value);
});
document.getElementById("picker-input").addEventListener("keydown", (e) => {
  const items = document.querySelectorAll(".picker-item");
  if (e.key === "ArrowDown") {
    pickerIdx = Math.min(pickerIdx + 1, items.length - 1);
    renderPicker(document.getElementById("picker-input").value);
  }
  if (e.key === "ArrowUp") {
    pickerIdx = Math.max(pickerIdx - 1, 0);
    renderPicker(document.getElementById("picker-input").value);
  }
  if (e.key === "Enter") {
    const s = items[pickerIdx];
    if (s) {
      closePicker();
      renderBuffer(s.dataset.buf);
    }
  }
  if (e.key === "Escape") closePicker();
});
document.getElementById("picker").addEventListener("click", (e) => {
  if (e.target === document.getElementById("picker")) closePicker();
});

// ── KEYBINDS ──────────────────────────────────────────────────────────────────

function setMode(mode) {
  const el = document.getElementById("sl-mode");
  el.textContent = mode;
  el.className = "sl-segment sl-mode " + mode.toLowerCase();
  document.getElementById("statusline").style.background =
    mode === "INSERT"
      ? "var(--green)"
      : mode === "VISUAL"
        ? "var(--purple)"
        : "var(--blue)";
}

function showWhichKey() {
  document.getElementById("whichkey").classList.add("open");
  showCmd(`<span style="color:var(--yellow-b)"> </span>`, 0);
}
function hideWhichKey() {
  document.getElementById("whichkey").classList.remove("open");
  clearCmd();
}

document.addEventListener("keydown", (e) => {
  if (document.activeElement === document.getElementById("picker-input"))
    return;

  if (leaderActive) {
    leaderActive = false;
    clearTimeout(leaderTimer);
    hideWhichKey();
    if (e.key === "f") {
      openPicker();
      return;
    }
    if (e.key === "1") {
      renderBuffer("about");
      showCmd(`:e about.lua`, 1500);
      return;
    }
    if (e.key === "2") {
      renderBuffer("projects");
      showCmd(`:e projects.lua`, 1500);
      return;
    }
    if (e.key === "3") {
      renderBuffer("contact");
      showCmd(`:e contact.lua`, 1500);
      return;
    }
    if (e.key === "?") {
      showCmd(
        `<span style="color:var(--green-b)">  </span>  <span style="color:var(--fg4)">leader: </span><span style="color:var(--yellow-b)">f</span><span style="color:var(--fg4)">=find  </span><span style="color:var(--yellow-b)">1/2/3</span><span style="color:var(--fg4)">=buffers</span>`,
        3000,
      );
      return;
    }
    return;
  }

  if (e.key === "j" || e.key === "ArrowDown") {
    e.preventDefault();
    const max = BUFFERS[currentBuf]().length - 1;
    setLine(Math.min(currentLine + 1, max));
    document
      .querySelectorAll(".code-line")
      [currentLine]?.scrollIntoView({ block: "nearest" });
    return;
  }
  if (e.key === "k" || e.key === "ArrowUp") {
    e.preventDefault();
    setLine(Math.max(currentLine - 1, 0));
    document
      .querySelectorAll(".code-line")
      [currentLine]?.scrollIntoView({ block: "nearest" });
    return;
  }
  if (e.key === "G") {
    const l = BUFFERS[currentBuf]().length - 1;
    setLine(l);
    document
      .querySelectorAll(".code-line")
      [l]?.scrollIntoView({ block: "nearest" });
    return;
  }
  if (e.key === "g") {
    setLine(0);
    document.getElementById("buffer").scrollTop = 0;
    return;
  }

  if (e.key === "Tab") {
    e.preventDefault();
    const order = ["about", "projects", "contact"];
    renderBuffer(order[(order.indexOf(currentBuf) + 1) % order.length]);
    showCmd(`:bnext`, 1000);
    return;
  }

  if (e.key === " ") {
    e.preventDefault();
    leaderActive = true;
    showWhichKey();
    leaderTimer = setTimeout(() => {
      leaderActive = false;
      hideWhichKey();
    }, 2000);
    return;
  }

  if (e.key === "Escape") {
    setMode("NORMAL");
    clearCmd();
    closePicker();
    return;
  }
  if (e.key === "i") {
    setMode("INSERT");
    showCmd("-- INSERT --", 0);
    return;
  }
  if (e.key === "v") {
    setMode("VISUAL");
    showCmd("-- VISUAL --", 0);
    return;
  }
  if (e.key === ":") {
    e.preventDefault();
    showCmd(`<span style="color:var(--yellow-b)">:</span>`, 0);
    return;
  }
});

// ── TABS ──────────────────────────────────────────────────────────────────────

document.querySelectorAll("#tabline .tab").forEach((tab) => {
  tab.addEventListener("click", () => renderBuffer(tab.dataset.buf));
});

// ── INIT ──────────────────────────────────────────────────────────────────────

renderBuffer("about");

setTimeout(() => {
  showCmd(
    `<span style="color:var(--green-b)">NVIM v0.12.0</span>  ` +
      `<span style="color:var(--fg4)">space=leader  tab=next buffer  j/k=navigate</span>`,
    5000,
  );
}, 400);
