import pool from "../config/db.js";

// POST /api/groups
export const createGroup = async (req, res) => {
    const client = await pool.connect();
    try {
        const { name } = req.body;
        const userId = req.userId;

        if (!name) {
            return res.status(400).json({ error: "Group name is required" });
        }

        await client.query("BEGIN");

        // Create group
        const groupResult = await client.query(
            "INSERT INTO groups(name, created_by) VALUES($1, $2) RETURNING id, name, created_at",
            [name, userId]
        );
        const group = groupResult.rows[0];

        // Add creator as first member
        await client.query(
            "INSERT INTO group_members(group_id, user_id) VALUES($1, $2)",
            [group.id, userId]
        );

        // Create membership_history entry
        await client.query(
            "INSERT INTO membership_history(group_id, user_id, joined_at) VALUES($1, $2, CURRENT_DATE)",
            [group.id, userId]
        );

        await client.query("COMMIT");

        res.status(201).json({ message: "Group created successfully", group });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Create group error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
};

// GET /api/groups
export const getUserGroups = async (req, res) => {
    try {
        const userId = req.userId;

        const result = await pool.query(
            `SELECT g.id, g.name
             FROM groups g
             JOIN group_members gm ON g.id = gm.group_id
             WHERE gm.user_id = $1
             ORDER BY g.created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Get groups error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/groups/:groupId
export const getGroupById = async (req, res) => {
    try {
        const { groupId } = req.params;
        const result = await pool.query(
            `SELECT g.id, g.name, g.created_at, u.name AS created_by_name
             FROM groups g
             JOIN users u ON g.created_by = u.id
             WHERE g.id = $1`,
            [groupId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Group not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Get group error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/groups/:groupId/members
export const getGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const result = await pool.query(
            `SELECT gm.user_id, u.name, u.email
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = $1
             ORDER BY u.name`,
            [groupId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get group members error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// POST /api/groups/:groupId/members
export const addMember = async (req, res) => {
    const client = await pool.connect();
    try {
        const { groupId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        // Check if user exists
        const userCheck = await client.query("SELECT id FROM users WHERE id = $1", [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if already a member
        const memberCheck = await client.query(
            "SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2",
            [groupId, userId]
        );
        if (memberCheck.rows.length > 0) {
            return res.status(409).json({ error: "User is already a member of this group" });
        }

        await client.query("BEGIN");

        // Insert into group_members
        await client.query(
            "INSERT INTO group_members(group_id, user_id) VALUES($1, $2)",
            [groupId, userId]
        );

        // Insert into membership_history with joined_at = today, left_at = NULL
        await client.query(
            "INSERT INTO membership_history(group_id, user_id, joined_at) VALUES($1, $2, CURRENT_DATE)",
            [groupId, userId]
        );

        await client.query("COMMIT");

        res.status(201).json({ message: "Member added successfully" });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Add member error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
};

// DELETE /api/groups/:groupId/members/:userId
export const removeMember = async (req, res) => {
    const client = await pool.connect();
    try {
        const { groupId, userId } = req.params;

        // Check if user is a member
        const memberCheck = await client.query(
            "SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2",
            [groupId, userId]
        );
        if (memberCheck.rows.length === 0) {
            return res.status(404).json({ error: "Member not found in this group" });
        }

        await client.query("BEGIN");

        // DELETE from group_members (NOT from history)
        await client.query(
            "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2",
            [groupId, userId]
        );

        // Update membership_history: SET left_at = CURRENT_DATE
        await client.query(
            `UPDATE membership_history
             SET left_at = CURRENT_DATE
             WHERE group_id = $1 AND user_id = $2 AND left_at IS NULL`,
            [groupId, userId]
        );

        await client.query("COMMIT");

        res.json({ message: "Member removed successfully" });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Remove member error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
};
