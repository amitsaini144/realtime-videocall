'use client'

interface MentionAutocompleteProps {
  candidates: string[];
  query: string;
  onSelect: (username: string) => void;
}

export default function MentionAutocomplete({ candidates, query, onSelect }: Readonly<MentionAutocompleteProps>) {
  const matches = candidates.filter(name => name.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5);
  if (matches.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 p-1.5 z-10">
      {matches.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          className="w-full text-left text-sm px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-700"
        >
          @{name}
        </button>
      ))}
    </div>
  );
}
