// Shows the screenshot and recordings once their files are added next to
// this page; until then the page reads fine without them.
(() => {
  // Shows screenshot.webp in the hero when the file exists.
  fetch("screenshot.webp", { method: "HEAD" })
    .then((r) => { if (r.ok) document.getElementById("shot").hidden = false; })
    .catch(() => {});

  // Media blocks stay hidden until their files exist; inside a block, items
  // whose file is missing are dropped, so one screenshot can ship alone.
  document.querySelectorAll("[data-media]").forEach((block) => {
    const items = [...block.querySelectorAll("[data-check]")];
    Promise.all(items.map((el) =>
      fetch(el.dataset.check, { method: "HEAD" })
        .then((r) => r.ok)
        .catch(() => false)
        .then((ok) => {
          if (!ok) {
            (el.closest("figure") || el).remove();
            return false;
          }
          if (el.dataset.poster) el.poster = el.dataset.poster;
          el.src = el.dataset.check;
          return true;
        })
    )).then((found) => { if (found.some(Boolean)) block.hidden = false; });
  });
})();
