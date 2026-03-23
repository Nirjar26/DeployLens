type RepoSearchProps = {
  value: string;
  onChange: (value: string) => void;
  visibleCount: number;
  totalCount: number;
};

export default function RepoSearch({ value, onChange, visibleCount, totalCount }: RepoSearchProps) {
  return (
    <div className="repo-search-row">
      <input
        className="repo-search-input"
        placeholder="Search repositories..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="repo-search-count">{visibleCount} of {totalCount} repos</span>
    </div>
  );
}
