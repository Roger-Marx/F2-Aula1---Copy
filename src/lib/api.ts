import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/env";
import { ERROR_MESSAGES, apiErrorMessage, errorStatus } from "@/lib/quiz/errors";

export function jsonOk<T extends object>(data: T) {
  return NextResponse.json(
    { ok: true, ...data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function jsonError(code: string, status = errorStatus(code)) {
  return NextResponse.json(
    { ok: false, code, message: apiErrorMessage(code) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  // Requisições sem Origin (curl, chamadas internas) não são CSRF de navegador.
  if (!origin) {
    return true;
  }

  const requestOrigin = new URL(request.url).origin;
  const allowed = new Set([requestOrigin, getSiteUrl()]);

  // Localhost só é aceito fora de produção; em produção vale a mesma origem
  // da requisição e NEXT_PUBLIC_SITE_URL.
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }

  return allowed.has(origin);
}

export function rpcPayloadError(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as { state?: unknown; code?: unknown };

  if (payload.state === "error" && typeof payload.code === "string") {
    return payload.code;
  }

  return null;
}

export function rpcErrorResponse(message: string | undefined) {
  if (!message) {
    return jsonError("INTERNAL", 500);
  }

  const code = (Object.keys(ERROR_MESSAGES) as Array<keyof typeof ERROR_MESSAGES>).find(
    (candidate) => message.includes(candidate),
  );

  return code ? jsonError(code) : jsonError("INTERNAL", 500);
}
