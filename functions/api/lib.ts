// Shared helpers for inBoxCard Pages Functions.
// (This file lives under functions/ and is compiled by Cloudflare, not by the SPA's tsc.)

export interface ApiNote {
  id: string;
  timestamp: string;
  content: string;
  tags?: string[];
  source?: string;
}

export function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export function requireAdmin(request: Request, env: any): Response | null {
  const url = new URL(request.url);
  const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
  if (!env.ADMIN_KEY) {
    return json({ error: 'ADMIN_KEY 未配置' }, 500);
  }
  if (key !== env.ADMIN_KEY) {
    return json({ error: '未授权' }, 401);
  }
  return null;
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Ported from utils/parser.ts — parses inBox "timestamp note" text into rows.
export function parseTimestampNotes(text: string): ApiNote[] {
  const timeRegex = /^(\d{4}[-./]\d{2}[-./]\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\s*$/gm;
  const matches = [...text.matchAll(timeRegex)];
  if (matches.length === 0) return [];

  const notes: ApiNote[] = [];
  matches.forEach((match, i) => {
    const timestamp = match[1];
    const startIndex = (match.index as number) + match[0].length;
    const endIndex = i < matches.length - 1 ? (matches[i + 1].index as number) : text.length;
    let rawContent = text.substring(startIndex, endIndex).trim();

    // 1. Tags
    let tags: string[] = [];
    const tagRegex = /(#[\p{L}\p{N}_\/-]+(\s+|$))+$/u;
    const tagMatch = rawContent.match(tagRegex);
    if (tagMatch) {
      const tagString = tagMatch[0];
      rawContent = rawContent.substring(0, tagMatch.index as number).trim();
      tags = tagString.split(/\s+/).filter((t) => t.startsWith('#')).map((t) => t.slice(1));
    }

    // 2. Source line (—— / -- / —)
    let source: string | undefined = undefined;
    const lines = rawContent.split('\n').filter((line) => line.trim() !== '');
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1].trim();
      const sourceRegex = /^\s*(?:——|--|—)\s*(.+)$/;
      const sourceMatch = lastLine.match(sourceRegex);
      if (sourceMatch) {
        source = sourceMatch[1].trim();
        lines.pop();
        rawContent = lines.join('\n').trim();
      }
    }

    notes.push({
      id: genId('note'),
      timestamp,
      content: rawContent,
      tags,
      source
    });
  });

  return notes;
}

export function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
