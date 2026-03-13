/**
 * Export data to a CSV file and trigger download
 */
export function exportToCSV(
  data: Record<string, any>[],
  columns: { key: string; label: string; transform?: (value: any, row: any) => string }[],
  filename: string
) {
  if (data.length === 0) return;

  // Build header row
  const header = columns.map((col) => escapeCSV(col.label)).join(",");

  // Build data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = getNestedValue(row, col.key);
        const transformed = col.transform ? col.transform(value, row) : String(value ?? "");
        return escapeCSV(transformed);
      })
      .join(",")
  );

  const csvContent = [header, ...rows].join("\n");

  // Add BOM for Excel compatibility with UTF-8
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}
