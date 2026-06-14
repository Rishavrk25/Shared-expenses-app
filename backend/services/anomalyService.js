import pool from "../config/db.js";

/**
 * Store a single anomaly in the import_anomalies table.
 */
export async function storeAnomaly(importJobId, anomaly) {
    await pool.query(
        `INSERT INTO import_anomalies(import_job_id, row_number, anomaly_type, description, action_taken, severity)
         VALUES($1, $2, $3, $4, $5, $6)`,
        [importJobId, anomaly.rowNumber, anomaly.anomalyType, anomaly.description, anomaly.actionTaken || null, anomaly.severity]
    );
}

/**
 * Store multiple anomalies for an import job.
 */
export async function storeAnomalies(importJobId, anomalies) {
    for (const anomaly of anomalies) {
        await storeAnomaly(importJobId, anomaly);
    }
}

/**
 * Fetch all anomalies for an import job.
 */
export async function getAnomalies(importJobId) {
    const result = await pool.query(
        `SELECT id, row_number, anomaly_type, description, action_taken, severity
         FROM import_anomalies
         WHERE import_job_id = $1
         ORDER BY row_number ASC`,
        [importJobId]
    );
    return result.rows;
}

/**
 * Build context needed for advanced anomaly detection.
 * Fetches users, membership history, and existing expenses from DB.
 */
export async function buildDetectionContext(groupId) {
    // Fetch all users
    const usersResult = await pool.query("SELECT id, name FROM users");
    const users = usersResult.rows;
    const userNameMap = {};
    for (const u of users) {
        userNameMap[u.name.toLowerCase()] = u;
    }

    // Fetch membership history for the group (if groupId provided)
    let membershipHistory = [];
    if (groupId) {
        const historyResult = await pool.query(
            `SELECT user_id, joined_at, left_at, u.name
             FROM membership_history mh
             JOIN users u ON mh.user_id = u.id
             WHERE mh.group_id = $1`,
            [groupId]
        );
        membershipHistory = historyResult.rows;
    }

    // Fetch existing expenses for duplicate detection
    let existingExpenses = [];
    if (groupId) {
        const expResult = await pool.query(
            `SELECT e.title, e.amount, e.expense_date, u.name AS payer_name
             FROM expenses e
             JOIN users u ON e.paid_by = u.id
             WHERE e.group_id = $1`,
            [groupId]
        );
        existingExpenses = expResult.rows;
    }

    // Fetch currencies used in the group
    let groupCurrencies = new Set();
    if (groupId) {
        const currResult = await pool.query(
            "SELECT DISTINCT currency FROM expenses WHERE group_id = $1",
            [groupId]
        );
        for (const row of currResult.rows) {
            groupCurrencies.add(row.currency);
        }
    }

    return {
        users,
        userNameMap,
        membershipHistory,
        existingExpenses,
        groupCurrencies,
        processedRows: [], // tracks rows within current CSV for intra-file duplicate detection
    };
}

/**
 * Detect all anomalies for a single normalized row.
 * @param {Object} row - Normalized row data
 * @param {Object} context - Detection context from buildDetectionContext()
 * @returns {Array} Array of anomaly objects
 */
export function detectAnomalies(row, context) {
    const anomalies = [];

    // Anomaly 1: DUPLICATE_EXPENSE
    detectDuplicateExpense(row, context, anomalies);

    // Anomaly 2: SETTLEMENT_AS_EXPENSE
    detectSettlementAsExpense(row, anomalies);

    // Anomaly 3: INACTIVE_MEMBER
    detectInactiveMember(row, context, anomalies);

    // Anomaly 4: AMBIGUOUS_DATE
    detectAmbiguousDate(row, anomalies);

    // Anomaly 5: MULTI_CURRENCY (Currency Conflict)
    detectCurrencyConflict(row, context, anomalies);

    // Anomaly 6: SPLIT_MISMATCH
    detectSplitMismatch(row, anomalies);

    // Anomaly 7: UNKNOWN_PARTICIPANT
    detectUnknownParticipant(row, context, anomalies);

    // Anomaly 8: NEGATIVE_AMOUNT
    detectNegativeAmount(row, anomalies);

    // Anomaly 9: ZERO_AMOUNT
    detectZeroAmount(row, anomalies);

    // Anomaly 10: MISSING_CURRENCY
    detectMissingCurrency(row, anomalies);

    // Anomaly 11: NORMALIZED_USER (Name Normalization)
    detectNormalizedUser(row, context, anomalies);

    // Anomaly 12: SPLIT_TYPE_CONFLICT
    detectSplitTypeConflict(row, anomalies);

    // Basic anomalies (from Step 10)
    detectMissingAmount(row, anomalies);
    detectMissingPayer(row, context, anomalies);
    detectInvalidDate(row, anomalies);

    // Track this row for intra-CSV duplicate detection
    if (row.date && row.amount && row.paidBy) {
        context.processedRows.push({
            date: row.date,
            amount: row.amount,
            paidBy: row.paidBy?.toLowerCase(),
            title: row.title?.toLowerCase(),
        });
    }

    return anomalies;
}

// ─── Anomaly Detectors ───────────────────────────────────────────────

/**
 * Anomaly 1: DUPLICATE_EXPENSE
 * Same date + same amount + same payer (in DB or within CSV)
 */
function detectDuplicateExpense(row, context, anomalies) {
    if (!row.date || !row.amount || !row.paidBy) return;

    const key = {
        date: row.date,
        amount: Number(row.amount),
        paidBy: row.paidBy.toLowerCase(),
    };

    // Check against existing DB expenses
    const dbDuplicate = context.existingExpenses.find(
        (e) =>
            String(e.expense_date).substring(0, 10) === key.date &&
            Number(e.amount) === key.amount &&
            e.payer_name.toLowerCase() === key.paidBy
    );

    if (dbDuplicate) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "DUPLICATE_EXPENSE",
            description: `Possible duplicate: "${row.title}" matches existing expense on ${row.date} for ${row.amount} paid by ${row.paidBy}`,
            actionTaken: "Flagged for review - not imported",
            severity: "WARNING",
        });
        return;
    }

    // Check against already-processed rows in this CSV
    const csvDuplicate = context.processedRows.find(
        (p) =>
            p.date === key.date &&
            Number(p.amount) === key.amount &&
            p.paidBy === key.paidBy
    );

    if (csvDuplicate) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "DUPLICATE_EXPENSE",
            description: `Possible duplicate within CSV: "${row.title}" has same date, amount, and payer as another row`,
            actionTaken: "Flagged for review - not imported",
            severity: "WARNING",
        });
    }
}

/**
 * Anomaly 2: SETTLEMENT_AS_EXPENSE
 * Title contains settlement keywords
 */
function detectSettlementAsExpense(row, anomalies) {
    if (!row.title) return;

    const settlementKeywords = [
        "paid back", "pay back", "payback",
        "reimbursement", "reimburse", "reimbursed",
        "settlement", "settle", "settled",
        "returned", "return money",
        "repaid", "repay",
    ];

    const titleLower = row.title.toLowerCase();
    const matchedKeyword = settlementKeywords.find((kw) => titleLower.includes(kw));

    if (matchedKeyword) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "SETTLEMENT_AS_EXPENSE",
            description: `Title "${row.title}" contains settlement keyword "${matchedKeyword}"`,
            actionTaken: "Converted to settlement",
            severity: "WARNING",
        });
    }
}

/**
 * Anomaly 3: INACTIVE_MEMBER
 * Participant wasn't active on the expense date per membership_history
 */
function detectInactiveMember(row, context, anomalies) {
    if (!row.date || !row.paidBy || context.membershipHistory.length === 0) return;

    // Check payer
    const payerHistory = context.membershipHistory.filter(
        (h) => h.name.toLowerCase() === row.paidBy.toLowerCase()
    );

    if (payerHistory.length > 0) {
        const wasActive = payerHistory.some((h) => {
            const joined = new Date(h.joined_at);
            const left = h.left_at ? new Date(h.left_at) : null;
            const expDate = new Date(row.date);
            return expDate >= joined && (!left || expDate <= left);
        });

        if (!wasActive) {
            anomalies.push({
                rowNumber: row.rowNumber,
                anomalyType: "INACTIVE_MEMBER",
                description: `Payer "${row.paidBy}" was not an active member on ${row.date}`,
                actionTaken: "Flagged - expense may be invalid",
                severity: "ERROR",
            });
        }
    }

    // Check participants from splitDetails if available
    if (row.splitDetails) {
        const participants = parseSplitParticipants(row.splitDetails);
        for (const pName of participants) {
            const memberHistory = context.membershipHistory.filter(
                (h) => h.name.toLowerCase() === pName.toLowerCase()
            );

            if (memberHistory.length > 0) {
                const wasActive = memberHistory.some((h) => {
                    const joined = new Date(h.joined_at);
                    const left = h.left_at ? new Date(h.left_at) : null;
                    const expDate = new Date(row.date);
                    return expDate >= joined && (!left || expDate <= left);
                });

                if (!wasActive) {
                    anomalies.push({
                        rowNumber: row.rowNumber,
                        anomalyType: "INACTIVE_MEMBER",
                        description: `Participant "${pName}" was not an active member on ${row.date}`,
                        actionTaken: "Flagged - participant may need to be excluded",
                        severity: "ERROR",
                    });
                }
            }
        }
    }
}

/**
 * Anomaly 4: AMBIGUOUS_DATE
 * Dates like 04/05/2026 where day and month are both ≤ 12
 */
function detectAmbiguousDate(row, anomalies) {
    if (!row._rawDate) return;

    const raw = row._rawDate.trim();
    // Match patterns like DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);

    if (slashMatch) {
        const first = parseInt(slashMatch[1], 10);
        const second = parseInt(slashMatch[2], 10);

        // Ambiguous if both values are ≤ 12 (could be either day or month)
        if (first <= 12 && second <= 12 && first !== second) {
            anomalies.push({
                rowNumber: row.rowNumber,
                anomalyType: "AMBIGUOUS_DATE",
                description: `Date "${raw}" is ambiguous - could be ${first}/${second} (MM/DD) or ${second}/${first} (DD/MM)`,
                actionTaken: "Interpreted as DD/MM/YYYY format",
                severity: "WARNING",
            });
        }
    }
}

/**
 * Anomaly 5: MULTI_CURRENCY (Currency Conflict)
 * Expense uses a different currency than what's already in the group
 */
function detectCurrencyConflict(row, context, anomalies) {
    if (!row.currency) return;

    const currency = row.currency.toUpperCase();

    // Add current row's currency to track within CSV
    if (context.groupCurrencies.size > 0 && !context.groupCurrencies.has(currency)) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "MULTI_CURRENCY",
            description: `Currency "${currency}" differs from group currencies: ${[...context.groupCurrencies].join(", ")}`,
            actionTaken: "Exchange rate required",
            severity: "WARNING",
        });
    }

    // Track for intra-CSV detection
    context.groupCurrencies.add(currency);
}

/**
 * Anomaly 6: SPLIT_MISMATCH
 * Sum of shares doesn't equal the total amount
 */
function detectSplitMismatch(row, anomalies) {
    if (!row.amount || !row.splitDetails) return;

    const shares = parseSplitAmounts(row.splitDetails);
    if (shares.length === 0) return;

    const totalShares = shares.reduce((sum, s) => sum + s, 0);
    const amount = Number(row.amount);

    if (Math.abs(totalShares - amount) > 0.01) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "SPLIT_MISMATCH",
            description: `Split total (${totalShares}) does not equal expense amount (${amount})`,
            actionTaken: "Flagged - shares need correction",
            severity: "ERROR",
        });
    }
}

/**
 * Anomaly 7: UNKNOWN_PARTICIPANT
 * A participant in split details is not found in the users table
 */
function detectUnknownParticipant(row, context, anomalies) {
    if (!row.splitDetails) return;

    const participants = parseSplitParticipants(row.splitDetails);

    for (const name of participants) {
        if (!context.userNameMap[name.toLowerCase()]) {
            anomalies.push({
                rowNumber: row.rowNumber,
                anomalyType: "UNKNOWN_PARTICIPANT",
                description: `Participant "${name}" not found in the system`,
                actionTaken: "Flagged - user needs to be registered",
                severity: "ERROR",
            });
        }
    }
}

/**
 * Anomaly 8: NEGATIVE_AMOUNT
 */
function detectNegativeAmount(row, anomalies) {
    if (row.amount === null || row.amount === undefined) return;
    if (Number(row.amount) < 0) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "NEGATIVE_AMOUNT",
            description: `Amount is negative: ${row.amount}`,
            actionTaken: "Treat as refund candidate",
            severity: "WARNING",
        });
    }
}

/**
 * Anomaly 9: ZERO_AMOUNT
 */
function detectZeroAmount(row, anomalies) {
    if (row.amount === null || row.amount === undefined) return;
    if (Number(row.amount) === 0) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "ZERO_AMOUNT",
            description: "Amount is zero",
            actionTaken: "Skipped - zero amount expense",
            severity: "WARNING",
        });
    }
}

/**
 * Anomaly 10: MISSING_CURRENCY
 */
function detectMissingCurrency(row, anomalies) {
    if (!row.currency) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "MISSING_CURRENCY",
            description: "Currency field is empty",
            actionTaken: "Default currency (INR) will be applied",
            severity: "WARNING",
        });
    }
}

/**
 * Anomaly 11: NORMALIZED_USER
 * Name was normalized (e.g., "priya" → "Priya")
 */
function detectNormalizedUser(row, context, anomalies) {
    if (!row.paidBy || !row._rawPaidBy) return;

    const raw = row._rawPaidBy.trim();
    const normalized = row.paidBy;

    if (raw !== normalized && raw.toLowerCase() === normalized.toLowerCase()) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "NORMALIZED_USER",
            description: `User name "${raw}" was normalized to "${normalized}"`,
            actionTaken: `Mapped to ${normalized}`,
            severity: "INFO",
        });
    }
}

/**
 * Anomaly 12: SPLIT_TYPE_CONFLICT
 * Split type is "equal" but split_details with specific amounts exists
 */
function detectSplitTypeConflict(row, anomalies) {
    if (!row.splitType) return;

    const splitTypeLower = row.splitType.toLowerCase();

    if (splitTypeLower === "equal" && row.splitDetails) {
        const amounts = parseSplitAmounts(row.splitDetails);
        if (amounts.length > 0) {
            // Check if the amounts are actually unequal
            const allEqual = amounts.every((a) => Math.abs(a - amounts[0]) < 0.01);
            if (!allEqual) {
                anomalies.push({
                    rowNumber: row.rowNumber,
                    anomalyType: "SPLIT_TYPE_CONFLICT",
                    description: `Split type is "equal" but split details contain unequal amounts`,
                    actionTaken: "Using exact amounts from split details",
                    severity: "WARNING",
                });
            }
        }
    }
}

// ─── Basic Anomalies (from Step 10) ─────────────────────────────────

function detectMissingAmount(row, anomalies) {
    if (row.amount === null || row.amount === undefined) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "MISSING_AMOUNT",
            description: "Amount field is empty or invalid",
            actionTaken: "Row cannot be imported",
            severity: "ERROR",
        });
    }
}

function detectMissingPayer(row, context, anomalies) {
    if (!row.paidBy) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "MISSING_PAYER",
            description: "Paid by field is empty",
            actionTaken: "Row cannot be imported",
            severity: "ERROR",
        });
    } else if (!context.userNameMap[row.paidBy.toLowerCase()]) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "UNKNOWN_USER",
            description: `Payer "${row.paidBy}" not found in the system`,
            actionTaken: "Flagged - user needs to be registered",
            severity: "ERROR",
        });
    }
}

function detectInvalidDate(row, anomalies) {
    if (!row.date) {
        anomalies.push({
            rowNumber: row.rowNumber,
            anomalyType: "INVALID_DATE",
            description: "Date is missing or could not be parsed",
            actionTaken: "Row cannot be imported",
            severity: "ERROR",
        });
    }
}

// ─── Helper: Parse Split Details ─────────────────────────────────────

/**
 * Parse split details string to extract participant names.
 * Handles formats like: "Aisha:200,Rohan:200" or "Aisha=200;Rohan=200"
 */
function parseSplitParticipants(splitDetails) {
    if (!splitDetails) return [];
    const names = [];
    // Split by comma or semicolon
    const parts = String(splitDetails).split(/[,;]/);
    for (const part of parts) {
        // Split by : or = to get name
        const nameMatch = part.trim().split(/[:=]/);
        if (nameMatch[0]) {
            const name = nameMatch[0].trim();
            if (name && !/^\d/.test(name)) {
                names.push(name);
            }
        }
    }
    return names;
}

/**
 * Parse split details string to extract amounts.
 * Handles formats like: "Aisha:200,Rohan:200" or "200,200,200"
 */
function parseSplitAmounts(splitDetails) {
    if (!splitDetails) return [];
    const amounts = [];
    const parts = String(splitDetails).split(/[,;]/);
    for (const part of parts) {
        const trimmed = part.trim();
        // Try "Name:Amount" or "Name=Amount" format
        const splitMatch = trimmed.split(/[:=]/);
        if (splitMatch.length >= 2) {
            const val = parseFloat(splitMatch[splitMatch.length - 1].replace(/,/g, "").trim());
            if (!isNaN(val)) amounts.push(val);
        } else {
            // Try plain number
            const val = parseFloat(trimmed.replace(/,/g, "").trim());
            if (!isNaN(val)) amounts.push(val);
        }
    }
    return amounts;
}
