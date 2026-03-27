const attachmentService = require('../services/attachmentService');

async function addOrderAttachment(req, res) {
  try {
    console.log('--- ATTACHMENT CONTROLLER ---');
    console.log('File:', req.file ? req.file.originalname : 'MISSING');
    console.log('Body:', req.body);
    console.log('Params:', req.params);

    const file_type = req.body?.file_type;
    const uploaded_by = req.body?.uploaded_by;
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        message: 'File is required'
      });
    }

    if (!file_type) {
      return res.status(400).json({
        message: 'file_type is required'
      });
    }

    if (!uploaded_by) {
      return res.status(400).json({
        message: 'uploaded_by is required'
      });
    }

    const attachments = await attachmentService.addOrderAttachment(id, {
      file_name: req.file.originalname,
      file_type,
      file_path: `/uploads/${req.file.filename}`,
      uploaded_by
    });

    return res.status(200).json({
      message: 'Attachment uploaded successfully',
      data: attachments
    });
  } catch (error) {
    console.error('Error in addOrderAttachment:', error);

    if (error.message === 'Order not found') {
      return res.status(404).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

module.exports = {
  addOrderAttachment
};