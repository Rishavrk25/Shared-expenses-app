import fs from "fs";
import csv from "csv-parser";

/**
 * Parse a CSV file and return an array of row objects.
 * Each row is a raw object with keys from the CSV headers.
 */
export function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const rows = [];
        let rowNumber = 0;

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => {
                rowNumber++;
                rows.push({ rowNumber, ...row });
            })
            .on("end", () => {
                resolve(rows);
            })
            .on("error", (err) => {
                reject(err);
            });
    });
}

/**
 * Map raw CSV row to a normalized structure.
 * Handles various possible CSV column names.
 */
export function mapRow(raw) {
    return {
        rowNumber: raw.rowNumber,
        date: raw.date || raw.Date || raw.DATE || raw.expense_date || null,
        title: raw.title || raw.Title || raw.TITLE || raw.description || raw.Description || null,
        amount: raw.amount || raw.Amount || raw.AMOUNT || null,
        currency: raw.currency || raw.Currency || raw.CURRENCY || null,
        paidBy: raw.paid_by || raw.paidBy || raw.PaidBy || raw.Paid_By || raw["Paid By"] || null,
        splitType: raw.split_type || raw.splitType || raw.SplitType || raw["Split Type"] || null,
        splitDetails: raw.split_details || raw.splitDetails || raw.SplitDetails || raw["Split Details"] || null,
    };
}
