import React, { useEffect, useRef, useState } from 'react';

/**
 * PlaybackViewer Component
 * Wraps the fetched archived HTML in an iframe-like container (Shadow DOM or Iframe)
 * to isolate styles and scripts, while allowing injection of custom scripts.
 */
const PlaybackViewer = ({ htmlContent, baseUrl }) => {
  const [blobUrl, setBlobUrl] = useState(null);

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
        console.log("-----------------------------------------");
        console.log("SolrWayback Custom Script Injected Successfully!");
        console.log("This script is running inside the playback context.");
        
        // Example: Add a visible overlay
        document.addEventListener("DOMContentLoaded", function() {
           const banner = document.createElement("div");
           banner.style.position = "fixed";
           banner.style.top = "0";
           banner.style.left = "0";
           banner.style.width = "100%";
           banner.style.backgroundColor = "#ffcc00";
           banner.style.color = "black";
           banner.style.textAlign = "center";
           banner.style.zIndex = "999999";
           banner.style.padding = "5px";
           banner.innerText = "Injected via React App";
           document.body.appendChild(banner);
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
  }, [htmlContent, baseUrl]);

  if (!blobUrl) return <div>Preparing playback...</div>;

  return (
    <div className="playback-wrapper" style={{ width: '100%', height: '800px' }}>
      <iframe 
        src={blobUrl} 
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Archived Content"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups" // Adjust sandbox flags as needed
      />
    </div>
  );
};

export default PlaybackViewer;
