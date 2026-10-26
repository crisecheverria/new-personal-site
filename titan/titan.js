// Titan's pages: the demos, the liquid, the docs' contents, the agent tabs,
// the actions explorer, the pane-limits demo, the config builder and the keys.
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

  // ---- Demos: each recording plays while it's on screen, and stops when it isn't.
  // With reduced motion they wait for a click, with controls to start them.
  $$("video[data-autoplay]").forEach((video) => {
    if (reduced) { video.controls = true; video.preload = "metadata"; return; }
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.35 }).observe(video);
  });

  // ---- Docs contents: the section being read is marked.
  const toc = $("[data-toc]");
  if (toc) {
    const links = $$("a", toc);
    const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    const mark = () => {
      let current = sections[0];
      sections.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.3) current = s; });
      links.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === `#${current.id}`)));
    };
    addEventListener("scroll", mark, { passive: true });
    mark();
  }

  // ---- Liquid: the app's welcome backdrop (LiquidInfinity.swift), ported from
  // Metal to WebGL. Two lobes and the neck between them, Titan's infinity seen
  // from the side, rising from the bottom of the canvas; lit at the rim from the
  // theme's blue to its magenta, under a faint scatter of specks.
  const LIQUID_FRAG = `
precision highp float;
uniform vec4 frame;   // width, height in pixels, seconds, 1 for a light theme
uniform vec4 turn;    // -1...1 each way: where it is turned toward
uniform vec3 bg, fg, blue, magenta;

vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float map(vec3 p, float t) {
  vec3 a = vec3(-0.55 + 0.07 * sin(t * 0.31), -0.92 + 0.06 * sin(t * 0.43), 0.0);
  vec3 b = vec3(0.55 + 0.07 * sin(t * 0.27 + 1.0), -0.98 + 0.06 * sin(t * 0.37 + 2.0), 0.1 * sin(t * 0.2));
  vec3 c = vec3(0.6 * sin(t * 0.17), -0.42 + 0.1 * sin(t * 0.29), 0.3 * cos(t * 0.17));
  float d = smin(length(p - a) - 0.8, length(p - b) - 0.74, 0.55);
  d = smin(d, length(p - c) - 0.3, 0.45);
  return d + 0.025 * sin(3.1 * p.x + t * 0.6) * sin(2.7 * p.y - t * 0.5) * sin(3.3 * p.z + t * 0.4);
}

vec3 normalAt(vec3 p, float t) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.002;
  return normalize(k.xyy * map(p + k.xyy * e, t) + k.yyx * map(p + k.yyx * e, t)
                 + k.yxy * map(p + k.yxy * e, t) + k.xxx * map(p + k.xxx * e, t));
}

// One ray through uv: the liquid shaded, premultiplied, over behind; edge is
// set when it ran along the outline, where more rays are taken.
vec4 trace(vec2 uv, float unit, vec4 behind, out bool edge) {
  float t = frame.z;
  bool light = frame.w > 0.5;
  float tip = 0.12 + turn.y * 0.08;
  float sway = 0.14 * sin(t * 0.2) + turn.x * 0.18;
  vec3 ro = rotY(rotX(vec3(0.0, 0.0, 4.0), -tip), -sway);
  vec3 rd = rotY(rotX(normalize(vec3(uv, -4.0)), -tip), -sway);

  float pixel = 1.0 / (unit * 4.0);
  float dist = 2.6;
  bool hit = false;
  float closest = 1e3, closestDist = 0.0;
  for (int i = 0; i < 64; i++) {
    float d = map(ro + rd * dist, t);
    float pixels = d / (pixel * dist);
    if (pixels < closest) { closest = pixels; closestDist = dist; }
    if (d < 0.0008 * dist) { hit = true; break; }
    dist += d * 0.9;
    if (dist > 6.0) break;
  }
  float cover = hit ? 1.0 : 1.0 - smoothstep(0.0, 1.0, closest);
  edge = closest < 3.0;
  if (cover <= 0.0) return behind;
  if (!hit) dist = closestDist;

  vec3 p = ro + rd * dist;
  vec3 n = normalAt(p, t);
  float facing = max(dot(n, -rd), 0.0);
  float rim = pow(1.0 - facing, 2.4);
  vec3 r = reflect(rd, n);
  vec3 env = mix(blue, magenta, smoothstep(-0.8, 0.8, r.x * 0.8 + r.y * 0.4 + 0.3 * sin(t * 0.25)));
  float turned = 1.0 - facing;
  float box = smoothstep(0.35, 0.75, n.y - 0.35 * n.x) * smoothstep(0.3, 0.55, turned) * smoothstep(0.92, 0.7, turned);
  float kick = smoothstep(0.72, 0.86, r.x) * smoothstep(0.18, 0.04, abs(r.y + 0.1));
  vec3 inner = mix(blue, magenta, smoothstep(-1.0, -0.2, p.y + 0.3 * n.x));
  float depth = facing * facing;
  float sink = smoothstep(-1.0, -0.5, p.y);

  vec3 colour;
  if (light) {
    vec3 body = mix(bg, vec3(1.0), 0.45) * (0.9 + 0.1 * n.y);
    colour = mix(body, env, rim * 0.65) + inner * depth * 0.06 + box * 0.28 + kick * magenta * 0.1;
    colour = mix(mix(bg, fg, 0.05), colour, 0.6 + 0.4 * sink);
  } else {
    vec3 body = bg * 0.45 + inner * depth * 0.16;
    colour = body + (env * rim * 1.25 + box * mix(vec3(1.0), blue, 0.4) * 0.5 + kick * magenta * 0.35) * (0.4 + 0.6 * sink);
  }
  edge = !hit || facing < 0.35;
  return vec4(min(colour, 1.0), 1.0) * cover + behind * (1.0 - cover);
}

void main() {
  float t = frame.z;
  bool light = frame.w > 0.5;
  vec2 size = frame.xy;
  vec2 position = gl_FragCoord.xy;
  float unit = min(size.y * 0.5, size.x / 2.7) / 1.22;
  // gl_FragCoord counts up from the bottom already: the canvas's bottom at y = -1.
  vec2 uv = vec2(position.x - size.x * 0.5, position.y) / unit - vec2(0.0, 1.0);

  float near = map(vec3(uv, 0.0), t);
  float glow = exp(-max(near, 0.0) * 2.6) * (light ? 0.2 : 0.32);
  vec3 tint = mix(blue, magenta, 0.5 + 0.5 * sin(uv.x * 1.3 + t * 0.4));
  vec4 behind = vec4(tint * glow, glow);
  if (!light) {
    vec2 cell = floor(position / 22.0);
    float h = hash(cell);
    if (h > 0.94) {
      vec2 spot = (cell + 0.25 + 0.5 * vec2(hash(cell + 3.1), hash(cell + 7.7))) * 22.0;
      float twinkle = 0.55 + 0.45 * sin(t * (0.8 + h) + h * 40.0);
      float speck = smoothstep(1.3, 0.0, length(position - spot)) * 0.4 * twinkle;
      behind += vec4(fg * speck, speck) * (1.0 - behind.a);
    }
  }
  if (uv.y > 0.6) { gl_FragColor = behind; return; }

  bool edge;
  vec4 colour = trace(uv, unit, behind, edge);
  if (edge) {
    bool ignored;
    float q = 0.25 / unit;
    colour += trace(uv + vec2(q, q * 0.5), unit, behind, ignored);
    colour += trace(uv + vec2(-q * 0.5, q), unit, behind, ignored);
    colour += trace(uv + vec2(-q, -q * 0.5), unit, behind, ignored);
    colour *= 0.25;
  }
  float noise = (fract(sin(dot(position, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(colour.rgb, max(colour.a + noise, 0.0));
}`;

  // Gruvbox Dark Hard, as the app picks them: palette 12 and 13, eased toward the text.
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mixRGB = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  const LIQUID = (() => {
    const bg = rgb("#1d2021"), fg = rgb("#ebdbb2");
    return { bg, fg, blue: mixRGB(rgb("#83a598"), fg, 0.2), magenta: mixRGB(rgb("#d3869b"), fg, 0.15) };
  })();

  const liquid = (canvas) => {
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
    if (!gl) return;
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = shader(gl.VERTEX_SHADER, "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }");
    const fs = shader(gl.FRAGMENT_SHADER, LIQUID_FRAG);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    // One triangle over the whole canvas.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    const u = (name) => gl.getUniformLocation(program, name);
    gl.uniform3fv(u("bg"), LIQUID.bg);
    gl.uniform3fv(u("fg"), LIQUID.fg);
    gl.uniform3fv(u("blue"), LIQUID.blue);
    gl.uniform3fv(u("magenta"), LIQUID.magenta);
    const frameAt = u("frame"), turnAt = u("turn");
    canvas.classList.add("on");

    // Toward the pointer, by at most a little, and softly.
    const turn = [0, 0], target = [0, 0];
    const host = canvas.parentElement;
    host.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      target[0] = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target[1] = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    host.addEventListener("pointerleave", () => { target[0] = target[1] = 0; });

    // Retina pixels, up to 1.5 a CSS pixel: one a point (as in the app) shows
    // steps on the outline once the browser scales it up.
    const scale = Math.min(devicePixelRatio || 1, 1.5);
    const fit = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale)), h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };
    const start = performance.now();
    const draw = (now) => {
      fit();
      turn[0] += (target[0] - turn[0]) * 0.06;
      turn[1] += (target[1] - turn[1]) * 0.06;
      gl.uniform4f(frameAt, canvas.width, canvas.height, reduced ? 4 : (now - start) / 1000, 0);
      gl.uniform4f(turnAt, turn[0], turn[1], 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reduced) {
      // Still: one frame, again when the size changes.
      draw(0);
      new ResizeObserver(() => draw(0)).observe(canvas);
      return;
    }
    // A first frame at once, then the loop: the motion is slow, thirty frames
    // a second, and none while it's off screen.
    draw(start);
    let visible = false, frameId = 0, last = 0;
    const loop = (now) => {
      frameId = requestAnimationFrame(loop);
      if (now - last < 32) return;
      last = now;
      draw(now);
    };
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frameId);
      if (visible) frameId = requestAnimationFrame(loop);
    }).observe(canvas);
  };
  $$("canvas[data-liquid]").forEach(liquid);

  // ---- Benji (BenjiCharacter in the app): he looks about, slow turns now one
  // way, now the other, with a nod between; while the pointer moves he turns
  // his visor to it, and goes back to looking about once it has been still a
  // while. CSS floats him, blinks him and drifts his rim's colours.
  $$("[data-benji]").forEach((benji) => {
    if (reduced) return;
    const pointer = { x: 0, y: 0, at: -1e9 };
    addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.at = performance.now(); }, { passive: true });
    const gaze = { yaw: 0, pitch: 0 };
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    let frameId = 0;
    const frame = (now) => {
      frameId = requestAnimationFrame(frame);
      const t = now / 1000;
      const s = benji.offsetWidth;
      let yaw = 22 * Math.sin(t * 0.55) + 7 * Math.sin(t * 1.31);
      let pitch = 7 * Math.sin(t * 0.83 + 1);
      if (now - pointer.at < 2500) {
        const r = benji.getBoundingClientRect();
        yaw = clamp((pointer.x - (r.left + r.width / 2)) / (s * 4)) * 35;
        pitch = clamp((pointer.y - (r.top + r.height / 2)) / (s * 4)) * 25;
      }
      gaze.yaw += (yaw - gaze.yaw) * 0.1;
      gaze.pitch += (pitch - gaze.pitch) * 0.1;
      const rad = Math.PI / 180;
      benji.style.setProperty("--yaw", `${gaze.yaw}deg`);
      benji.style.setProperty("--pitch", `${gaze.pitch}deg`);
      benji.style.setProperty("--roll", `${4 * Math.sin(t * 0.7)}deg`);
      benji.style.setProperty("--dx", `${Math.sin(gaze.yaw * rad) * s * 0.2}px`);
      benji.style.setProperty("--dy", `${Math.sin(gaze.pitch * rad) * s * 0.2}px`);
    };
    new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frameId);
      if (entry.isIntersecting) frameId = requestAnimationFrame(frame);
    }).observe(benji);
  });

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
      "compact-ahead": "percent of the context at which a copy is compacted in the background; 0 leaves it to Claude Code",
      "agent-background": "what a new Claude session is drawn over: liquid, a picture, or none",
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
      add("compact-ahead", value("compact-ahead"), value("compact-ahead") === "60");
      add("agent-background", value("agent-background"), value("agent-background") === "liquid");
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
