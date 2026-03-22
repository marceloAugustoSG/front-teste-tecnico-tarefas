import { HttpErrorResponse } from '@angular/common/http';

export function extrairProblemDetails(corpo: unknown): string | null {
  if (corpo === null || typeof corpo !== 'object') {
    if (typeof corpo === 'string' && corpo.trim().length > 0) {
      return corpo.trim().slice(0, 500);
    }
    return null;
  }
  const o = corpo as Record<string, unknown>;
  const detail = o['detail'];
  const title = o['title'];
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (typeof title === 'string' && title.trim()) return title.trim();
  return null;
}

export function mensagemErroHttp(
  err: unknown,
  fallbackRede: string,
  fallbackGenerico: string,
): string {
  if (err instanceof HttpErrorResponse) {
    const doCorpo = extrairProblemDetails(err.error);
    if (doCorpo) return doCorpo;
    if (err.status === 0) return fallbackRede;
  }
  return fallbackGenerico;
}
