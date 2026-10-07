const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const File = require("../models/File");
const jwt = require("jsonwebtoken");

const router = express.Router();


// ==================== UPLOAD FILE ====================

router.post(
    "/upload",
    authMiddleware,
    upload.single("file"),
    async (req, res) => {

        try {

            const file = new File({
                filename: req.file.originalname,
                path: req.file.path,
                owner: req.user.id
            });

            await file.save();

            res.status(201).json({
                message: "File uploaded successfully",
                file
            });

        } catch (error) {

            res.status(500).json({
                message: error.message
            });

        }
    }
);


// ==================== GET MY FILES ====================

router.get("/", authMiddleware, async (req, res) => {

    try {

        const files = await File.find({
            owner: req.user.id
        });

        res.json(files);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
});


// ==================== SHARED FILE ====================
// IMPORTANT: This route must come BEFORE /:id

router.get("/shared/:token", async (req, res) => {

    try {

        const decoded = jwt.verify(
            req.params.token,
            process.env.JWT_SECRET
        );

        const file = await File.findOne({
            _id: decoded.fileId,
            shareToken: req.params.token
        });

        if (!file) {

            return res.status(404).json({
                message: "Invalid or expired share link"
            });

        }

        res.download(file.path, file.filename);

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired share link"
        });

    }
});


// ==================== DOWNLOAD FILE ====================

router.get("/:id", authMiddleware, async (req, res) => {

    try {

        const file = await File.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!file) {

            return res.status(404).json({
                message: "File not found"
            });

        }

        res.download(file.path, file.filename);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
});


// ==================== DELETE FILE ====================

router.delete("/:id", authMiddleware, async (req, res) => {

    try {

        const file = await File.findOneAndDelete({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!file) {

            return res.status(404).json({
                message: "File not found"
            });

        }

        res.json({
            message: "File deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
});


// ==================== GENERATE SHARE LINK ====================

router.post("/:id/share", authMiddleware, async (req, res) => {

    try {

        const file = await File.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!file) {

            return res.status(404).json({
                message: "File not found"
            });

        }

        const token = jwt.sign(
            {
                fileId: file._id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        file.shareToken = token;

        await file.save();

        res.json({
            message: "Share link generated",
            shareToken: token
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
});

module.exports = router;

