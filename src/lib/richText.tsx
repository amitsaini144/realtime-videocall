const TOKEN_REGEX = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|@\w+)/g;

export function renderRichText(content: string, currentUsername?: string | null): React.ReactNode[] {
  const parts = content.split(TOKEN_REGEX).filter(part => part !== '');

  return parts.map((part, i) => {
    const key = `${i}-${part}`;

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={key} className="px-1 py-0.5 rounded bg-black/10 text-[0.85em] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('@')) {
      const isSelf = !!currentUsername && part.slice(1).toLowerCase() === currentUsername.toLowerCase();
      return (
        <span key={key} className={isSelf ? 'font-semibold bg-yellow-200/70 rounded px-0.5' : 'font-semibold text-brand'}>
          {part}
        </span>
      );
    }
    return part;
  });
}

export function messageMentionsUser(content: string | undefined, username: string | null | undefined): boolean {
  if (!content || !username) return false;
  const regex = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return regex.test(content);
}
