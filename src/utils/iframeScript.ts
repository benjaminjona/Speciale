export const buildIframeScript = (pageResourcesJson: string, maxTimeDiffMs: number): string => `
<script>
  const pageResources = ${pageResourcesJson};
  const MAX_TIME_DIFF_MS = ${maxTimeDiffMs};

  function parseTimeDiffToMs(val) {
    if (typeof val === 'number') return Math.abs(val);
    if (typeof val !== 'string') return NaN;
    var asNum = Number(val);
    if (!isNaN(asNum) && val.trim() !== '') return Math.abs(asNum);
    var totalMs = 0;
    var units = { day: 86400000, hour: 3600000, minute: 60000, second: 1000, millisecond: 1 };
    var regex = /(\\d+)\\s*(day|hour|minute|second|millisecond)s?/gi;
    var match;
    var found = false;
    while ((match = regex.exec(val)) !== null) {
      found = true;
      var amount = parseInt(match[1], 10);
      var unit = match[2].toLowerCase();
      totalMs += amount * (units[unit] || 0);
    }
    if (found) return totalMs;
    return NaN;
  }

  var toolbar = document.querySelector('#tegModal');
  if (toolbar) toolbar.remove();

  document.addEventListener("DOMContentLoaded", function() {
    if (!pageResources || !pageResources.resources) return;
    pageResources.resources.forEach(function(resourceInfo) {
      var imgSrc = resourceInfo.downloadUrl;
      var timeDiff = resourceInfo.timeDifference;
      var timeDiffMs = parseTimeDiffToMs(timeDiff);
      var isOverThreshold = isNaN(timeDiffMs) || timeDiffMs > MAX_TIME_DIFF_MS;
      if (!isOverThreshold) return;

      var allImages = document.querySelectorAll('img');
      var theImage = Array.from(allImages).find(function(img) { return img.src === imgSrc; });

      if (theImage) {
        theImage.style.outline = "3px solid red";
        theImage.style.outlineOffset = "-3px";

        var label = document.createElement("span");
        label.innerText = timeDiff;
        label.className = "__swb-overlay-label";
        Object.assign(label.style, {
          position: "absolute",
          backgroundColor: "red",
          color: "white",
          fontSize: "10px",
          padding: "2px 3px",
          fontWeight: "bold",
          zIndex: "2147483647",
          lineHeight: "normal",
          pointerEvents: "none",
          whiteSpace: "nowrap"
        });
        document.body.appendChild(label);

        function positionLabel() {
          var rect = theImage.getBoundingClientRect();
          label.style.top = (window.scrollY + rect.top - 14) + "px";
          label.style.left = (window.scrollX + rect.right - label.offsetWidth) + "px";
        }
        if (theImage.complete) { positionLabel(); } else { theImage.addEventListener("load", positionLabel); }
        window.addEventListener("resize", positionLabel);
        window.addEventListener("scroll", positionLabel);
      }
    });
  });

  document.addEventListener("click", function(e) {
    var anchor = e.target.closest ? e.target.closest("a") : null;
    if (!anchor) {
      var el = e.target;
      while (el && el.tagName !== "A") el = el.parentElement;
      anchor = el;
    }
    if (anchor && anchor.href) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ type: "__swb_link_click", href: anchor.href }, "*");
    }
  }, true);
</script>`;
