
const pool = require("../config/db");

// 1. GET ALL RESOURCES
const getAllResources = async () => {
    const [rows] = await pool.query(
        "SELECT * FROM java_resources ORDER BY id DESC"
    );

    return rows;
};

// 2. GET RESOURCE BY ID
const getResourceById = async (id) => {
    const [rows] = await pool.query(
        "SELECT * FROM java_resources WHERE id = ?",
        [id]
    );

    return rows[0] || null;
};

// 3. CREATE RESOURCE
const createResource = async ({
    title,
    description,
    category,
    resource_type,
    file_url,
    cloudinary_public_id,
    is_published = 1,
}) => {
    const [result] = await pool.query(
        `INSERT INTO java_resources
      (
        title,
        description,
        category,
        resource_type,
        file_url,
        cloudinary_public_id,
        is_published
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            title,
            description || "",
            category,
            resource_type,
            file_url,
            cloudinary_public_id || null,
            is_published,
        ]
    );

    return result.insertId;
};

// 4. UPDATE RESOURCE
const updateResource = async (id, data) => {
    const existing = await getResourceById(id);

    if (!existing) {
        return false;
    }

    const title = data.title ?? existing.title;
    const description = data.description ?? existing.description;
    const category = data.category ?? existing.category;
    const resourceType =
        data.resource_type ?? existing.resource_type;
    const fileUrl = data.file_url ?? existing.file_url;
    const cloudinaryPublicId =
        data.cloudinary_public_id ?? existing.cloudinary_public_id;
    const isPublished =
        data.is_published ?? existing.is_published;

    const [result] = await pool.query(
        `UPDATE java_resources
     SET title = ?,
         description = ?,
         category = ?,
         resource_type = ?,
         file_url = ?,
         cloudinary_public_id = ?,
         is_published = ?
     WHERE id = ?`,
        [
            title,
            description,
            category,
            resourceType,
            fileUrl,
            cloudinaryPublicId,
            isPublished,
            id,
        ]
    );

    return result.affectedRows > 0;
};

// 5. DELETE RESOURCE
const deleteResource = async (id) => {
    const [result] = await pool.query(
        "DELETE FROM java_resources WHERE id = ?",
        [id]
    );

    return result.affectedRows > 0;
};

module.exports = {
    getAllResources,
    getResourceById,
    createResource,
    updateResource,
    deleteResource,
};
