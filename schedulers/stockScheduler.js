const cron = require('node-cron');
const Ingredient = require('../models/resto/Ingredient');
const Medicine = require('../models/pharma/Medicine');
const Product = require('../models/electro/Product');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');

// ============================================
// Low Stock Scheduler - Runs Every 6 Hours
// ============================================

const checkLowStock = async () => {
  logger.info('Running stock scheduler...');

  try {
    // Resto - Ingredients
    const lowIngredients = await Ingredient.find({
      stock: { $lte: 10 },
      alertThreshold: { $exists: true },
    }).populate('tenantId');

    for (const item of lowIngredients) {
      if (item.stock <= (item.alertThreshold || 5)) {
        const tenant = item.tenantId;
        if (!tenant) continue;

        await smsService.send({
          to: tenant.contact.phone || tenant.owner.phone,
          message: require('../templates/smsTemplates').lowStockAlert({
            businessName: tenant.businessName,
            itemName: item.name,
            stockLeft: item.stock,
          }),
        });

        logger.info(`Low stock: ${item.name} (${item.stock}) at ${tenant.businessName}`);
      }
    }

    // Pharma - Medicines
    const lowMedicines = await Medicine.find({
      stock: { $lte: 10 },
    }).populate('tenantId');

    for (const med of lowMedicines) {
      const tenant = med.tenantId;
      if (!tenant) continue;

      await emailService.send({
        to: tenant.contact.email || tenant.owner.email,
        subject: `Low Stock Alert - ${tenant.businessName}`,
        html: require('../templates/emailTemplates').lowStockAlert({
          name: tenant.owner.name,
          businessName: tenant.businessName,
          items: [{ name: med.name, stock: med.stock }],
        }),
      });

      logger.info(`Low stock: ${med.name} (${med.stock}) at ${tenant.businessName}`);
    }

    // Electro - Products
    const lowProducts = await Product.find({
      stock: { $lte: 3 },
    }).populate('tenantId');

    for (const product of lowProducts) {
      const tenant = product.tenantId;
      if (!tenant) continue;

      await emailService.send({
        to: tenant.contact.email || tenant.owner.email,
        subject: `Low Stock Alert - ${tenant.businessName}`,
        html: require('../templates/emailTemplates').lowStockAlert({
          name: tenant.owner.name,
          businessName: tenant.businessName,
          items: [{ name: product.name, stock: product.stock }],
        }),
      });

      logger.info(`Low stock: ${product.name} (${product.stock}) at ${tenant.businessName}`);
    }
  } catch (error) {
    logger.error('Stock scheduler error:', error);
  }
};

// Run every 6 hours
cron.schedule('0 */6 * * *', checkLowStock);

module.exports = checkLowStock;