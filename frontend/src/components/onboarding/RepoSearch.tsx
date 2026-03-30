import { Search } from "lucide-react";

type RepoSearchProps = {
  value: string;
  onChange: (value: string) => void;
  visibleCount: number;
  totalCount: number;
  selectedCount: number;
};

export default function RepoSearch({ value, onChange, visibleCount, totalCount, selectedCount }: RepoSearchProps) {
  return (
    <>
      <div className="repo-search-row">
        <Search size={16} className="repo-search-icon" aria-hidden="true" />
        <input
          className="repo-search-input"
          placeholder="Search repositories..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <div className="repo-count-row">
        <span>{visibleCount} of {totalCount} repos</span>
        {selectedCount > 0 ? <span className="repo-count-selected">{selectedCount} selected</span> : null}
      </div>
    </>
  );
}
