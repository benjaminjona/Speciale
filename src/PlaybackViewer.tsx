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
        console.log(pageResources, )
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
           document.body.appendChild(banner);
        });
        document.addEventListener("DOMContentLoaded", function() {
            if (!pageResources || !pageResources.resources) return;
            pageResources.resources.forEach((resourceInfo) => {
    const imgSrc = resourceInfo.downloadUrl;
    const timeDiff = resourceInfo.timeDifference; 
    const allImages = document.querySelectorAll('img');
    const theImage = Array.from(allImages).find(img => img.src === imgSrc);
    
    if (theImage) {
        // 1. Create the Wrapper Div
        const wrapper = document.createElement("div");
        
        // Match the wrapper to the image size and make it the anchor
        Object.assign(wrapper.style, {
            position: "relative",
            display: "inline-block", 
            verticalAlign: "middle", // Maintains alignment of the original image
            lineHeight: "0",         // Removes the default whitespace under images
            border: "3px solid red",
            borderRadius: "4px"
        });

        // 2. Create the Label (Span)
        const label = document.createElement("span");
        label.innerText = timeDiff;
        
        Object.assign(label.style, {
            position: "absolute",
            top: "-20px",
            right: "0",
            backgroundColor: "red",
            color: "white",
            fontSize: "12px",
            padding: "2px 5px",
            fontWeight: "bold",
            zIndex: "100",
            lineHeight: "normal", // Ensure text inside isn't affected by wrapper's 0 line-height
            pointerEvents: "none" 
        });

        // 3. The "Wrap" Logic
        // Insert wrapper before the image, then move the image into it
        theImage.parentNode.insertBefore(wrapper, theImage);
        wrapper.appendChild(theImage);
        
        // 4. Add the label into the new relative container
        wrapper.appendChild(label);
        
        // Clean up image margins that might push the wrapper boundaries
        theImage.style.margin = "0";
        theImage.style.display = "block"; // Prevents internal alignment gaps
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
  }, [htmlContent, baseUrl, pageResourcesJson]);

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
