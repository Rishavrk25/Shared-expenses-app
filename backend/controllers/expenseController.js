import pool from "../config/db.js";

// POST /api/expenses
export const createExpense = async (req, res) => {
    const client = await pool.connect();
    try {
        const { groupId, title, amount, currency, paidBy, expenseDate, participants } = req.body;

        // Validate required fields
        if (!groupId || !title || !amount || !paidBy || !expenseDate || !participants) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (!Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ error: "Participants must be a non-empty array" });
        }

        // Validate: sum(share_amounts) must equal expense amount
        const totalShares = participants.reduce((sum, p) => sum + Number(p.shareAmount), 0);
        if (Math.abs(totalShares - Number(amount)) > 0.01) {
            return res.status(400).json({ message: "Shares do not add up to total amount" });
        }

        // Validate: each participant was an active member on the expense date
        // A member is active if: joined_at <= expenseDate AND (left_at IS NULL OR left_at >= expenseDate)
        for (const p of participants) {
            const historyCheck = await client.query(
                `SELECT id FROM membership_history
                 WHERE group_id = $1
                   AND user_id = $2
                   AND joined_at <= $3
                   AND (left_at IS NULL OR left_at >= $3)`,
                [groupId, p.userId, expenseDate]
            );

            if (historyCheck.rows.length === 0) {
                // Get user name for better error message
                const userResult = await client.query("SELECT name FROM users WHERE id = $1", [p.userId]);
                const userName = userResult.rows.length > 0 ? userResult.rows[0].name : `User ${p.userId}`;
                return res.status(400).json({
                    error: `${userName} was not an active member of the group on ${expenseDate}`,
                });
            }
        }

        await client.query("BEGIN");

        // Insert into expenses
        const expenseResult = await client.query(
            `INSERT INTO expenses(group_id, title, amount, currency, paid_by, expense_date)
             VALUES($1, $2, $3, $4, $5, $6)
             RETURNING id, title, amount, currency, paid_by, expense_date, created_at`,
            [groupId, title, amount, currency || "INR", paidBy, expenseDate]
        );
        const expense = expenseResult.rows[0];

        // Insert into expense_participants
        for (const p of participants) {
            await client.query(
                `INSERT INTO expense_participants(expense_id, user_id, share_amount)
                 VALUES($1, $2, $3)`,
                [expense.id, p.userId, p.shareAmount]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({ message: "Expense created successfully", expense });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Create expense error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
};

// GET /api/groups/:groupId/expenses
export const getGroupExpenses = async (req, res) => {
    try {
        const { groupId } = req.params;

        const result = await pool.query(
            `SELECT e.id, e.title, e.amount, e.currency, e.expense_date,
                    e.created_at, u.name AS paid_by_name, e.paid_by
             FROM expenses e
             JOIN users u ON e.paid_by = u.id
             WHERE e.group_id = $1
             ORDER BY e.expense_date DESC`,
            [groupId]
        );

        // For each expense, get participants
        const expenses = [];
        for (const exp of result.rows) {
            const participantsResult = await pool.query(
                `SELECT ep.user_id, u.name, ep.share_amount
                 FROM expense_participants ep
                 JOIN users u ON ep.user_id = u.id
                 WHERE ep.expense_id = $1`,
                [exp.id]
            );

            expenses.push({
                ...exp,
                participants: participantsResult.rows,
            });
        }

        res.json(expenses);
    } catch (err) {
        console.error("Get expenses error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
