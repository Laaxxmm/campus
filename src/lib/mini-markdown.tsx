import { Fragment, type ReactNode } from "react";

/** Tiny renderer for question stems: fenced code blocks, `inline code`, **bold**, line breaks, x^2 → x². No HTML injection. */
export function renderStem(src: string): ReactNode {
  const parts = src.split(/```[a-zA-Z]*\n?/);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <pre key={i} className="my-2 overflow-x-auto rounded-md bg-text-900 p-3 text-sm leading-relaxed text-white">
        <code>{part.replace(/\n$/, "")}</code>
      </pre>
    ) : (
      <Fragment key={i}>{textBlock(part)}</Fragment>
    ),
  );
}

/** Plain lines, with runs of ≥2 "a | b" lines rendered as a small table (DI questions). */
function textBlock(part: string): ReactNode[] {
  const lines = part.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].includes("|") && lines[i + 1]?.includes("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) rows.push(lines[i++].split("|").map((c) => c.trim()));
      const [head, ...body] = rows;
      out.push(
        <div key={`t${i}`} className="my-2 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead><tr>{head.map((c, k) => <th key={k} scope="col" className="border border-border bg-surface px-2 py-1 text-left font-semibold">{inline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, k) => <tr key={k}>{r.map((c, m) => <td key={m} className="border border-border px-2 py-1 tabular">{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    out.push(<Fragment key={`l${i}`}>{inline(lines[i])}{i < lines.length - 1 && !lines[i + 1]?.includes("|") ? <br /> : null}</Fragment>);
    i++;
  }
  return out;
}

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
function inline(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const text = (s: string) => s.replace(/\^(\d+)/g, (_, d: string) => [...d].map((c) => SUP[c]).join(""));
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(text(line.slice(last, m.index)));
    const tok = m[0];
    out.push(tok.startsWith("`") ? <code key={k++} className="rounded bg-surface px-1 font-mono text-[0.95em]">{tok.slice(1, -1)}</code> : <strong key={k++}>{tok.slice(2, -2)}</strong>);
    last = m.index + tok.length;
  }
  if (last < line.length) out.push(text(line.slice(last)));
  return out;
}
