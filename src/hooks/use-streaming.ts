import { useState, useCallback } from 'react';
export function useStreaming() {
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const onChunk = useCallback((chunk: string) => {
    setStreamingMessage((prev) => prev + chunk);
  }, []);
  const startStream = useCallback(() => {
    setIsStreaming(true);
    setStreamingMessage('');
  }, []);
  const endStream = useCallback(() => {
    setIsStreaming(false);
    setStreamingMessage('');
  }, []);
  return {
    streamingMessage,
    isStreaming,
    onChunk,
    startStream,
    endStream,
  };
}