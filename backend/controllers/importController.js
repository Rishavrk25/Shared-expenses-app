import pool from "../config/db.js";
import { parseCSV, mapRow } from "../services/csvParserService.js";
import { normalizeRow } from "../services/validationService.js";
import { detectAnomalies, buildDetectionContext, storeAnomalies, getAnomalies } from "../services/anomalyService.js";

// GET /api/import
export const getUserImports = async (req, res) => {
    try {
        const userId = req.userId;
        const result = await pool.query(
            "SELECT * FROM import_jobs WHERE uploaded_by = $1 ORDER BY uploaded_at DESC",
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get user imports error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// POST /api/import
export const uploadAndProcess = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded. Use field name 'file'." });
        }

        const userId = req.userId;
        const fileName = req.file.originalname;
        const filePath = req.file.path;
        const groupId = req.body.groupId || null; // Optional: group context for advanced detection

        // Step 1: Create import job with status PROCESSING
        const jobResult = await pool.query(
            `INSERT INTO import_jobs(file_name, uploaded_by, status)
             VALUES($1, $2, 'PROCESSING')
             RETURNING id`,
            [fileName, userId]
        );
        const importJobId = jobResult.rows[0].id;

        try {
            // Step 2: Parse CSV
            const rawRows = await parseCSV(filePath);

            // Step 3: Map and normalize rows
            const normalizedRows = rawRows.map((raw) => {
                const mapped = mapRow(raw);
                return normalizeRow(mapped);
            });

            // Step 4: Build detection context (users, membership history, existing expenses)
            const context = await buildDetectionContext(groupId);

            // Step 5: Run advanced anomaly detection on each row
            let totalAnomalies = 0;

            for (const row of normalizedRows) {
                const anomalies = detectAnomalies(row, context);
                if (anomalies.length > 0) {
                    await storeAnomalies(importJobId, anomalies);
                    totalAnomalies += anomalies.length;
                }
            }

            // Step 6: Mark job as COMPLETED
            await pool.query(
                "UPDATE import_jobs SET status = 'COMPLETED' WHERE id = $1",
                [importJobId]
            );

            // Step 7: Return summary
            res.status(201).json({
                importJobId,
                rowsProcessed: normalizedRows.length,
                anomaliesFound: totalAnomalies,
                status: "COMPLETED",
            });
        } catch (processingErr) {
            // Mark job as FAILED
            await pool.query(
                "UPDATE import_jobs SET status = 'FAILED' WHERE id = $1",
                [importJobId]
            );
            throw processingErr;
        }
    } catch (err) {
        console.error("Import error:", err.message);
        res.status(500).json({ error: "Import failed: " + err.message });
    }
};

// GET /api/import/:id
export const getImportJob = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, file_name, uploaded_at, uploaded_by, status
             FROM import_jobs
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Import job not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Get import job error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/import/:id/anomalies
export const getImportAnomalies = async (req, res) => {
    try {
        const { id } = req.params;

        // Check job exists
        const jobResult = await pool.query("SELECT id FROM import_jobs WHERE id = $1", [id]);
        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: "Import job not found" });
        }

        const anomalies = await getAnomalies(id);

        res.json({
            importJobId: Number(id),
            anomalies,
            totalAnomalies: anomalies.length,
        });
    } catch (err) {
        console.error("Get import anomalies error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/import/:importId/report
export const getImportReport = async (req, res) => {
    try {
        const { importId } = req.params;

        // Get import job info
        const jobResult = await pool.query(
            "SELECT id, file_name, uploaded_at, uploaded_by, status FROM import_jobs WHERE id = $1",
            [importId]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: "Import job not found" });
        }

        const job = jobResult.rows[0];

        // Get total anomaly count
        const totalAnomaliesResult = await pool.query(
            "SELECT COUNT(*) AS count FROM import_anomalies WHERE import_job_id = $1",
            [importId]
        );
        const totalAnomalies = Number(totalAnomaliesResult.rows[0].count);

        // Get anomalies grouped by type
        const anomalyTypesResult = await pool.query(
            `SELECT anomaly_type, COUNT(*)::int AS count
             FROM import_anomalies
             WHERE import_job_id = $1
             GROUP BY anomaly_type
             ORDER BY count DESC`,
            [importId]
        );

        const anomalies = {};
        for (const row of anomalyTypesResult.rows) {
            anomalies[row.anomaly_type] = row.count;
        }

        // Count rows with ERROR-level anomalies (failed rows)
        const failedRowsResult = await pool.query(
            `SELECT COUNT(DISTINCT row_number) AS count
             FROM import_anomalies
             WHERE import_job_id = $1 AND severity = 'ERROR'`,
            [importId]
        );
        const failedRows = Number(failedRowsResult.rows[0].count);

        // Get total rows from anomaly row numbers (best estimate without re-parsing CSV)
        const totalRowsResult = await pool.query(
            `SELECT MAX(row_number) AS max_row
             FROM import_anomalies
             WHERE import_job_id = $1`,
            [importId]
        );
        // Use max row number as rough total, fallback to failed rows if no anomalies
        const totalRows = totalRowsResult.rows[0].max_row || 0;
        const successfulRows = Math.max(0, totalRows - failedRows);

        res.json({
            importId: Number(importId),
            fileName: job.file_name,
            uploadedAt: job.uploaded_at,
            status: job.status,
            totalRows,
            successfulRows,
            failedRows,
            totalAnomalies,
            anomalies,
        });
    } catch (err) {
        console.error("Get import report error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/import/:importId/report/details
export const getImportReportDetails = async (req, res) => {
    try {
        const { importId } = req.params;

        // Check job exists
        const jobResult = await pool.query("SELECT id FROM import_jobs WHERE id = $1", [importId]);
        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: "Import job not found" });
        }

        // Get all anomalies with full detail
        const anomaliesResult = await pool.query(
            `SELECT row_number AS row, anomaly_type AS type, description, action_taken AS "actionTaken", severity
             FROM import_anomalies
             WHERE import_job_id = $1
             ORDER BY row_number ASC, severity DESC`,
            [importId]
        );

        res.json({
            importId: Number(importId),
            anomalies: anomaliesResult.rows,
        });
    } catch (err) {
        console.error("Get import report details error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/import/:importId/export
export const exportImportReport = async (req, res) => {
    try {
        const { importId } = req.params;

        // Get import job info
        const jobResult = await pool.query(
            "SELECT id, file_name, uploaded_at, uploaded_by, status FROM import_jobs WHERE id = $1",
            [importId]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: "Import job not found" });
        }

        const job = jobResult.rows[0];

        // Get anomaly counts by type
        const anomalyTypesResult = await pool.query(
            `SELECT anomaly_type, COUNT(*)::int AS count
             FROM import_anomalies
             WHERE import_job_id = $1
             GROUP BY anomaly_type
             ORDER BY count DESC`,
            [importId]
        );

        const anomalyCounts = {};
        for (const row of anomalyTypesResult.rows) {
            anomalyCounts[row.anomaly_type] = row.count;
        }

        // Get anomaly counts by severity
        const severityResult = await pool.query(
            `SELECT severity, COUNT(*)::int AS count
             FROM import_anomalies
             WHERE import_job_id = $1
             GROUP BY severity
             ORDER BY severity`,
            [importId]
        );

        const severityCounts = {};
        for (const row of severityResult.rows) {
            severityCounts[row.severity] = row.count;
        }

        // Get failed row count
        const failedRowsResult = await pool.query(
            `SELECT COUNT(DISTINCT row_number) AS count
             FROM import_anomalies
             WHERE import_job_id = $1 AND severity = 'ERROR'`,
            [importId]
        );
        const failedRows = Number(failedRowsResult.rows[0].count);

        const totalRowsResult = await pool.query(
            "SELECT MAX(row_number) AS max_row FROM import_anomalies WHERE import_job_id = $1",
            [importId]
        );
        const totalRows = totalRowsResult.rows[0].max_row || 0;

        // Get all anomalies
        const anomaliesResult = await pool.query(
            `SELECT row_number AS row, anomaly_type AS type, description, action_taken AS "actionTaken", severity
             FROM import_anomalies
             WHERE import_job_id = $1
             ORDER BY row_number ASC`,
            [importId]
        );

        res.json({
            summary: {
                importId: Number(importId),
                fileName: job.file_name,
                uploadedAt: job.uploaded_at,
                status: job.status,
                totalRows,
                successfulRows: Math.max(0, totalRows - failedRows),
                failedRows,
                anomalyCounts,
                severityCounts,
            },
            anomalies: anomaliesResult.rows,
        });
    } catch (err) {
        console.error("Export import report error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
