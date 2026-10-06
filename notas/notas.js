// Fills in the download button from the latest GitHub release of the public
// releases repo. If there is no release yet, the button says so instead of
// linking to a 404.
(() => {
  const REPO = "crisecheverria/notas-releases";
  const button = document.getElementById("download");
  const meta = document.getElementById("meta");
  const notice = document.getElementById("notice");
  const gatekeeper = document.getElementById("gatekeeper");

  // Shows screenshot.webp in the hero when the file exists.
  fetch("screenshot.webp", { method: "HEAD" })
    .then((r) => { if (r.ok) document.getElementById("shot").hidden = false; })
    .catch(() => {});

  fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((release) => {
      const asset = (release.assets || []).find((a) => a.name === "Notas.dmg");
      if (!asset) throw new Error("no dmg");
      const version = release.tag_name.replace(/^v/, "");
      const mb = Math.round(asset.size / 1048576);
      const date = new Date(release.published_at).toLocaleDateString("en", {
        year: "numeric", month: "short", day: "numeric",
      });
      button.href = asset.browser_download_url;
      button.classList.remove("disabled");
      button.lastChild.textContent = " Download for macOS";
      notice.hidden = true;
      meta.textContent = `Version ${version} · ${mb} MB · ${date} · macOS 13+ · Apple Silicon & Intel`;
      // Builds that are not notarized say so in their release notes.
      if (/not notarized/i.test(release.body || "")) gatekeeper.hidden = false;
    })
    .catch(() => {
      button.classList.add("disabled");
      button.removeAttribute("href");
      button.lastChild.textContent = " Coming soon";
      notice.textContent = "The first release is on its way. Check back shortly.";
      notice.hidden = false;
    });
})();
