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
// 加固：① 跳过纯分隔符区块（如 ======== A ========）；
//       ② 从任意位置提取「—出处」与「#标签」，不再要求末行。
export function parseTimestampNotes(text: string): ApiNote[] {
  const timeRegex = /^(\d{4}[-./]\d{2}[-./]\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\s*$/gm;
  const matches = [...text.matchAll(timeRegex)];
  if (matches.length === 0) return [];

  const sourceRegex = /^\s*(?:——|--|—)\s*(.+)$/;
  // 标签 token：# 后接任意非空白字符（允许中文标点/引号，如 #爱，有时也是一种伤害）
  const tagTokenRegex = /#(\S+)/g;

  const notes: ApiNote[] = [];
  matches.forEach((match, i) => {
    const timestamp = match[1];
    const startIndex = (match.index as number) + match[0].length;
    const endIndex = i < matches.length - 1 ? (matches[i + 1].index as number) : text.length;
    const rawContent = text.substring(startIndex, endIndex).trim();

    const lines = rawContent.split('\n').map((l) => l.trim()).filter(Boolean);
    const contentLines: string[] = [];
    let source: string | undefined = undefined;
    const tagSet = new Set<string>();

    const extractTags = (s: string) => {
      const toks = s.match(tagTokenRegex);
      if (toks) toks.forEach((t) => tagSet.add(t.slice(1)));
    };

    for (const line of lines) {
      // 1. 出处行（— / -- / —— 开头）
      const sMatch = line.match(sourceRegex);
      if (sMatch) {
        const s = sMatch[1].trim().replace(/^出处\s*/, '');
        source = source ? `${source}；${s}` : s;
        continue;
      }
      // 2. 整行以 # 开头 → 整行都是标签（支持中文标点/引号）
      if (/^#\S/.test(line)) {
        extractTags(line);
        continue;
      }
      // 3. 行尾内联标签（如「正文 #标签」），允许中文标点
      const tMatch = line.match(/(?:\s)#(\S+)$/u);
      if (tMatch) {
        tagSet.add(tMatch[1]);
        const rest = line.slice(0, tMatch.index).trim();
        if (rest) contentLines.push(rest);
        continue;
      }
      contentLines.push(line);
    }

    let content = contentLines.join('\n').trim();
    // 兼容多行拼接后末尾仍残留的内联标签
    const itMatch = content.match(/(?:\s)#(\S+)$/u);
    if (itMatch) {
      tagSet.add(itMatch[1]);
      content = content.substring(0, itMatch.index).trim();
    }

    // 跳过纯分隔符区块
    if (isDividerContent(content)) return;

    notes.push({
      id: genId('note'),
      timestamp,
      content,
      tags: [...tagSet],
      source
    });
  });

  return notes;
}

// 判断一段内容是否只是章节分隔符（如 ========A========），应被跳过
function isDividerContent(content: string): boolean {
  const nonEmpty = content.split('\n').map((l) => l.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return true;
  const real = nonEmpty.filter((l) => !/^=+$/.test(l));
  if (real.length === 0) return true;
  // 去掉 = 行后只剩 ≤2 个短字母/单字（如章节字母 A/B/C）
  return real.length <= 2 && real.every((l) => /^[A-Za-z一-龥]{1,4}$/.test(l));
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
