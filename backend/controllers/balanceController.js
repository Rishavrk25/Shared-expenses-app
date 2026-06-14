import pool from "../config/db.js";

// Helper: compute raw balance map for a group (expenses + settlements)
async function computeBalances(groupId) {
    // Step 1: Fetch all expenses
    const expensesResult = await pool.query(
        "SELECT id, amount, paid_by FROM expenses WHERE group_id = $1",
        [groupId]
    );

    // Step 2: Create balance map
    const balances = {};

    for (const expense of expensesResult.rows) {
        const { id, amount, paid_by } = expense;

        // Step 3: Add amount to payer
        if (!balances[paid_by]) balances[paid_by] = 0;
        balances[paid_by] += Number(amount);

        // Step 4: Subtract participant shares
        const participantsResult = await pool.query(
            "SELECT user_id, share_amount FROM expense_participants WHERE expense_id = $1",
            [id]
        );

        for (const p of participantsResult.rows) {
            if (!balances[p.user_id]) balances[p.user_id] = 0;
            balances[p.user_id] -= Number(p.share_amount);
        }
    }

    // Step 5: Apply settlements
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

    return balances;
}

// GET /api/groups/:groupId/balances
export const getGroupBalances = async (req, res) => {
    try {
        const { groupId } = req.params;

        const balances = await computeBalances(groupId);

        // Build response with user names
        const userIds = Object.keys(balances);
        const result = [];

        for (const userId of userIds) {
            const userResult = await pool.query(
                "SELECT name FROM users WHERE id = $1",
                [userId]
            );
            result.push({
                userId: Number(userId),
                user: userResult.rows[0]?.name || `User ${userId}`,
                balance: Number(balances[userId].toFixed(2)),
            });
        }

        res.json(result);
    } catch (err) {
        console.error("Get balances error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/groups/:groupId/balances/:userId
export const getUserBalanceBreakdown = async (req, res) => {
    try {
        const { groupId, userId } = req.params;

        // Get user name
        const userResult = await pool.query("SELECT name FROM users WHERE id = $1", [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const userName = userResult.rows[0].name;

        // Fetch all expenses of the group
        const expensesResult = await pool.query(
            `SELECT e.id, e.title, e.amount, e.paid_by
             FROM expenses e
             WHERE e.group_id = $1`,
            [groupId]
        );

        let totalBalance = 0;
        const breakdown = [];

        for (const expense of expensesResult.rows) {
            let expenseBalance = 0;

            // If this user paid, they gain the full amount
            if (expense.paid_by === Number(userId)) {
                expenseBalance += Number(expense.amount);
            }

            // If this user is a participant, they owe their share
            const participantResult = await pool.query(
                "SELECT share_amount FROM expense_participants WHERE expense_id = $1 AND user_id = $2",
                [expense.id, userId]
            );

            if (participantResult.rows.length > 0) {
                expenseBalance -= Number(participantResult.rows[0].share_amount);
            }

            // Only include if user is involved in this expense
            if (expenseBalance !== 0 || participantResult.rows.length > 0 || expense.paid_by === Number(userId)) {
                breakdown.push({
                    expenseId: expense.id,
                    expense: expense.title,
                    amount: Number(expenseBalance.toFixed(2)),
                });
                totalBalance += expenseBalance;
            }
        }

        // Apply settlements for this user
        const settlementsResult = await pool.query(
            `SELECT s.id, s.amount, s.payer_id, s.receiver_id, s.settlement_date,
                    u_payer.name AS payer_name, u_receiver.name AS receiver_name
             FROM settlements s
             JOIN users u_payer ON s.payer_id = u_payer.id
             JOIN users u_receiver ON s.receiver_id = u_receiver.id
             WHERE s.group_id = $1 AND (s.payer_id = $2 OR s.receiver_id = $2)`,
            [groupId, userId]
        );

        for (const s of settlementsResult.rows) {
            let settlementAmount = 0;
            let description = "";

            if (s.payer_id === Number(userId)) {
                // User paid → balance goes up
                settlementAmount = Number(s.amount);
                description = `Settlement: paid ${s.receiver_name}`;
            } else {
                // User received → balance goes down
                settlementAmount = -Number(s.amount);
                description = `Settlement: received from ${s.payer_name}`;
            }

            breakdown.push({
                settlementId: s.id,
                expense: description,
                amount: Number(settlementAmount.toFixed(2)),
            });
            totalBalance += settlementAmount;
        }

        res.json({
            userId: Number(userId),
            user: userName,
            totalBalance: Number(totalBalance.toFixed(2)),
            breakdown,
        });
    } catch (err) {
        console.error("Get user balance breakdown error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/balances/summary
export const getUserBalanceSummary = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Find all groups the user belongs to
        const groupsResult = await pool.query(
            "SELECT group_id FROM group_members WHERE user_id = $1",
            [userId]
        );
        
        let totalOwed = 0;
        let totalOwes = 0;
        const groupBalances = [];
        
        for (const row of groupsResult.rows) {
            const groupId = row.group_id;
            const balances = await computeBalances(groupId);
            const userBalance = balances[userId] || 0;
            
            if (userBalance > 0.01) {
                totalOwed += userBalance;
            } else if (userBalance < -0.01) {
                totalOwes += Math.abs(userBalance);
            }
            
            // Get group name
            const groupRes = await pool.query("SELECT name FROM groups WHERE id = $1", [groupId]);
            const groupName = groupRes.rows[0]?.name || `Group ${groupId}`;
            
            if (Math.abs(userBalance) > 0.01) {
                groupBalances.push({
                    groupId,
                    groupName,
                    balance: Number(userBalance.toFixed(2))
                });
            }
        }
        
        res.json({
            totalOwed: Number(totalOwed.toFixed(2)),
            totalOwes: Number(totalOwes.toFixed(2)),
            netBalance: Number((totalOwed - totalOwes).toFixed(2)),
            groupBalances
        });
        
    } catch (err) {
        console.error("Get user balance summary error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
