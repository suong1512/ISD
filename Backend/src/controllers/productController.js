const productService = require('../services/productService');

async function getAllProducts(req, res) {
  try {
    const products = await productService.getAllProducts();

    return res.status(200).json({
      message: 'Get products successfully',
      data: products
    });
  } catch (error) {
    console.error('Error in getAllProducts:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

module.exports = {
  getAllProducts
};