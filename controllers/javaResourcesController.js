
const JavaResource = require("../models/javaResourceModel");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

// Validate published status
const parsePublishedStatus = (value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (value === true || value === 1 || value === "1" || value === "true") {
        return 1;
    }

    if (value === false || value === 0 || value === "0" || value === "false") {
        return 0;
    }

    return null;
};

// Upload PDF to Cloudinary
const uploadPdfToCloudinary = (file) =>
    new Promise((resolve, reject) => {
        if (!file?.buffer) {
            return reject(new Error("PDF file is missing"));
        }

        // Use the original filename, without its extension
        const originalName = file.originalname
            .replace(/\.pdf$/i, "")
            .replace(/[^a-zA-Z0-9_-]/g, "_");

        const publicId = `${Date.now()}_${originalName}.pdf`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                folder: "harshad-portfolio/java-resources",
                public_id: publicId,
                use_filename: false,
                unique_filename: false,
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return reject(error);
                }

                if (!result?.secure_url || !result?.public_id) {
                    return reject(new Error("Cloudinary returned no file URL"));
                }

                // Debug information
                console.log("Uploaded resource type:", result.resource_type);
                console.log("Uploaded format:", result.format);
                console.log("Uploaded URL:", result.secure_url);
                console.log("Uploaded public ID:", result.public_id);

                resolve({
                    file_url: result.secure_url,
                    cloudinary_public_id: result.public_id,
                });
            }
        );

        Readable.from(file.buffer).pipe(uploadStream);
    });

// Delete PDF from Cloudinary
const deletePdfFromCloudinary = async (publicId) => {
    if (!publicId) return;

    const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
        invalidate: true,
    });

    if (result.result !== "ok" && result.result !== "not found") {
        throw new Error(`Cloudinary delete failed: ${result.result}`);
    }
};

// 1. GET PUBLIC RESOURCES
exports.getResources = async (req, res) => {
    try {
        const resources = await JavaResource.getAllResources();

        const publishedResources = resources.filter(
            (resource) => Number(resource.is_published) === 1
        );

        return res.status(200).json({
            success: true,
            data: publishedResources,
        });
    } catch (error) {
        console.error("Get resources error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load Java resources",
        });
    }
};

// 2. CREATE RESOURCE
exports.createResource = async (req, res) => {
    let uploadedFile;

    try {
        const {
            title,
            description,
            category,
            resource_type,
            is_published,
        } = req.body;

        if (!title?.trim() || !category?.trim() || !resource_type?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Title, category and resource type are required",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a PDF file",
            });
        }

        const publishedStatus = parsePublishedStatus(is_published);

        if (publishedStatus === null) {
            return res.status(400).json({
                success: false,
                message: "Invalid published status",
            });
        }

        uploadedFile = await uploadPdfToCloudinary(req.file);

        const id = await JavaResource.createResource({
            title: title.trim(),
            description: description || "",
            category: category.trim(),
            resource_type: resource_type.trim(),
            file_url: uploadedFile.file_url,
            cloudinary_public_id: uploadedFile.cloudinary_public_id,
            is_published: publishedStatus ?? 1,
        });

        return res.status(201).json({
            success: true,
            id,
            message: "PDF uploaded successfully",
        });
    } catch (error) {
        if (uploadedFile?.cloudinary_public_id) {
            try {
                await deletePdfFromCloudinary(
                    uploadedFile.cloudinary_public_id
                );
            } catch (cleanupError) {
                console.error("Cloudinary cleanup error:", cleanupError);
            }
        }

        console.error("Create resource error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create resource",
        });
    }
};

// 3. GET ADMIN RESOURCES
exports.getAdminResources = async (req, res) => {
    try {
        const resources = await JavaResource.getAllResources();

        return res.status(200).json({
            success: true,
            data: resources,
        });
    } catch (error) {
        console.error("Get admin resources error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load admin resources",
        });
    }
};

// 4. UPDATE RESOURCE
exports.updateResource = async (req, res) => {
    let uploadedFile;

    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid resource ID is required",
            });
        }

        const existing = await JavaResource.getResourceById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Resource not found",
            });
        }

        const {
            title,
            description,
            category,
            resource_type,
            is_published,
        } = req.body;

        const publishedStatus = parsePublishedStatus(is_published);

        if (publishedStatus === null) {
            return res.status(400).json({
                success: false,
                message: "Invalid published status",
            });
        }

        let fileUrl = existing.file_url;
        let publicId = existing.cloudinary_public_id;

        // Upload a replacement only when a new PDF is selected
        if (req.file) {
            uploadedFile = await uploadPdfToCloudinary(req.file);
            fileUrl = uploadedFile.file_url;
            publicId = uploadedFile.cloudinary_public_id;
        }

        const updated = await JavaResource.updateResource(id, {
            title,
            description,
            category,
            resource_type,
            file_url: fileUrl,
            cloudinary_public_id: publicId,
            is_published: publishedStatus,
        });

        if (!updated) {
            throw new Error("Database update failed");
        }

        // Remove the previous PDF after successful update
        if (
            uploadedFile &&
            existing.cloudinary_public_id &&
            existing.cloudinary_public_id !== publicId
        ) {
            try {
                await deletePdfFromCloudinary(
                    existing.cloudinary_public_id
                );
            } catch (error) {
                console.error("Old PDF cleanup error:", error);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Resource updated successfully",
        });
    } catch (error) {
        if (uploadedFile?.cloudinary_public_id) {
            try {
                await deletePdfFromCloudinary(
                    uploadedFile.cloudinary_public_id
                );
            } catch (cleanupError) {
                console.error("Cloudinary cleanup error:", cleanupError);
            }
        }

        console.error("Update resource error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update resource",
        });
    }
};

// 5. DELETE RESOURCE
exports.deleteResource = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid resource ID is required",
            });
        }

        const existing = await JavaResource.getResourceById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Resource not found",
            });
        }

        const deleted = await JavaResource.deleteResource(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Resource not found",
            });
        }

        if (existing.cloudinary_public_id) {
            try {
                await deletePdfFromCloudinary(
                    existing.cloudinary_public_id
                );
            } catch (error) {
                console.error("Cloudinary delete error:", error);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Resource deleted successfully",
        });
    } catch (error) {
        console.error("Delete resource error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete resource",
        });
    }
};
