import {SolrDoc} from "@/types.ts";

type SearchResultProps = {
  doc: SolrDoc
  onClick: (doc: SolrDoc) => void

}
const SearchResult = ({doc,onClick}:SearchResultProps) => {
  return (
      <li
        style={{
          marginBottom: "10px",
          padding: "10px",
          border: "1px solid #eee",
          cursor: "pointer",
          backgroundColor: "#fff",
        }}
        onClick={() => onClick(doc)}
      >
        <div
          style={{
            fontWeight: "bold",
            fontSize: "14px",
            wordBreak: "break-all",
          }}
        >
          {doc.url}
        </div>
        <div style={{ fontSize: "12px", color: "#666" }}>
          {doc.crawl_date || doc.wayback_date}
        </div>
        <div style={{ fontSize: "12px", color: "#888" }}>
          {doc.content_type}
        </div>
      </li>
  );
};

export default SearchResult;