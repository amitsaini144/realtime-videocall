import { Fragment } from 'react';

const TRAILING_PUNCTUATION = new Set([')', ']', '.', ',', '!', '?', ';', ':']);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function buildTokenRegex(knownNames: readonly string[]): RegExp {
  const names = Array.from(new Set(knownNames.filter(Boolean)))
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  const mentionAlt = names.length > 0 ? `@(?:${names.join('|')})` : String.raw`@\w+`;
  const urlAlt = String.raw`https?:\/\/\S+`;
  return new RegExp(String.raw`(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|\`[^\`\n]+\`|${urlAlt}|${mentionAlt})`, 'g');
}

function splitTrailingPunctuation(url: string): { url: string; trailing: string } {
  let end = url.length;
  while (end > 0 && TRAILING_PUNCTUATION.has(url[end - 1])) end -= 1;
  return { url: url.slice(0, end), trailing: url.slice(end) };
}

function renderLink(part: string, key: string): React.ReactNode {
  const { url, trailing } = splitTrailingPunctuation(part);
  return (
    <Fragment key={key}>
      <a href={url} target="_blank" rel="noopener noreferrer" className="underline break-all">
        {url}
      </a>
      {trailing}
    </Fragment>
  );
}

function renderMention(part: string, key: string, currentUsername?: string | null): React.ReactNode {
  const isSelf = !!currentUsername && part.slice(1).toLowerCase() === currentUsername.toLowerCase();
  return (
    <span key={key} className={isSelf ? 'font-semibold bg-yellow-200/70 rounded px-0.5' : 'font-semibold text-brand'}>
      {part}
    </span>
  );
}

function renderToken(part: string, key: string, currentUsername?: string | null): React.ReactNode {
  if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
    return <strong key={key}>{part.slice(1, -1)}</strong>;
  }
  if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
    return <em key={key}>{part.slice(1, -1)}</em>;
  }
  if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
    return <s key={key}>{part.slice(1, -1)}</s>;
  }
  if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
    return (
      <code key={key} className="px-1 py-0.5 rounded bg-black/10 text-[0.85em] font-mono">
        {part.slice(1, -1)}
      </code>
    );
  }
  if (/^https?:\/\//.test(part)) {
    return renderLink(part, key);
  }
  if (part.startsWith('@')) {
    return renderMention(part, key, currentUsername);
  }
  return part;
}

export function renderRichText(
  content: string,
  currentUsername?: string | null,
  knownUsernames: readonly string[] = [],
): React.ReactNode[] {
  const tokenRegex = buildTokenRegex(currentUsername ? [...knownUsernames, currentUsername] : knownUsernames);
  const parts = content.split(tokenRegex).filter(part => part !== '');

  return parts.map((part, i) => renderToken(part, `${i}-${part}`, currentUsername));
}

export function messageMentionsUser(content: string | undefined, username: string | null | undefined): boolean {
  if (!content || !username) return false;
  const regex = new RegExp(String.raw`@${escapeRegExp(username)}\b`, 'i');
  return regex.test(content);
}
