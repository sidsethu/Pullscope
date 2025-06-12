import { motion, AnimatePresence } from 'framer-motion';
import { Box, Text, Image } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';

interface DashboardIntroLoaderProps {
  dissolve: boolean;
}

// Rickshaw image component
function Rickshaw({ pulse }: { pulse: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={pulse ? { scale: [1, 1.15, 1], filter: ["drop-shadow(0 0 0 #00e676)", "drop-shadow(0 0 16px #00e676)", "drop-shadow(0 0 0 #00e676)"] } : { scale: 1, filter: "drop-shadow(0 0 0 #00e676)" }}
      transition={pulse ? { repeat: Infinity, duration: 0.7, ease: "easeInOut" } : {}}
      style={{ display: 'block' }}
    >
      <Image src="/data/auto.png" alt="Auto Rickshaw" boxSize="90px" objectFit="contain" draggable={false} />
    </motion.div>
  );
}

export default function DashboardIntroLoader({ dissolve }: DashboardIntroLoaderProps) {
  // Animation state: 0 = title, 1 = rickshaw moving, 2 = rickshaw finish
  const [phase, setPhase] = useState<'title' | 'rickshaw' | 'finish'>('title');
  // Rickshaw position (0 = left, 1 = right)
  const [rickshawX, setRickshawX] = useState(0);
  const rickshawXRef = React.useRef(0);
  // Control actual dissolve
  const [shouldDissolve, setShouldDissolve] = useState(false);

  // Sequence: fade/bounce title, then move rickshaw, then finish if needed
  useEffect(() => {
    if (phase === 'title') {
      const t = setTimeout(() => setPhase('rickshaw'), 1200);
      return () => clearTimeout(t);
    }
    if (phase === 'rickshaw') {
      let start: number | null = null;
      let raf: number;
      const animate = (ts: number) => {
        if (start === null) start = ts;
        const elapsed = ts - start;
        // Move rickshaw from 0 to 0.96 over 45.5s (very slow)
        const x = Math.min(0.98, (elapsed / 14500) * 0.98);
        setRickshawX(x);
        rickshawXRef.current = x;
        if (x < 0.98 && phase === 'rickshaw') {
          raf = requestAnimationFrame(animate);
        }
      };
      raf = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(raf);
    }
    if (phase === 'finish') {
      // When entering finish phase, animate from current rickshawX to 0.96 quickly
      let start: number | null = null;
      let raf: number;
      const from = rickshawXRef.current;
      const to = 0.98;
      const duration = 700; // ms
      const animate = (ts: number) => {
        if (start === null) start = ts;
        const elapsed = ts - start;
        const pct = Math.min(1, elapsed / duration);
        setRickshawX(from + (to - from) * pct);
        rickshawXRef.current = from + (to - from) * pct;
        if (pct < 1) {
          raf = requestAnimationFrame(animate);
        } else {
          setShouldDissolve(true); // Only dissolve after fast animation completes
        }
      };
      raf = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(raf);
    }
  }, [phase]);

  // When dissolve is triggered, finish the rickshaw movement
  useEffect(() => {
    if (dissolve && phase === 'rickshaw') {
      setPhase('finish');
    }
    // If already at the end, dissolve immediately
    if (dissolve && phase === 'finish' && rickshawXRef.current >= 0.96) {
      setShouldDissolve(true);
    }
  }, [dissolve, phase]);

  // When dissolve is triggered during title phase, skip to finish
  useEffect(() => {
    if (dissolve && phase === 'title') {
      setPhase('finish');
    }
  }, [dissolve, phase]);

  // Road line width (from left to just before the rickshaw)
  const roadEnd = `calc(${rickshawX * 100}vw - 60px)`; // 60px before the rickshaw's left edge

  return (
    <AnimatePresence>
      {!shouldDissolve && (
        <Box
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          position="fixed"
          top={0}
          left={0}
          w="100vw"
          h="100vh"
          zIndex={2000}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          bg="#fff"
        >
          {/* Title */}
          <Box
            mb={10}
            zIndex={2}
            pointerEvents="none"
            fontWeight={600}
            fontSize="2rem"
            color="#222"
            textAlign="center"
            letterSpacing={1}
          >
            Waiting for Metrics
          </Box>
          {/* Road and Rickshaw group */}
          <Box
            position="relative"
            w="100vw"
            h="56px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="row"
          >
            {/* Road (behind rickshaw) */}
            {phase !== 'title' && (
              <Box
                position="absolute"
                top="50%"
                transform="translateY(-50%)"
                left={0}
                w="100vw"
                h="56px"
                zIndex={1}
                pointerEvents="none"
              >
                <motion.div
                  initial={false}
                  animate={{ width: roadEnd }}
                  transition={{ type: 'tween', duration: 0.1, ease: 'linear' }}
                  style={{
                    height: '40px',
                    background: '#222',
                    borderRadius: '2px',
                    position: 'absolute',
                    left: 0,
                    top: '8px',
                    boxShadow: '0 2px 8px #0002',
                    overflow: 'hidden',
                  }}
                >
                  {/* Dashed center line */}
                  <Box
                    position="absolute"
                    left={0}
                    top="17px"
                    h="6px"
                    w="100%"
                    borderRadius="3px"
                    borderTop="2px dashed #fff"
                    opacity={0.7}
                  />
                </motion.div>
              </Box>
            )}
            {/* Rickshaw */}
            {phase !== 'title' && (
              <motion.div
                style={{
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '100vw',
                }}
                initial={false}
                animate={{ x: `calc(${rickshawX * 100}vw - 65px)` }}
                transition={{ type: 'tween', duration: 0.1, ease: 'linear' }}
              >
                <Rickshaw pulse={false} />
              </motion.div>
            )}
          </Box>
        </Box>
      )}
    </AnimatePresence>
  );
} 