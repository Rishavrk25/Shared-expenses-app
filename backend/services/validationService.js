/**
 * Normalize a single row's data before anomaly detection.
 * Preserves raw values as _raw* fields for normalization detection.
 */
export function normalizeRow(row) {
    return {
        ...row,
        // Preserve raw values for anomaly detection
        _rawPaidBy: row.paidBy,
        _rawDate: row.date,
        // Name normalization: "priya" / "PRIYA" → "Priya"
        paidBy: normalizeName(row.paidBy),
        // Amount normalization: "1,200" → 1200
        amount: normalizeAmount(row.amount),
        // Currency normalization: "usd" → "USD"
        currency: normalizeCurrency(row.currency),
        // Date normalization: various formats → "YYYY-MM-DD"
        date: normalizeDate(row.date),
        // Title: trim whitespace
        title: row.title ? row.title.trim() : null,
        // Split details: trim
        splitDetails: row.splitDetails ? row.splitDetails.trim() : null,
        // Split type: lowercase trim
        splitType: row.splitType ? row.splitType.trim().toLowerCase() : null,
    };
}

function normalizeName(name) {
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    // Capitalize first letter of each word
    return trimmed
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function normalizeAmount(amount) {
    if (amount === null || amount === undefined || amount === "") return null;
    // Remove commas and whitespace, then parse
    const cleaned = String(amount).replace(/,/g, "").replace(/\s/g, "").trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
}

function normalizeCurrency(currency) {
    if (!currency) return null;
    return currency.trim().toUpperCase();
}

function normalizeDate(dateStr) {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    let date;

    // Try YYYY-MM-DD (ISO format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        date = new Date(trimmed + "T00:00:00");
    }
    // Try DD/MM/YYYY
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
        const [day, month, year] = trimmed.split("/");
        date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00`);
    }
    // Try DD-MM-YYYY
    else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
        const [day, month, year] = trimmed.split("-");
        date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00`);
    }
    // Try other parseable formats
    else {
        date = new Date(trimmed);
    }

    if (isNaN(date.getTime())) return null;

    // Return YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
