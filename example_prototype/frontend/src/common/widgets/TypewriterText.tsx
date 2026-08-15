import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export const TypewriterText = ({ text, speed = 15, onType }: { text: string; speed?: number; onType?: () => void }) => {
    const [displayedText, setDisplayedText] = useState('');
    const onTypeRef = useRef(onType);

    useEffect(() => {
        onTypeRef.current = onType;
    }, [onType]);

    useEffect(() => {
        const chars = Array.from(text);
        let i = 0;
        setDisplayedText('');
        const timer = setInterval(() => {
            if (i <= chars.length) {
                setDisplayedText(chars.slice(0, i).join(''));
                i++;
                if (onTypeRef.current) onTypeRef.current();
            } else {
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{displayedText}</ReactMarkdown>
        </div>
    );
};
