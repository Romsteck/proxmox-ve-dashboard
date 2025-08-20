import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function parseBoolean(value: string | null, defaultValue: boolean): boolean {
  if (value === null) return defaultValue;
  const v = value.toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

async function getInsecureDispatcher(protocol: string, verifyTLS: boolean) {
  if (protocol === 'https' && verifyTLS === false) {
    try {
      // @ts-ignore - 'undici' est résolu à l'exécution par Next/Node (pas besoin de types locaux)
      const undici: any = await import('undici');
      return new undici.Agent({
        connect: { rejectUnauthorized: false },
      });
    } catch {
      // undici not available - proceed without custom dispatcher
      return undefined;
    }
  }
  return undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const host = params.get('host');
  const port = params.get('port') ?? '8006';
  const protocol = (params.get('protocol') ?? 'https').toLowerCase();
  const verifyTLS = parseBoolean(params.get('verifyTLS'), true);

  if (!host) {
    return NextResponse.json({ error: "Missing required parameter 'host'" }, { status: 400 });
  }

  if (protocol !== 'http' && protocol !== 'https') {
    return NextResponse.json({ error: "Invalid 'protocol' parameter. Expected 'http' or 'https'." }, { status: 400 });
  }

  const targetUrl = `${protocol}://${host}:${port}/api2/json/version`;

  const controller = new AbortController();
  const timeout = 10000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: RequestInit & { dispatcher?: any } = {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    };

    // Récupérer le token d'authentification depuis les headers Authorization de la requête entrante
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        Authorization: authHeader,
      };
    }

    const dispatcher = await getInsecureDispatcher(protocol, verifyTLS);
    if (dispatcher) {
      fetchOptions.dispatcher = dispatcher;
    }

    const response = await fetch(targetUrl, fetchOptions);

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    // Try to parse response body
    let body: any = null;
    try {
      body = isJson ? await response.json() : await response.text();
    } catch {
      // ignore parsing errors
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Upstream error',
          details: {
            status: response.status,
            statusText: response.statusText,
            body,
            targetUrl,
          },
        },
        { status: response.status }
      );
    }

    if (isJson && body != null) {
      return NextResponse.json(body, { status: response.status });
    }

    return NextResponse.json(
      {
        error: 'Invalid upstream response',
        details: { contentType, targetUrl },
      },
      { status: 502 }
    );
  } catch (err: any) {
    clearTimeout(timeoutId);
    const status = err?.name === 'AbortError' ? 504 : 502;
    const message = err?.name === 'AbortError' ? 'Upstream timeout' : err?.message || 'Upstream fetch failed';
    return NextResponse.json(
      { error: message, details: { targetUrl } },
      { status }
    );
  }
}