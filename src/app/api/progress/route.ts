import { NextRequest } from 'next/server';
import { progressManager, ProgressEventData } from '@/lib/progress';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return new Response('Missing required "jobId" parameter', { status: 400 });
  }

  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connect notification
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ status: 'connected', jobId })}\n\n`)
      );

      // Subscribe to progress manager updates
      unsubscribe = progressManager.subscribe(jobId, (data: ProgressEventData) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          if (data.status === 'completed' || data.status === 'error') {
            // Give client time to receive final packet before closing stream
            setTimeout(() => {
              try {
                controller.close();
              } catch (e) {
                // ignore
              }
            }, 1000);
          }
        } catch (e) {
          // Stream might have been closed by client
        }
      });

      // Keepalive heartbeat every 15 seconds
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (e) {
          // ignore
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // For Nginx reverse proxies
    },
  });
}
