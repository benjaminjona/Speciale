import { useEffect, useState } from 'react';
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
import { usePersistentStore } from "./store/usePersistentStore";
import { buildIframeScript } from "./utils/iframeScript";

interface PlaybackViewerProps {
  htmlContent: string | null;
  baseUrl: string | null;
  pageResources: any;
  getPlaybackFunction: (url: string, flag?: boolean) => Promise<void>;
}

const PlaybackViewer = ({ htmlContent, baseUrl, pageResources, getPlaybackFunction }: PlaybackViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [maxTimeDiffMs, setMaxTimeDiffMs] = useState<number>(30 * 24 * 60 * 60 * 1000);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const pageResourcesJson = JSON.stringify(pageResources);

  useEffect(() => {
    if (!htmlContent) return;

    let processedHtml = htmlContent;

    if (baseUrl) {
      const baseTag = `<base href="${baseUrl}" />`;
      if (processedHtml.includes('<head>')) {
        processedHtml = processedHtml.replace('<head>', `<head>${baseTag}`);
      } else {
        processedHtml = `${baseTag}${processedHtml}`;
      }
    }

    const customScript = buildIframeScript(pageResourcesJson, maxTimeDiffMs);

    if (processedHtml.includes('</body>')) {
      processedHtml = processedHtml.replace('</body>', `${customScript}</body>`);
    } else {
      processedHtml += customScript;
    }

    const blob = new Blob([processedHtml], { type: 'text/html' });
    const newBlobUrl = URL.createObjectURL(blob);
    setBlobUrl(newBlobUrl);

    return () => { URL.revokeObjectURL(newBlobUrl); };
  }, [htmlContent, baseUrl, pageResourcesJson, maxTimeDiffMs]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === '__swb_link_click' && typeof event.data.href === 'string') {
        let href = event.data.href;

        try {
          const url = new URL(href);
          if (url.origin !== window.location.origin) {
            href = url.pathname + url.search + url.hash;
          }
        } catch (_) { /* relative path */ }

        const parts = href.split(/\/\d{14}\//);
        const url = parts[1];
        usePersistentStore.getState().addNode({ url });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!blobUrl) return <div>Preparing playback...</div>;

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
                <Text as="span" color="#FF0000" fontWeight="bold">red</Text>
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
