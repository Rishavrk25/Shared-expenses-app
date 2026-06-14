import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import auth from "../middleware/auth.js";
import {
    uploadAndProcess,
    getImportJob,
    getImportAnomalies,
    getImportReport,
    getImportReportDetails,
    exportImportReport,
} from "../controllers/importController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for CSV uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "..", "uploads"));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
            cb(null, true);
        } else {
            cb(new Error("Only CSV files are allowed"), false);
        }
    },
});

const router = express.Router();

// All import routes are protected by auth middleware
router.use(auth);

// POST /api/import
router.post("/", upload.single("file"), uploadAndProcess);

// GET /api/import/:id
router.get("/:id", getImportJob);

// GET /api/import/:id/anomalies
router.get("/:id/anomalies", getImportAnomalies);

// GET /api/import/:importId/report
router.get("/:importId/report", getImportReport);

// GET /api/import/:importId/report/details
router.get("/:importId/report/details", getImportReportDetails);

// GET /api/import/:importId/export
router.get("/:importId/export", exportImportReport);

export default router;
