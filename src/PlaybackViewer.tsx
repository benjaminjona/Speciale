import  {useEffect, useState} from 'react';
import {
  Box,
  Flex,
  Text,
  Slider,
  NumberInput,
  Dialog,
  Portal,
} from '@chakra-ui/react';
import { LuSettings, LuX } from 'react-icons/lu';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  return (
    <div className="playback-wrapper" style={{width: '100%', position:"relative"}}>
      <style>{`
        .swb-gear-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000;
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
      `}</style>
      <iframe
        src={blobUrl}
        style={{width: '100%', height: "100vh", border: 'none'}}
        title="Archived Content"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />

      {/* Floating gear button */}
      <button
        className="swb-gear-btn"
        aria-label="Settings"
        onClick={() => setSettingsOpen(true)}
      >
        <LuSettings size={22} />
      </button>

      {/* Settings Modal */}
      <Dialog.Root open={settingsOpen} onOpenChange={(e) => setSettingsOpen(e.open)} placement="center">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content style={{ backgroundColor: "#fffff", color: "#002E70", borderRadius: "12px", padding: "24px", maxWidth: "480px" }}>
              <Dialog.Header style={{ padding: 0, marginBottom: "16px" }}>
                <Dialog.Title style={{ fontSize: "1.1rem", fontWeight: 700, color: "#002E70" }}>
                  Playback Settings
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body style={{ padding: 0 }}>
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
                </Flex>
              </Dialog.Body>
              <Dialog.CloseTrigger asChild>
                <button className="swb-close-btn" aria-label="Close">
                  <LuX size={16} />
                </button>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
};

export default PlaybackViewer;
