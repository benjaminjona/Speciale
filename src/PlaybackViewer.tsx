import React, { useEffect, useState } from 'react';

interface PlaybackViewerProps {
  htmlContent: string | null;
  baseUrl: string | null;
  pageResources:any
}

/**
 * PlaybackViewer Component
 * Wraps the fetched archived HTML in an iframe-like container (Shadow DOM or Iframe)
 * to isolate styles and scripts, while allowing injection of custom scripts.
 */
const PlaybackViewer = ({ htmlContent, baseUrl,pageResources }:PlaybackViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [maxTimeDiffMs, setMaxTimeDiffMs] = useState<number>(30 * 24 * 60 * 60 * 1000); // default 30 days
  const pageResourcesJson = JSON.stringify(pageResources);

  useEffect(() => {
    if (!htmlContent) return;

    // 1. Process the HTML
    let processedHtml = htmlContent;

    // Inject <base> tag so relative links (CSS, Images, Links) resolve against the backend
    if (baseUrl) {
      const baseTag = `<base href="${baseUrl}" />`;
      if (processedHtml.includes('<head>')) {
        processedHtml = processedHtml.replace('<head>', `<head>${baseTag}`);
      } else {
        processedHtml = `${baseTag}${processedHtml}`;
      }
    }

    // Inject custom script
    // This script runs INSIDE the playback page context
    const customScript = `
      <script>
        const pageResources = ${pageResourcesJson};
        const MAX_TIME_DIFF_MS = ${maxTimeDiffMs};
        console.log(pageResources);
        console.log("Max allowed time diff (ms):", MAX_TIME_DIFF_MS);
        console.log("-----------------------------------------");
        console.log("SolrWayback Custom Script Injected Successfully!");
        console.log("This script is running inside the playback context.");
        
        // Parse a timeDifference value (number in ms, or string like "-3 days, 2 hours") into absolute ms
        function parseTimeDiffToMs(val) {
          if (typeof val === 'number') return Math.abs(val);
          if (typeof val !== 'string') return NaN;
          // Try parsing as a plain number (could be ms as string like "-86400000")
          var asNum = Number(val);
          if (!isNaN(asNum) && val.trim() !== '') return Math.abs(asNum);
          // Parse human-readable strings like "3 days, 2 hours, 15 minutes" or "-5 days"
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
          if (found) return totalMs; // already absolute since we only capture digits
          return NaN;
        }

        document.addEventListener("DOMContentLoaded", function() {
            if (!pageResources || !pageResources.resources) return;
            pageResources.resources.forEach((resourceInfo) => {
    const imgSrc = resourceInfo.downloadUrl;
    const timeDiff = resourceInfo.timeDifference;
    const timeDiffMs = parseTimeDiffToMs(timeDiff);
    console.log("Resource:", imgSrc, "| timeDifference:", timeDiff, "| parsed ms:", timeDiffMs, "| threshold:", MAX_TIME_DIFF_MS);
    const isOverThreshold = isNaN(timeDiffMs) || timeDiffMs > MAX_TIME_DIFF_MS;
    // Only highlight resources that exceed the threshold
    if (!isOverThreshold) return;

    const allImages = document.querySelectorAll('img');
    const theImage = Array.from(allImages).find(img => img.src === imgSrc);
    
    if (theImage) {
        // Use outline (doesn't affect layout) instead of border/wrapper
        theImage.style.outline = "3px solid red";
        theImage.style.outlineOffset = "-3px";

        // Create a floating label positioned over the image, appended to body
        const label = document.createElement("span");
        label.innerText = timeDiff;
        label.className = "__swb-overlay-label";
        Object.assign(label.style, {
            position: "absolute",
            backgroundColor: "red",
            color: "white",
            fontSize: "12px",
            padding: "2px 5px",
            fontWeight: "bold",
            zIndex: "2147483647",
            lineHeight: "normal",
            pointerEvents: "none",
            whiteSpace: "nowrap"
        });
        document.body.appendChild(label);

        // Position label at top-right of the image
        function positionLabel() {
          var rect = theImage.getBoundingClientRect();
          label.style.top = (window.scrollY + rect.top) + "px";
          label.style.left = (window.scrollX + rect.right - label.offsetWidth) + "px";
        }
        // Wait for image to load (may have 0 rect before load)
        if (theImage.complete) { positionLabel(); } else { theImage.addEventListener("load", positionLabel); }
        window.addEventListener("resize", positionLabel);
        window.addEventListener("scroll", positionLabel);
    }
});
    });
        console.log("-----------------------------------------");
      </script>
    `;
    
    if (processedHtml.includes('</body>')) {
      processedHtml = processedHtml.replace('</body>', `${customScript}</body>`);
    } else {
      processedHtml += customScript;
    }

    // 2. Create a Blob URL
    // Using a Blob URL allows us to render the full HTML document in an iframe
    // without cross-origin restrictions (it treats it as same-origin in many ways, 
    // though distinct).
    const blob = new Blob([processedHtml], { type: 'text/html' });
    const newBlobUrl = URL.createObjectURL(blob);
    setBlobUrl(newBlobUrl);

    // Cleanup blob URL when component unmounts or content changes
    return () => {
      URL.revokeObjectURL(newBlobUrl);
    };
  }, [htmlContent, baseUrl, pageResourcesJson, maxTimeDiffMs]);

  if (!blobUrl) return <div>Preparing playback...</div>;

  // Convert ms to days for the UI
  const currentDays = Math.round(maxTimeDiffMs / (24 * 60 * 60 * 1000));

  return (
    <div className="playback-wrapper" style={{ width: '100%' }}>
      <iframe 
        src={blobUrl} 
        style={{ width: '100%', height: '800px', border: 'none' }}
        title="Archived Content"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />

      {/* Time Difference Threshold Control */}
      <div style={{
        marginTop: '12px',
        padding: '14px 18px',
        backgroundColor: '#f5f5f5',
        borderRadius: '6px',
        border: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        flexWrap: 'wrap',
      }}>
        <label style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>
          Max allowed time difference:
        </label>
        <input
          type="range"
          min={1}
          max={3650}
          value={currentDays}
          onChange={(e) => {
            const days = parseInt(e.target.value, 10);
            setMaxTimeDiffMs(days * 24 * 60 * 60 * 1000);
          }}
          style={{ flex: 1, minWidth: '150px' }}
        />
        <input
          type="number"
          min={1}
          max={3650}
          value={currentDays}
          onChange={(e) => {
            const days = parseInt(e.target.value, 10);
            if (!isNaN(days) && days >= 1) {
              setMaxTimeDiffMs(days * 24 * 60 * 60 * 1000);
            }
          }}
          style={{ width: '70px', padding: '4px 6px', fontSize: '14px', textAlign: 'center' }}
        />
        <span style={{ fontSize: '14px', color: '#555' }}>days</span>
        <span style={{ fontSize: '12px', color: '#888' }}>
          (Resources beyond this threshold are highlighted in <span style={{ color: 'red', fontWeight: 'bold' }}>red</span>,
          within in <span style={{ color: 'green', fontWeight: 'bold' }}>green</span>)
        </span>
      </div>
    </div>
  );
};

export default PlaybackViewer;
