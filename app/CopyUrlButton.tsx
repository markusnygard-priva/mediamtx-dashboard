import React from "react";

interface CopyUrlButtonProps {
  url: string;
}

export function CopyUrlButton({ url }: CopyUrlButtonProps) {
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      alert("Copy to clipboard failed. Please copy manually:\n" + url);
    }
  };
  return (
    <button
      style={{ fontSize: "0.75rem", height: "2rem", minHeight: "2rem", padding: "0 12px", borderRadius: "4px", border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", display: "flex", alignItems: "center" }}
      onClick={handleCopy}
    >
      copy URL
    </button>
  );
}
