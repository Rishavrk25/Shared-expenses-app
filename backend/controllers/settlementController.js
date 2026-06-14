import pool from "../config/db.js";

// GET /api/groups/:groupId/settlements/suggestions
export const getSettlementSuggestions = async (req, res) => {
    try {
        const { groupId } = req.params;

        // Step 1: Calculate balances (same logic as balanceController)
        const expensesResult = await pool.query(
            "SELECT id, amount, paid_by FROM expenses WHERE group_id = $1",
            [groupId]
        );

        const balances = {};

        for (const expense of expensesResult.rows) {
            const { id, amount, paid_by } = expense;

            if (!balances[paid_by]) balances[paid_by] = 0;
            balances[paid_by] += Number(amount);

            const participantsResult = await pool.query(
                "SELECT user_id, share_amount FROM expense_participants WHERE expense_id = $1",
                [id]
            );

            for (const p of participantsResult.rows) {
                if (!balances[p.user_id]) balances[p.user_id] = 0;
                balances[p.user_id] -= Number(p.share_amount);
            }
        }

        // Apply existing settlements
        const settlementsResult = await pool.query(
            "SELECT payer_id, receiver_id, amount FROM settlements WHERE group_id = $1",
            [groupId]
        );

        for (const s of settlementsResult.rows) {
            if (!balances[s.payer_id]) balances[s.payer_id] = 0;
            if (!balances[s.receiver_id]) balances[s.receiver_id] = 0;
            // Payer's debt decreases (balance goes up)
            balances[s.payer_id] += Number(s.amount);
            // Receiver's credit decreases (balance goes down)
            balances[s.receiver_id] -= Number(s.amount);
        }

        // Step 2: Separate into creditors and debtors
        const creditors = [];
        const debtors = [];

        // Get user names
        const userIds = Object.keys(balances);
        const userNames = {};
        for (const uid of userIds) {
            const userResult = await pool.query("SELECT name FROM users WHERE id = $1", [uid]);
            userNames[uid] = userResult.rows[0]?.name || `User ${uid}`;
        }

        for (const uid of userIds) {
            const balance = Number(balances[uid].toFixed(2));
            if (balance > 0.01) {
                creditors.push({ userId: Number(uid), name: userNames[uid], amount: balance });
            } else if (balance < -0.01) {
                debtors.push({ userId: Number(uid), name: userNames[uid], amount: Math.abs(balance) });
            }
        }

        // Sort for consistent results
        creditors.sort((a, b) => b.amount - a.amount);
        debtors.sort((a, b) => b.amount - a.amount);

        // Step 3: Settlement algorithm - match debtors to creditors
        const settlements = [];
        let i = 0; // debtor index
        let j = 0; // creditor index

        while (i < debtors.length && j < creditors.length) {
            const payAmount = Math.min(debtors[i].amount, creditors[j].amount);

            settlements.push({
                from: debtors[i].name,
                fromId: debtors[i].userId,
                to: creditors[j].name,
                toId: creditors[j].userId,
                amount: Number(payAmount.toFixed(2)),
            });

            debtors[i].amount -= payAmount;
            creditors[j].amount -= payAmount;

            if (debtors[i].amount < 0.01) i++;
            if (creditors[j].amount < 0.01) j++;
        }

        res.json(settlements);
    } catch (err) {
        console.error("Get settlement suggestions error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// POST /api/settlements
export const recordSettlement = async (req, res) => {
    try {
        const { groupId, payerId, receiverId, amount } = req.body;

        if (!groupId || !payerId || !receiverId || !amount) {
            return res.status(400).json({ error: "groupId, payerId, receiverId, and amount are required" });
        }

        if (payerId === receiverId) {
            return res.status(400).json({ error: "Payer and receiver cannot be the same person" });
        }

        const result = await pool.query(
            `INSERT INTO settlements(group_id, payer_id, receiver_id, amount)
             VALUES($1, $2, $3, $4)
             RETURNING id, group_id, payer_id, receiver_id, amount, settlement_date`,
            [groupId, payerId, receiverId, amount]
        );

        res.status(201).json({ message: "Settlement recorded successfully", settlement: result.rows[0] });
    } catch (err) {
        console.error("Record settlement error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
