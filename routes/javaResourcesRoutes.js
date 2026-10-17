const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
    getResources,
    getAdminResources,
    createResource,
    updateResource,
    deleteResource,
} = require("../controllers/javaResourcesController");

const authMiddleware = require("../middleware/authMiddleware");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === "application/pdf" ||
            file.originalname.toLowerCase().endsWith(".pdf")
        ) {
            return cb(null, true);
        }

        cb(new Error("Only PDF files are allowed"));
    },
});

router.get("/", getResources);

// Admin-only routes
router.get("/admin", authMiddleware, getAdminResources);
router.post(
    "/",
    authMiddleware,
    upload.single("pdf"),
    createResource
);
router.put(
    "/admin/:id",
    authMiddleware,
    upload.single("pdf"),
    updateResource
);
router.delete("/admin/:id", authMiddleware, deleteResource);

module.exports = router;