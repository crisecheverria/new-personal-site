// Titan's page: the demo player, the agent tabs, the actions explorer, the
// pane-limits demo, the config builder and the key list. No dependencies.
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  // ---- Segmented tabs: data-tabs="group", panels data-panel="group:name".
  const tabHandlers = {};
  $$("[data-tabs]").forEach((bar) => {
    const group = bar.dataset.tabs;
    const select = (button) => {
      $$("[role=tab]", bar).forEach((b) => b.setAttribute("aria-selected", String(b === button)));
      $$(`[data-panel^="${group}:"]`).forEach((p) => { p.hidden = p.dataset.panel !== `${group}:${button.dataset.tab}`; });
      (tabHandlers[group] || (() => {}))(button.dataset.tab);
    };
    $$("[role=tab]", bar).forEach((b) => b.addEventListener("click", () => select(b)));
    bar.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const tabs = $$("[role=tab]", bar);
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      select(next);
    });
  });
  const selected = (group) => $(`[data-tabs="${group}"] [aria-selected="true"]`)?.dataset.tab;

  // ---- Demo player: one video, a tab per recording, playing through in turn.
  const player = $("[data-player]");
  if (player) {
    const video = $("video", player);
    const caption = $(".player-caption", player);
    const toggle = $(".player-toggle", player);
    const tabs = $$("[role=tab]", player);
    let current = -1;
    let started = false;

    const show = (i, play) => {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach((t, j) => {
        t.setAttribute("aria-selected", String(j === current));
        $("i", t).style.width = "0";
      });
      const name = tabs[current].dataset.video;
      video.poster = `${name}-poster.webp?v=2`;
      video.src = `${name}.mp4?v=2`;
      caption.textContent = tabs[current].dataset.caption;
      if (play) video.play().catch(() => {});
    };
    tabs.forEach((t, i) => t.addEventListener("click", () => { started = true; show(i, true); }));
    player.addEventListener("keydown", (e) => {
      if (!tabs.includes(document.activeElement)) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); show(current + 1, true); tabs[current].focus(); }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); show(current - 1, true); tabs[current].focus(); }
    });
    video.addEventListener("timeupdate", () => {
      if (video.duration) $("i", tabs[current]).style.width = `${(video.currentTime / video.duration) * 100}%`;
    });
    // One plays through, then the next; with reduced motion, nothing moves on its own.
    video.addEventListener("ended", () => { if (!reduced) show(current + 1, true); });
    video.addEventListener("play", () => { toggle.textContent = "❚❚"; toggle.setAttribute("aria-label", "Pause"); });
    video.addEventListener("pause", () => { toggle.textContent = "▶"; toggle.setAttribute("aria-label", "Play"); });
    const flip = () => (video.paused ? video.play().catch(() => {}) : video.pause());
    toggle.addEventListener("click", flip);
    video.addEventListener("click", flip);

    show(0, false);
    // Plays once it's on screen, pauses when scrolled away.
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && (!reduced || started)) video.play().catch(() => {});
      else if (!entry.isIntersecting) video.pause();
    }, { threshold: 0.35 }).observe(video);
  }

  // ---- Actions explorer.
  const P = "pomodoro ❯";
  const id = "9F99C1B4-01A3-4A11-852E-D11F3F19AF8E";
  const ACTIONS = [
    { g: "Panes", name: "new_split", args: 'direction=right command="npm run dev"', key: "⌘D", keyArg: "right",
      out: `{"action":"new_split:right","ok":true,"pane":"${id}"}`,
      about: "A shell beside this pane, running the command. It answers with the new pane's id, which pane= takes later; an agent may use the panes it opens." },
    { g: "Panes", name: "read_pane", args: `pane=${id.slice(0, 8)}… lines=4`, agentOnly: false,
      out: '{"ok":true,"command":"npm run dev","running":true,\n "text":"pomodoro dev server\\n\\n  ➜  Local:   http://localhost:4173/\\n  ➜  ready in 181 ms"}',
      about: "A shell's last lines as plain text, and whether its command is still running or exited, with its code. How an agent checks a server started before it says so." },
    { g: "Panes", name: "send_text", args: `pane=${id.slice(0, 8)}… text='npm test\\n'`, keyArg: "\\x0c", key: "none",
      out: `{"action":"send_text:npm test\\\\n","ok":true,"pane":"${id}"}`,
      about: "Types into a shell, \\n, \\e and \\xHH included, without moving the focus. Into a shell that isn't the agent's, Titan asks you first." },
    { g: "Panes", name: "panes", shellCmd: "titan panes", tool: "titan_panes",
      out: "ID        KIND     WHERE   NAME          FOLDER           USE     RUNNING\n1CB1ABB5  shell    tab 1   π - pomodoro  ~/code/pomodoro  own     pi\n9F99C1B4  shell    tab 1*  zsh           ~/code/pomodoro  opened  npm run dev\nA06A9837  browser  tab 1   Pomodoro      -                opened  http://localhost:4173/",
      about: "Every pane, window by window and tab by tab: its id, kind, folder and what runs in it, and which ones the caller may use, and why." },
    { g: "Panes", name: "toggle_split_zoom", key: "⇧⌘↩", out: '{"action":"toggle_split_zoom","ok":true}', about: "Expands the pane to the whole tab, or puts it back." },
    { g: "Panes", name: "goto_split", args: "direction=next", key: "⌘]", keyArg: "next", out: '{"action":"goto_split:next","ok":true}', about: "Moves the focus to the next pane, or the previous one (⌘[)." },
    { g: "Panes", name: "close_pane", args: `pane=${id.slice(0, 8)}…`, key: "⌘W", out: `{"action":"close_pane","ok":true,"pane":"${id}"}`, about: "Closes a pane. An agent needs pane= and may close only its own panes; close_tab and close_window it may not run at all." },
    { g: "Browser", name: "navigate", browser: true, args: "url=localhost:4173", tool: "browser_navigate",
      out: 'Page: Pomodoro\nURL: http://localhost:4173/\n\nFOCUS\n25:00\n[e1] button "Start" [e2] button "Reset" [e3] button "Break"\n0 sessions today',
      about: "Opens the browser pane beside the caller's pane (on first use), loads the page and waits for it, then prints it as text: headings, text, and every link, button and field with a ref." },
    { g: "Browser", name: "click", browser: true, args: "ref=e3", tool: "browser_click",
      out: 'Clicked e3 "Break".\nPage: Pomodoro\n\nFOCUS\n05:00\n[e1] button "Start" [e2] button "Reset" [e3] button "Break"',
      about: "Clicks an element by its ref from the latest snapshot, waits for what it causes, and prints the page again." },
    { g: "Browser", name: "type", browser: true, args: "ref=e7 text=hello submit=true", tool: "browser_type",
      out: 'Typed into e7 textbox "Search" and pressed Enter.\nPage: Search · results for "hello"', about: "Types into a field, replacing what's there, or picks an option of a select; submit=true presses Enter after." },
    { g: "Browser", name: "evaluate", browser: true, args: "script=- <<< 'return document.title'", tool: "browser_evaluate",
      out: '"Pomodoro"', about: "Runs JavaScript in the page as the body of an async function and prints what it returns, for state the snapshot doesn't show." },
    { g: "Browser", name: "screenshot", browser: true, args: "out=/tmp/page.png", tool: "browser_screenshot",
      out: "/tmp/page.png", about: "A PNG of what the pane shows. From the shell it's written to a file, and the path printed." },
    { g: "Browser", name: "console", browser: true, args: "", tool: "browser_console",
      out: "[error] GET http://localhost:4173/favicon.ico 404\n[log] timer started", about: "What the page logged since the last call: console messages, errors and failed requests." },
    { g: "Claude", name: "new_claude_session", key: "⌘N", out: '{"action":"new_claude_session","ok":true,"pane":"D2228042-4863-411F-928F-12ACA3A498DE"}', about: "A Claude Code session in a new tab, in the folder of the pane it was run from." },
    { g: "Claude", name: "new_claude_session_worktree", key: "⇧⌘N", out: '{"action":"new_claude_session_worktree","ok":true}', about: "A Claude session in a git worktree of its own, on a branch it asks you for." },
    { g: "Claude", name: "goto_waiting_session", key: "⌘J", out: '{"action":"goto_waiting_session","ok":true}', about: "Jumps to the session that's waiting on you: a question, a permission, or a finished turn." },
    { g: "Tabs", name: "new_tab", key: "⌘T", out: '{"action":"new_tab","ok":true}', about: "A new tab with a shell." },
    { g: "Tabs", name: "goto_tab", args: "number=2", key: "⌘2", keyArg: "2", out: '{"action":"goto_tab:2","ok":true}', about: "Goes to a tab by number, 1 to 8; ⌘9 is the last tab." },
    { g: "Tabs", name: "toggle_tab_overview", key: "⌘E", out: '{"action":"toggle_tab_overview","ok":true}', about: "Every tab as tiles: each shell's screen, each Claude session's latest messages." },
    { g: "Tabs", name: "toggle_command_palette", key: "⌘P", out: '{"action":"toggle_command_palette","ok":true}', about: "The palette: every command, past Claude sessions to resume, lazygit, and your recipes." },
    { g: "Setup", name: "recipe", args: 'name="Dev server"', out: '{"action":"recipe","ok":true}', about: "Runs a recipe from the config: asks its questions (or takes them as name=value), then opens its shells and browser beside the pane." },
    { g: "Setup", name: "new_browser", key: "⇧⌘B", out: '{"action":"new_browser","ok":true}', about: "A browser pane beside the focused one." },
    { g: "Setup", name: "show_running", key: "none", out: '{"action":"show_running","ok":true}', about: "What the panes left running in the background, a server an agent backgrounded included, with ports and a stop button." },
    { g: "Text", name: "increase_font_size", args: "points=2", key: "⌘=", keyArg: "2", out: '{"action":"increase_font_size:2","ok":true}', about: "Bigger text until Titan quits; ⌘− smaller, ⌘0 back." },
    { g: "Text", name: "start_search", key: "⌘F", out: '{"action":"start_search","ok":true}', about: "Find in a shell's scrollback or a Claude feed; ⌘G and ⇧⌘G go to the next and previous match." },
  ];

  const explorer = $("[data-actions]");
  if (explorer) {
    const list = $("[data-list]", explorer);
    const term = $("[data-term]", explorer);
    const where = $("[data-where]", explorer);
    const about = $("[data-about]", explorer);
    let chosen = ACTIONS[0];
    let typing = null;

    const forms = (a) => {
      const via = selected("via");
      if (via === "key") {
        if (a.browser || a.name === "panes" || a.name === "read_pane") {
          return { where: "~/.config/titan/config", cmd: "", out: `# ${a.browser ? "titan browser tools" : a.name} have no key: they're for scripts and agents.` };
        }
        const arg = a.keyArg ? `:${a.keyArg}` : "";
        const key = a.key && a.key !== "none" ? `default ${a.key}` : "no default key";
        const combo = a.name === "send_text" ? "cmd+k" : "ctrl+a>" + (a.name[0] || "x");
        return { where: "~/.config/titan/config", cmd: "", out: `<span class="m"># ${key}; yours instead:</span>\n<span class="e">keybind</span> = ${combo}=${a.name}${arg}` };
      }
      if (via === "agent") {
        const tool = a.tool || "titan_do";
        const given = {};
        (a.args || "").replace(/(\w+)=("[^"]*"|'[^']*'|\S+)/g, (_, k, v) => { given[k] = v.replace(/^["']|["']$/g, ""); });
        if (a.name === "evaluate") given.script = "return document.title";
        if (a.name === "screenshot") delete given.out;
        let call = given;
        if (!a.tool) {
          // titan_do: the action, the pane apart, the rest as its arguments.
          const { pane, ...rest } = given;
          call = { action: a.name, ...(pane ? { pane } : {}), ...(Object.keys(rest).length ? { arguments: rest } : {}) };
        }
        return { where: `Claude · mcp__titan__${tool}   (pi and Codex run the shell form)`, cmd: `${tool} ${JSON.stringify(call)}`, out: a.out, agent: true };
      }
      const cmd = a.shellCmd || (a.browser ? `titan browser ${a.name}${a.args ? " " + a.args : ""}` : `titan do ${a.name}${a.args ? " " + a.args : ""}`);
      return { where: "zsh · ~/code/pomodoro", cmd, out: a.out };
    };

    const render = () => {
      clearInterval(typing);
      const f = forms(chosen);
      where.textContent = f.where;
      about.textContent = chosen.about;
      const prompt = f.agent ? '<span class="p">⏺</span> ' : `<span class="p">${P}</span> `;
      if (!f.cmd) { term.innerHTML = f.out; return; }
      const done = () => { term.innerHTML = `${prompt}${esc(f.cmd)}\n<span class="o">${esc(f.out)}</span>\n${f.agent ? "" : `<span class="p">${P}</span> <span class="caret"></span>`}`; };
      if (reduced) return done();
      let n = 0;
      typing = setInterval(() => {
        n += 2;
        term.innerHTML = `${prompt}${esc(f.cmd.slice(0, n))}<span class="caret"></span>`;
        if (n >= f.cmd.length) { clearInterval(typing); setTimeout(done, 220); }
      }, 18);
    };
    tabHandlers.via = render;

    const draw = (filter = "") => {
      list.innerHTML = "";
      let group = "";
      const q = filter.trim().toLowerCase();
      ACTIONS.filter((a) => !q || `${a.g} ${a.name} ${a.about} ${a.key || ""}`.toLowerCase().includes(q)).forEach((a) => {
        if (a.g !== group) {
          group = a.g;
          list.insertAdjacentHTML("beforeend", `<li class="group">${a.g === "Browser" ? "Browser · titan browser" : a.g}</li>`);
        }
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.innerHTML = `<span>${a.name}</span>${a.key && a.key !== "none" ? `<kbd>${a.key}</kbd>` : ""}`;
        if (a === chosen) b.setAttribute("aria-current", "true");
        b.addEventListener("click", () => { chosen = a; $$("button", list).forEach((x) => x.removeAttribute("aria-current")); b.setAttribute("aria-current", "true"); render(); });
        li.append(b);
        list.append(li);
      });
      if (!list.children.length) list.innerHTML = '<li class="group">no action matches</li>';
    };
    $("[data-filter]", explorer).addEventListener("input", (e) => draw(e.target.value));
    draw();
    // Typed once it's on screen, not while the page loads.
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { render(); o.disconnect(); } }, { threshold: 0.3 }).observe(explorer);
  }

  // ---- Pane limits: what pi gets for each pane, by remote-control.
  const safety = $("[data-safety]");
  if (safety) {
    const result = $("[data-result]", safety);
    const RULES = {
      false: () => ["no", "refused", "remote-control is off: Titan doesn't listen, so titan do does nothing for anyone, you included. (titan browser still works.)"],
      true: (pane) => ({
        opened: ["ok", "allowed", "pi opened this pane with new_split, so it may type into it and read it."],
        granted: ["ok", "allowed", "You chose “Let Agents Use This Pane” on it, so any agent may use it until Titan quits."],
        yours: ["ask", "Titan asks you", "Not pi's: the request waits while Titan asks you in that window. Allow Once, Grant This Pane, or Deny; no answer in 60 seconds is a no."],
      })[pane],
      all: () => ["ok", "allowed", "remote-control = all lets every agent use every pane, the way it was before the limits. Use it only if you trust everything you run."],
    };
    const panes = $$("[data-pane]", safety);
    let last = null;
    const run = (button) => {
      last = button;
      const [cls, label, text] = RULES[selected("mode")](button.dataset.pane);
      panes.forEach((p) => { p.classList.remove("ok", "ask", "no"); $("em", p).textContent = ""; });
      button.classList.add(cls);
      $("em", button).textContent = label;
      const ids = { opened: "9F99C1B4", granted: "3B2E7A10", yours: "A1B0DA70" };
      result.innerHTML = `<code>titan do send_text pane=${ids[button.dataset.pane]}… text='ls\\n'</code> → ${text}`;
    };
    panes.forEach((p) => p.addEventListener("click", () => run(p)));
    tabHandlers.mode = () => { if (last) run(last); };
  }

  // ---- Config builder.
  const builder = $("[data-builder]");
  if (builder) {
    const form = $("form", builder);
    const out = $("[data-config]", builder);
    const NOTES = {
      theme: "a Ghostty theme by name, reaching the whole window and the Claude pane",
      "font-family": "repeat the line for fallbacks",
      "font-size": "in points; ⌘= and ⌘− change it until Titan quits",
      "cursor-style": "until a program asks for another",
      "tab-position": "a row across the top, or a column down the left",
      "reading-width": "characters a line of a Claude reply holds at most",
      "agent-background": "what a new Claude session is drawn over",
      "file-links": "a path clicked in a shell or a reply opens here",
      editor: "for file-links = editor, and ⌘,",
      "remote-control": "titan do from shells and agents; true keeps agents to their own panes",
      "keep-awake": "no idle sleep while a Claude session works",
      "links-in-titan": "web links open in a browser pane beside",
      "notify-after": "a command this many seconds long notifies when it ends",
    };
    const PRESETS = {
      minimal: { theme: "", "font-size": 14, "tab-position": "top", "remote-control": "false", "x-recipe": false, "x-keys": false, "x-accounts": false, "keep-awake": true },
      agents: { theme: "Gruvbox Dark Hard", "font-size": 14, "tab-position": "left", "remote-control": "true", "reading-width": 95, "x-recipe": true, "x-keys": false, "x-accounts": true, "keep-awake": true, "file-links": "viewer" },
      keys: { theme: "TokyoNight", "font-size": 15, "tab-position": "top", "remote-control": "true", "x-keys": true, "x-recipe": false, "file-links": "editor", editor: "nvim", "cursor-style": "block" },
    };
    const value = (name) => {
      const el = form.elements[name];
      return el.type === "checkbox" ? el.checked : el.value;
    };
    let previous = "";
    const build = () => {
      $('[data-out="reading-width"]', builder).textContent = value("reading-width");
      const comments = value("x-comments");
      const lines = ['<span class="c"># ~/.config/titan/config — Ghostty\'s syntax, read after your Ghostty config</span>', ""];
      let pending = null;
      const add = (key, v, isDefault) => {
        if (v === "" || isDefault) return;
        // A section's heading only once something goes under it.
        if (pending) { if (lines[lines.length - 1] !== "") lines.push(""); if (comments) lines.push(pending); pending = null; }
        const note = comments && NOTES[key] ? `  <span class="c"># ${NOTES[key]}</span>` : "";
        lines.push(`<span class="k">${key}</span> = ${esc(String(v))}${note}`);
      };
      const section = (title) => { pending = `<span class="c"># --- ${title}</span>`; };
      const block = (title) => { pending = null; if (lines[lines.length - 1] !== "") lines.push(""); if (comments) lines.push(`<span class="c"># --- ${title}</span>`); };
      section("look");
      add("theme", value("theme"));
      add("font-family", value("font-family"));
      add("font-size", value("font-size"));
      add("cursor-style", value("cursor-style"), value("cursor-style") === "block");
      add("tab-position", value("tab-position"), value("tab-position") === "top");
      section("claude pane");
      add("reading-width", value("reading-width"), value("reading-width") === "95");
      add("agent-background", value("agent-background"), value("agent-background") === "generated");
      add("file-links", value("file-links"), value("file-links") === "viewer");
      add("editor", value("editor"));
      section("agents");
      add("remote-control", value("remote-control"));
      add("keep-awake", value("keep-awake"), value("keep-awake"));
      add("links-in-titan", value("links-in-titan"), value("links-in-titan"));
      add("notify-after", value("notify-after"), value("notify-after") === "10");
      if (value("x-recipe")) {
        block("recipes: ⌘P → Run Dev server");
        lines.push('<span class="k">recipe</span> = Dev server');
        lines.push('<span class="k">recipe-ask</span> = port, printf <span class="s">\'4173\\n3000\\n\'</span>' + (comments ? '  <span class="c"># offers these, or takes what you type</span>' : ""));
        lines.push('<span class="k">recipe-shell</span> = server, <span class="s">~/code/pomodoro</span>, npm run dev -- --port {port}');
        lines.push('<span class="k">recipe-browser</span> = http://localhost:{port}' + (comments ? '  <span class="c"># loads once the server answers</span>' : ""));
      }
      if (value("x-keys")) {
        block("keys, in Ghostty's syntax");
        lines.push('<span class="k">keybind</span> = cmd+d=new_split:down');
        lines.push('<span class="k">keybind</span> = cmd+k=send_text:\\x0c' + (comments ? '  <span class="c"># ⌃L: clear the shell</span>' : ""));
        lines.push('<span class="k">keybind</span> = ctrl+a>c=new_tab' + (comments ? '  <span class="c"># ⌃A, then C</span>' : ""));
        lines.push('<span class="k">keybind</span> = cmd+shift+t=unbind' + (comments ? '  <span class="c"># give the key back to the shell</span>' : ""));
      }
      if (value("x-accounts")) {
        block("folders to Claude accounts: the longest match wins");
        lines.push('<span class="k">claude-account</span> = Personal, <span class="s">~/.claude</span>');
        lines.push('<span class="k">claude-account</span> = Work, <span class="s">~/.claude-work</span>, <span class="s">~/work</span>');
      }
      const html = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
      // The lines that changed glow for a moment.
      const before = new Set(previous.split("\n"));
      out.innerHTML = html.split("\n").map((l) => (previous && l && !before.has(l) && !reduced ? `<span class="flash">${l}</span>` : l)).join("\n");
      previous = html;
    };
    form.addEventListener("input", build);
    form.addEventListener("change", build);
    $$("[data-preset]", builder).forEach((b) => b.addEventListener("click", () => {
      Object.entries(PRESETS[b.dataset.preset]).forEach(([k, v]) => {
        const el = form.elements[k];
        if (!el) return;
        if (el.type === "checkbox") el.checked = v; else el.value = v;
      });
      build();
    }));
    $("[data-copy]", builder).addEventListener("click", (e) => {
      navigator.clipboard?.writeText(out.textContent).then(() => {
        e.target.textContent = "copied";
        setTimeout(() => { e.target.textContent = "copy"; }, 1400);
      });
    });
    build();
  }

  // ---- Keys.
  const KEYS = [
    ["New Claude session", "⌘N"], ["New Claude session on a branch (worktree)", "⇧⌘N"], ["New tab", "⌘T"], ["New browser pane", "⇧⌘B"],
    ["Open location", "⌘L"], ["Split right", "⌘D"], ["Split down", "⇧⌘D"], ["Expand or collapse pane", "⇧⌘↩"],
    ["Next pane / previous pane", "⌘] ⌘["], ["Close pane", "⌘W"], ["Close tab", "⌥⌘W"], ["Close window", "⇧⌘W"],
    ["Next tab / previous tab", "⇧⌘] ⇧⌘["], ["Tab 1–8 / last tab", "⌘1–⌘8 ⌘9"], ["Command palette", "⌘P"],
    ["Show all tabs", "⌘E"], ["Go to waiting session", "⌘J"], ["Bigger / smaller / default text", "⌘= ⌘− ⌘0"],
    ["Find / next / previous", "⌘F ⌘G ⇧⌘G"], ["Open config", "⌘,"], ["Send now (Claude pane)", "↩"], ["Queue for after the turn", "⌥↩"],
  ];
  const keys = $("[data-keys]");
  if (keys) {
    const draw = (q = "") => {
      const s = q.trim().toLowerCase();
      const rows = KEYS.filter(([what, key]) => !s || what.toLowerCase().includes(s) || key.toLowerCase().includes(s));
      keys.innerHTML = rows.map(([what, key]) => `<div><span>${what}</span><span>${key.split(" ").map((k) => `<kbd>${k}</kbd>`).join(" ")}</span></div>`).join("")
        || '<div class="none">No key matches. Any action can get one with keybind.</div>';
    };
    $("[data-keys-filter]").addEventListener("input", (e) => draw(e.target.value));
    draw();
  }

  // ---- Pictures open larger.
  const box = $("[data-lightbox]");
  $$(".zoomable img").forEach((img) => img.addEventListener("click", () => {
    $("img", box).src = img.currentSrc || img.src;
    $("img", box).alt = img.alt;
    box.hidden = false;
  }));
  box.addEventListener("click", () => { box.hidden = true; });
  addEventListener("keydown", (e) => { if (e.key === "Escape") box.hidden = true; });

})();
