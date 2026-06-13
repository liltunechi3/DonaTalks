import React from "react";

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ color: "#1E3832", fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function PriorityBadge({ level }: { level: string }) {
  const upper = level.toUpperCase().trim();
  let bg = "#d1fae5", color = "#065f46";
  if (upper === "HIGH") { bg = "#fee2e2"; color = "#991b1b"; }
  else if (upper === "MEDIUM") { bg = "#fef3c7"; color = "#92400e"; }
  return (
    <span style={{ backgroundColor: bg, color, padding: "2px 10px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em" }}>
      {upper}
    </span>
  );
}

function FindingBlock({ lines }: { lines: string[] }) {
  const fields: Record<string, string> = {};
  let currentKey = "";
  let currentVal: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(TEMUAN|ANALISA|DAMPAK|REKOMENDASI|PRIORITAS):\s*(.*)/);
    if (match) {
      if (currentKey) fields[currentKey] = currentVal.join(" ").trim();
      currentKey = match[1];
      currentVal = [match[2]];
    } else if (currentKey && line.trim()) {
      currentVal.push(line.trim());
    }
  }
  if (currentKey) fields[currentKey] = currentVal.join(" ").trim();

  if (!fields.TEMUAN && !fields.ANALISA) return null;

  const rows = [
    { key: "TEMUAN", label: "Temuan" },
    { key: "ANALISA", label: "Analisa" },
    { key: "DAMPAK", label: "Dampak" },
    { key: "REKOMENDASI", label: "Rekomendasi" },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      style={{ border: "1px solid #e8e0d0" }}
    >
      {rows.map(({ key, label }) =>
        fields[key] ? (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "110px 1fr",
              borderBottom: "1px solid #f0ebe0",
            }}
          >
            <div
              style={{
                backgroundColor: "#f8f5ee",
                padding: "10px 14px",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#8a7a60",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              {label}
            </div>
            <div style={{ padding: "10px 14px", fontSize: "0.9rem", lineHeight: 1.7, color: "#2d4a44" }}>
              {renderInline(fields[key])}
            </div>
          </div>
        ) : null
      )}
      {fields.PRIORITAS && (
        <div style={{ padding: "8px 14px", backgroundColor: "#fafaf8" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "#8a7a60", textTransform: "uppercase", marginRight: 8 }}>
            Prioritas
          </span>
          <PriorityBadge level={fields.PRIORITAS} />
        </div>
      )}
    </div>
  );
}

function BeforeAfterBlock({ before, after }: { before: string; after: string }) {
  return (
    <div className="space-y-2 mb-4">
      <div style={{ backgroundColor: "#fef2f2", borderLeft: "3px solid #dc2626", padding: "10px 14px", borderRadius: "0 8px 8px 0" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "#dc2626", marginBottom: 4, textTransform: "uppercase" }}>
          Sebelum
        </div>
        <p style={{ fontSize: "0.9rem", color: "#7f1d1d", fontStyle: "italic", lineHeight: 1.6 }}>
          {before.replace(/^[""]|[""]$/g, "")}
        </p>
      </div>
      <div style={{ backgroundColor: "#f0fdf4", borderLeft: "3px solid #16a34a", padding: "10px 14px", borderRadius: "0 8px 8px 0" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "#16a34a", marginBottom: 4, textTransform: "uppercase" }}>
          Sesudah
        </div>
        <p style={{ fontSize: "0.9rem", color: "#14532d", lineHeight: 1.6 }}>
          {after.replace(/^[""]|[""]$/g, "")}
        </p>
      </div>
    </div>
  );
}

function ScoreTable({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return <p style={{ color: "#2d4a44" }}>{content}</p>;

  const parseRow = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div className="overflow-x-auto">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
        <thead>
          <tr style={{ backgroundColor: "#1E3832" }}>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{ padding: "10px 14px", color: "#C4A35A", fontWeight: 600, textAlign: "left", fontSize: "0.8rem", letterSpacing: "0.04em" }}
              >
                {h.replace(/\*\*/g, "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f8f6f1" : "#fff", borderBottom: "1px solid #e8e0d0" }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "10px 14px",
                    color: row[0]?.includes("TOTAL") ? "#1E3832" : "#2d4a44",
                    fontWeight: row[0]?.includes("TOTAL") ? 700 : 400,
                  }}
                >
                  {cell.replace(/\*\*/g, "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalysisContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H1 heading
    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={i}
          className="font-display"
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "#1E3832",
            borderBottom: "2px solid #C4A35A",
            paddingBottom: "0.5rem",
            marginTop: "2.5rem",
            marginBottom: "1rem",
          }}
        >
          {line.slice(2)}
        </h1>
      );
      i++;
      continue;
    }

    // H2 heading
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="font-display"
          style={{
            fontSize: "1.05rem",
            fontWeight: 600,
            color: "#1E3832",
            marginTop: "1.75rem",
            marginBottom: "0.75rem",
            paddingLeft: "0.75rem",
            borderLeft: "3px solid #C4A35A",
          }}
        >
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // H3 heading
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#1E3832",
            marginTop: "1.25rem",
            marginBottom: "0.5rem",
          }}
        >
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Finding block (TEMUAN/ANALISA/etc)
    if (/^(TEMUAN|ANALISA|DAMPAK|REKOMENDASI|PRIORITAS):/.test(line)) {
      const blockLines: string[] = [];
      while (i < lines.length && (lines[i].trim() || /^(TEMUAN|ANALISA|DAMPAK|REKOMENDASI|PRIORITAS):/.test(lines[i]))) {
        if (!lines[i].trim() && blockLines.length > 0) break;
        if (lines[i].trim()) blockLines.push(lines[i]);
        i++;
      }
      elements.push(<FindingBlock key={`finding-${i}`} lines={blockLines} />);
      continue;
    }

    // SEBELUM/SESUDAH block
    if (line.startsWith("SEBELUM:")) {
      const before = line.slice(8).trim();
      const nextLine = lines[i + 1] || "";
      if (nextLine.startsWith("SESUDAH:")) {
        const after = nextLine.slice(8).trim();
        elements.push(<BeforeAfterBlock key={`ba-${i}`} before={before} after={after} />);
        i += 2;
        continue;
      }
    }

    // Markdown table (score table)
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={`table-${i}`} className="my-4 rounded-xl overflow-hidden" style={{ border: "1px solid #e8e0d0" }}>
          <ScoreTable content={tableLines.join("\n")} />
        </div>
      );
      continue;
    }

    // Bullet list item
    if (line.startsWith("- ") || line.startsWith("• ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("• "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ marginBottom: "1rem", paddingLeft: "1.25rem" }}>
          {items.map((item, j) => (
            <li key={j} style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "#2d4a44", marginBottom: "0.25rem", listStyleType: "disc" }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          {items.map((item, j) => (
            <li key={j} style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "#2d4a44", marginBottom: "0.25rem", listStyleType: "decimal" }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} style={{ fontSize: "0.95rem", lineHeight: 1.85, color: "#2d4a44", marginBottom: "0.9rem" }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
}
