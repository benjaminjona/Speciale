import  {useEffect, useState} from 'react';
import {
  Box,
  Flex,
  Text,
  Slider,
  NumberInput,
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverCloseTrigger,
} from '@chakra-ui/react';
import { LuSettings, LuX, LuNetwork } from 'react-icons/lu';

interface PlaybackViewerProps {
  htmlContent: string | null;
  baseUrl: string | null;
  pageResources: any
  getPlaybackFunction: (url: string, flag?: boolean) => Promise<void>;
}

/**
 * PlaybackViewer Component
 * Wraps the fetched archived HTML in an iframe-like container (Shadow DOM or Iframe)
 * to isolate styles and scripts, while allowing injection of custom scripts.
 */
const PlaybackViewer = ({htmlContent, baseUrl, pageResources, getPlaybackFunction}: PlaybackViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [maxTimeDiffMs, setMaxTimeDiffMs] = useState<number>(30 * 24 * 60 * 60 * 1000);
  const [popoverOpen, setPopoverOpen] = useState(false);
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
              const isOverThreshold = isNaN(timeDiffMs) || timeDiffMs > MAX_TIME_DIFF_MS;
              // Only highlight resources that exceed the threshold
              if (!isOverThreshold) return;

          const allImages = document.querySelectorAll('img');
          const theImage = Array.from(allImages).find(img => img.src === imgSrc);
          const toolbar = document.querySelector('#tegModal');
          
          //remove the toolbar !!
          if(toolbar) toolbar.remove();
          
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
                  fontSize: "10px",
                  padding: "2px 3px",
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
                label.style.top = (window.scrollY + rect.top -14) + "px";
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

         
        // Intercept clicks on all <a> tags and forward href to parent
        document.addEventListener("click", function(e) {
          var anchor = e.target.closest ? e.target.closest("a") : null;
          if (!anchor) {
            // fallback for older browsers
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
    const blob = new Blob([processedHtml], {type: 'text/html'});
    const newBlobUrl = URL.createObjectURL(blob);
    setBlobUrl(newBlobUrl);

    return () => {
      URL.revokeObjectURL(newBlobUrl);
    };
  }, [htmlContent, baseUrl, pageResourcesJson, maxTimeDiffMs]);

  // Listen for link click messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === '__swb_link_click' && typeof event.data.href === 'string') {
        let href = event.data.href;

        // Strip backend origin so the request goes through the Vite proxy
        try {
          const url = new URL(href);
          if (url.origin !== window.location.origin) {
            href = url.pathname + url.search + url.hash;
          }
        } catch (_) {
          // Already a relative path, use as-is
        }

        getPlaybackFunction(href, true);

        console.log("Link clicked inside playback:", href);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // useEffect(() => {
  //   resolveAndFetchResources(baseUrl || "");
  // }, [baseUrl]);

  if (!blobUrl) return <div>Preparing playback...</div>;

  // Convert ms to days for the UI
  const currentDays = Math.round(maxTimeDiffMs / (24 * 60 * 60 * 1000));

  const currentDate = pageResources?.pageCrawlDate ? new Date(pageResources.pageCrawlDate) : null;

  return (
    <div className="playback-wrapper" style={{width: '100%', position:"relative"}}>
      <div style={{
         position: "absolute",
         top: "6px",
         right: "6px",
         backgroundColor: "#002E70",
         fontSize: "10px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",

        borderRadius: "4px",
         padding: "4px 8px",
         color: "#fff",
      }}>
        {currentDate?.toLocaleString() }
      </div>

      <style>{`
        .swb-gear-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: #002E70;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          transition: background-color 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .swb-gear-btn:hover {
          background-color: #003d94;
          transform: scale(1.08);
          box-shadow: 0 6px 18px rgba(0,0,0,0.3);
        }
        .swb-gear-btn:active {
          background-color: #001e4a;
          transform: scale(0.96);
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .swb-close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: transparent;
          border: 1.5px solid #002E70;
          color: #002E70;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.15s, color 0.15s, transform 0.15s;
        }
        .swb-close-btn:hover {
          background-color: #002E70;
          color: #fff;
          transform: scale(1.1);
        }
        .swb-close-btn:active {
          background-color: #001e4a;
          color: #fff;
          transform: scale(0.94);
        }
        .swb-overview-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1.5px solid #002E70;
          background-color: transparent;
          color: #002E70;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.15s, color 0.15s, transform 0.1s;
        }
        .swb-overview-btn:hover {
          background-color: #002E70;
          color: #fff;
        }
        .swb-overview-btn:active {
          background-color: #001e4a;
          color: #fff;
          transform: scale(0.97);
        }
      `}</style>
      <iframe
        src={blobUrl}
        style={{width: '100%', height: "100vh", border: 'none'}}
        title="Archived Content"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />

      {/* Standalone gear button */}
      {!popoverOpen && (
        <button
          className="swb-gear-btn"
          aria-label="Settings"
          onClick={() => setPopoverOpen(true)}
          style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 1000 }}
        >
          <LuSettings size={22} />
        </button>
      )}

      {/* Settings popover */}
      <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 1001 }}>
        <PopoverRoot positioning={{ placement: "top-end" }} open={popoverOpen} onOpenChange={(e) => setPopoverOpen(e.open)}>
          <PopoverTrigger asChild>
            <span style={{ display: "none" }} />
          </PopoverTrigger>
          <PopoverContent style={{
          backgroundColor: "#fff",
          color: "#002E70",
          borderRadius: "12px",
          padding: "20px",
          width: "360px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          border: "1px solid #e2e8f0",
          marginBottom: "8px",
          marginRight: "0px",
        }}>
          <PopoverBody style={{ padding: 0 }}>
            <Flex align="center" justify="space-between" style={{ marginBottom: "14px" }}>
              <Text style={{ fontSize: "1rem", fontWeight: 700, color: "#002E70" }}>
                Playback Settings
              </Text>
              <PopoverCloseTrigger asChild>
                <button className="swb-close-btn" aria-label="Close" style={{ position: "static" }}>
                  <LuX size={14} />
                </button>
              </PopoverCloseTrigger>
            </Flex>

            <Flex direction="column" gap={4}>
              <Text fontWeight="bold" fontSize="sm" style={{ color: "#002E70" }}>
                Max allowed time difference:
              </Text>

              <Box minW="150px">
                <Slider.Root
                  min={0}
                  max={3650}
                  step={1}
                  value={[currentDays]}
                  onValueChange={(details) => {
                    const days = details.value[0];
                    setMaxTimeDiffMs(days * 24 * 60 * 60 * 1000);
                  }}
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range/>
                    </Slider.Track>
                    <Slider.Thumb index={0}/>
                  </Slider.Control>
                </Slider.Root>
              </Box>

              <Flex align="center" gap={3}>
                <NumberInput.Root
                  min={0}
                  max={3650}
                  step={1}
                  value={String(currentDays)}
                  onValueChange={(details) => {
                    const days = parseInt(details.value, 10);
                    if (!isNaN(days) && days >= 0) {
                      setMaxTimeDiffMs(days * 24 * 60 * 60 * 1000);
                    }
                  }}
                  w="90px"
                >
                  <NumberInput.Control>
                    <NumberInput.IncrementTrigger/>
                    <NumberInput.DecrementTrigger/>
                  </NumberInput.Control>
                  <NumberInput.Input textAlign="center"/>
                </NumberInput.Root>
                <Text fontSize="sm" style={{ color: "#002E70" }}>days</Text>
              </Flex>

              <Text fontSize="xs" style={{ color: "#002E70", opacity: 0.7 }}>
                Resources beyond this threshold are highlighted in{' '}
                <Text as="span" color="#EA580C" fontWeight="bold">orange</Text>
              </Text>

              <button
                className="swb-overview-btn"
                onClick={() => window.open("/overview", "_blank")}
              >
                <LuNetwork size={16} />
                Overview of the domain
              </button>
            </Flex>
          </PopoverBody>
        </PopoverContent>
        </PopoverRoot>
      </div>
    </div>
  );
};

export default PlaybackViewer;
