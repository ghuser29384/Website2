export function createEmailBackgroundHandler(options: {
 project: string | undefined;
 secret: string | undefined;
 createDeadline: () => {fetch: typeof fetch;signal: AbortSignal;check: () => void;close: () => void};
 createClient: (transport: typeof fetch) => unknown;
 processEmailOutbox: (request: Request, execution: import('../../../src/lib/email-outbox-core').EmailOutboxExecution) => Promise<Response>;
}): (request: Request) => Promise<Response>;
