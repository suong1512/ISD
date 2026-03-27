const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
    try {
        const orderId = 1;
        const formData = new FormData();
        formData.append('file', fs.createReadStream('package.json'));
        formData.append('file_type', 'SUPPLIER');
        formData.append('uploaded_by', 1);

        const response = await axios.post(`http://localhost:3000/orders/${orderId}/attachments`, formData, {
            headers: formData.getHeaders()
        });

        console.log('Upload success:', response.data);
    } catch (error) {
        console.error('Upload failed:', error.response ? error.response.data : error.message);
    }
}

testUpload();
