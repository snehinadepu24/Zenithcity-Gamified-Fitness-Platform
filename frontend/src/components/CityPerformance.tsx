import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

interface CityPerformanceProps {
    onSample?: (sample: { fps: number; frameMs: number }) => void;
}

export default function CityPerformance({ onSample }: CityPerformanceProps) {
    const elapsedRef = useRef(0);
    const framesRef = useRef(0);
    const [sample, setSample] = useState({ fps: 0, frameMs: 0 });

    useFrame((_, delta) => {
        elapsedRef.current += delta;
        framesRef.current += 1;
        if (elapsedRef.current < 1) return;

        const fps = framesRef.current / elapsedRef.current;
        const nextSample = { fps: Math.round(fps), frameMs: Math.round((1000 / fps) * 10) / 10 };
        setSample(nextSample);
        onSample?.(nextSample);
        elapsedRef.current = 0;
        framesRef.current = 0;
    });

    useEffect(() => {
        document.documentElement.dataset.cityFps = String(sample.fps);
        return () => {
            delete document.documentElement.dataset.cityFps;
        };
    }, [sample.fps]);

    return null;
}
