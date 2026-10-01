require('./dnsSet');
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Models - Admin
const Admin = require('../models/admin/Admin');
const Tenant = require('../models/admin/Tenant');
const Module = require('../models/admin/Module');
const Subscription = require('../models/admin/Subscription');

// ============================================
// Seed CLI Tool
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizhub';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// ============================================
// Connect to DB
// ============================================

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('\n✅ Connected to MongoDB\n');
    return true;
  } catch (error) {
    console.error('\n❌ MongoDB connection failed:', error.message, '\n');
    return false;
  }
};

// ============================================
// Menu
// ============================================

const showMenu = () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║        BIZHUB SEEDER CLI             ║');
  console.log('╠══════════════════════════════════════╣');
  console.log('║  1. Seed all                         ║');
  console.log('║  2. Seed settings                    ║');
  console.log('║  3. Seed legals                      ║');
  console.log('║  4. Seed plans                       ║');
  console.log('║  5. Seed demo tenant + data          ║');
  console.log('║  6. Seed specific module             ║');
  console.log('║  0. Exit                             ║');
  console.log('╚══════════════════════════════════════╝');
};

// ============================================
// 1. Seed All
// ============================================

const seedAll = async () => {
  console.log('\n🌱 SEEDING ALL...\n');
  await seedSettings();
  await seedLegals();
  await seedPlans();
  await seedDemoTenant();
  console.log('✅ All data seeded successfully!\n');
};

// ============================================
// 2. Seed Settings
// ============================================

const seedSettings = async () => {
  console.log('  ⚙️  Seeding settings...');

  const settingsCollection = mongoose.connection.db.collection('settings');

  const settings = [
    {
      key: 'platform_name',
      value: 'BizHub',
      description: 'Platform name',
      category: 'general',
    },
    {
      key: 'platform_email',
      value: 'support@bizhub.co.ke',
      description: 'Support email',
      category: 'general',
    },
    {
      key: 'platform_phone',
      value: '+254700000000',
      description: 'Support phone',
      category: 'general',
    },
    {
      key: 'default_currency',
      value: 'KES',
      description: 'Default currency',
      category: 'general',
    },
    {
      key: 'default_timezone',
      value: 'Africa/Nairobi',
      description: 'Default timezone',
      category: 'general',
    },
    {
      key: 'trial_days',
      value: '14',
      description: 'Free trial period in days',
      category: 'subscription',
    },
    {
      key: 'mpesa_environment',
      value: process.env.MPESA_ENVIRONMENT || 'sandbox',
      description: 'M-Pesa environment',
      category: 'payment',
    },
    {
      key: 'email_provider',
      value: process.env.EMAIL_PROVIDER || 'hdmBridge',
      description: 'Email service provider',
      category: 'email',
    },
    {
      key: 'sms_provider',
      value: process.env.SMS_PROVIDER || 'hdmBridge',
      description: 'SMS service provider',
      category: 'sms',
    },
    {
      key: 'storage_provider',
      value: process.env.STORAGE_PROVIDER || 'local',
      description: 'File storage provider',
      category: 'storage',
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      description: 'Platform maintenance mode',
      category: 'general',
    },
    {
      key: 'max_tenants_per_phone',
      value: '1',
      description: 'Max tenants per phone number',
      category: 'limits',
    },
  ];

  for (const setting of settings) {
    await settingsCollection.updateOne(
      { key: setting.key },
      { $set: { ...setting, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  console.log('  ✅ Settings seeded\n');
};

// ============================================
// 3. Seed Legals
// ============================================

const seedLegals = async () => {
  console.log('  📜 Seeding legal documents...');

  const legalsCollection = mongoose.connection.db.collection('legals');

  const legals = [
    {
      type: 'terms',
      title: 'Terms of Service',
      slug: 'terms-of-service',
      content: `# Terms of Service

## 1. Acceptance of Terms
By accessing and using BizHub, you agree to be bound by these Terms of Service.

## 2. Description of Service
BizHub is a SaaS business management platform offering restaurant, pharmacy, property, electronics, and cyber café management modules.

## 3. User Accounts
You are responsible for maintaining the confidentiality of your account credentials.

## 4. Subscription and Billing
Subscriptions are billed monthly via M-Pesa or other supported payment methods. All plans include a 14-day free trial.

## 5. Cancellation
You may cancel your subscription at any time. No refunds for partial months.

## 6. Data Ownership
You retain all rights to your data. We do not share your data with third parties.

## 7. Limitation of Liability
BizHub is provided "as is" without warranties of any kind.

## 8. Governing Law
These terms are governed by the laws of Kenya.`,
      version: '1.0',
      effectiveDate: new Date('2026-01-01'),
      status: 'published',
    },
    {
      type: 'privacy',
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      content: `# Privacy Policy

## 1. Information We Collect
We collect information you provide when registering, including name, email, phone number, and business details.

## 2. How We Use Information
Your information is used to provide and improve our services, process payments, and communicate with you.

## 3. Data Storage
Data is stored securely on MongoDB Atlas with encryption at rest and in transit.

## 4. Data Sharing
We do not sell your data. We may share data with service providers (payment processors, email services) as needed.

## 5. Data Retention
We retain your data as long as your account is active. Upon deletion, data is removed within 30 days.

## 6. Your Rights
You have the right to access, correct, or delete your personal data.

## 7. Cookies
We use essential cookies for authentication and session management.

## 8. Contact
For privacy concerns, contact privacy@bizhub.co.ke.`,
      version: '1.0',
      effectiveDate: new Date('2026-01-01'),
      status: 'published',
    },
    {
      type: 'refund',
      title: 'Refund Policy',
      slug: 'refund-policy',
      content: `# Refund Policy

## 1. Free Trial
All new accounts receive a 14-day free trial. No charges during this period.

## 2. Subscription Cancellation
You may cancel anytime. Your subscription remains active until the end of the billing period.

## 3. Refunds
Refunds are provided at our sole discretion in cases of:
- Service unavailability exceeding 48 hours
- Billing errors
- Duplicate charges

## 4. How to Request
Email support@bizhub.co.ke with your account details and reason for refund.

## 5. Processing Time
Approved refunds are processed within 7-14 business days via M-Pesa.`,
      version: '1.0',
      effectiveDate: new Date('2026-01-01'),
      status: 'published',
    },
  ];

  for (const legal of legals) {
    await legalsCollection.updateOne(
      { type: legal.type },
      { $set: { ...legal, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  console.log('  ✅ Legals seeded\n');
};

// ============================================
// 4. Seed Plans
// ============================================

const seedPlans = async () => {
  console.log('  💰 Seeding plans...');

  const plansCollection = mongoose.connection.db.collection('plans');

  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      price: 1500,
      currency: 'KES',
      interval: 'month',
      maxModules: 1,
      maxUsers: 3,
      maxStorageMB: 500,
      features: [
        '1 Business Module',
        'Up to 3 Users',
        'Basic Inventory',
        'Basic Reports',
        'Email Support',
        '500MB Storage',
      ],
      highlighted: false,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Business',
      slug: 'business',
      price: 3500,
      currency: 'KES',
      interval: 'month',
      maxModules: 3,
      maxUsers: 10,
      maxStorageMB: 2000,
      features: [
        'Up to 3 Business Modules',
        'Up to 10 Users',
        'Advanced Inventory',
        'Advanced Reports',
        'M-Pesa Integration',
        'Priority Support',
        '2GB Storage',
        'Export Reports (PDF/Excel)',
      ],
      highlighted: true,
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      price: 5000,
      currency: 'KES',
      interval: 'month',
      maxModules: 5,
      maxUsers: -1,
      maxStorageMB: 10000,
      features: [
        'All 5 Business Modules',
        'Unlimited Users',
        'All Features',
        'White Label Option',
        'Dedicated Support',
        '10GB Storage',
        'API Access',
        'Custom Integrations',
        'Priority Feature Requests',
      ],
      highlighted: false,
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await plansCollection.updateOne(
      { slug: plan.slug },
      { $set: { ...plan, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  console.log('  ✅ Plans seeded\n');
};

// ============================================
// 5. Seed Demo Tenant
// ============================================

const seedDemoTenant = async () => {
  console.log('  🏪 Seeding demo tenant...');

  // Check if demo tenant exists
  const existingTenant = await Tenant.findOne({ slug: 'demo-restaurant' });
  if (existingTenant) {
    console.log('  ⚠️  Demo tenant already exists. Skipping.\n');
    return;
  }

  // Create demo tenant
  const tenant = await Tenant.create({
    businessName: 'Demo Restaurant',
    slug: 'demo-restaurant',
    businessType: 'restaurant',
    owner: {
      name: 'Demo Owner',
      email: 'demo@bizhub.co.ke',
      phone: '254712345678',
    },
    contact: {
      email: 'demo@bizhub.co.ke',
      phone: '254712345678',
      address: 'Nairobi, Kenya',
    },
    status: 'trial',
    settings: {
      currency: 'KES',
      timezone: 'Africa/Nairobi',
      dateFormat: 'DD/MM/YYYY',
    },
    isActive: true,
  });

  // Create demo admin user
  const User = require('../models/resto/User');
  const hashedPassword = await bcrypt.hash('demo1234', 12);

  await User.create({
    tenantId: tenant._id,
    name: 'Demo Admin',
    email: 'admin@demo.co.ke',
    phone: '254712345678',
    password: hashedPassword,
    role: 'owner',
    permissions: ['all'],
    isActive: true,
  });

  // Activate modules
  await Module.create({
    tenantId: tenant._id,
    moduleName: 'resto',
    status: 'active',
    features: {
      pos: true,
      inventory: true,
      reports: true,
      mpesa: true,
    },
    storageUsed: 0,
    userCount: 1,
  });

  // Create trial subscription
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  await Subscription.create({
    tenantId: tenant._id,
    plan: 'starter',
    amount: 0,
    currency: 'KES',
    startDate: new Date(),
    endDate: trialEnd,
    status: 'active',
    paymentDetails: {
      method: 'trial',
    },
  });

  console.log('  ✅ Demo tenant seeded');
  console.log(`     Login: admin@demo.co.ke / demo1234\n`);
};

// ============================================
// 6. Seed Specific Module
// ============================================

const seedSpecificModule = async () => {
  console.log('\n📦 SELECT MODULE TO SEED:\n');
  console.log('  1. Resto (Restaurant)');
  console.log('  2. Pharma (Pharmacy)');
  console.log('  3. Apartment (Property)');
  console.log('  4. Electro (Electronics)');
  console.log('  5. Cyber (Cyber Café)');

  const choice = await question('\n  Enter option: ');
  const modules = ['resto', 'pharma', 'apartment', 'electro', 'cyber'];
  const index = parseInt(choice) - 1;

  if (isNaN(index) || index < 0 || index >= modules.length) {
    console.log('\n  ❌ Invalid option.\n');
    return;
  }

  const moduleName = modules[index];
  console.log(`\n  🌱 Seeding ${moduleName} module...\n`);

  // Find or create a tenant for this module
  let tenant = await Tenant.findOne({ slug: `demo-${moduleName}` });

  if (!tenant) {
    const businessTypes = {
      resto: 'restaurant',
      pharma: 'pharmacy',
      apartment: 'apartment',
      electro: 'electronics',
      cyber: 'cyber',
    };

    tenant = await Tenant.create({
      businessName: `Demo ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`,
      slug: `demo-${moduleName}`,
      businessType: businessTypes[moduleName],
      owner: {
        name: 'Demo Owner',
        email: `demo-${moduleName}@bizhub.co.ke`,
        phone: '254700000000',
      },
      contact: {
        email: `demo-${moduleName}@bizhub.co.ke`,
        phone: '254700000000',
        address: 'Nairobi, Kenya',
      },
      status: 'trial',
      isActive: true,
    });

    // Activate module
    await Module.create({
      tenantId: tenant._id,
      moduleName,
      status: 'active',
      features: { pos: true, inventory: true, reports: true, mpesa: true },
      storageUsed: 0,
      userCount: 1,
    });
  }

  // Seed module-specific demo data
  await seedModuleData(moduleName, tenant._id);

  console.log(`  ✅ ${moduleName} module seeded\n`);
};

// ============================================
// Module-specific seed data
// ============================================

const seedModuleData = async (moduleName, tenantId) => {
  switch (moduleName) {
    case 'resto':
      await seedRestoData(tenantId);
      break;
    case 'pharma':
      await seedPharmaData(tenantId);
      break;
    case 'apartment':
      await seedApartmentData(tenantId);
      break;
    case 'electro':
      await seedElectroData(tenantId);
      break;
    case 'cyber':
      await seedCyberData(tenantId);
      break;
  }
};

const seedRestoData = async (tenantId) => {
  const MenuCategory = require('../models/resto/MenuCategory');
  const MenuItem = require('../models/resto/MenuItem');
  const Table = require('../models/resto/Table');

  // Menu Categories
  const categories = await MenuCategory.insertMany([
    { tenantId, name: 'Appetizers', description: 'Start your meal right', order: 1, isActive: true },
    { tenantId, name: 'Main Course', description: 'Hearty main dishes', order: 2, isActive: true },
    { tenantId, name: 'Beverages', description: 'Drinks & refreshments', order: 3, isActive: true },
    { tenantId, name: 'Desserts', description: 'Sweet treats', order: 4, isActive: true },
  ]);

  // Menu Items
  await MenuItem.insertMany([
    { tenantId, categoryId: categories[0]._id, name: 'Spring Rolls', price: 350, description: 'Crispy vegetable spring rolls', isAvailable: true },
    { tenantId, categoryId: categories[0]._id, name: 'Chicken Wings', price: 450, description: 'Spicy grilled wings', isAvailable: true },
    { tenantId, categoryId: categories[1]._id, name: 'Grilled Chicken', price: 850, description: 'Served with rice & veggies', isAvailable: true },
    { tenantId, categoryId: categories[1]._id, name: 'Beef Steak', price: 1200, description: 'Premium cut, chips & salad', isAvailable: true },
    { tenantId, categoryId: categories[1]._id, name: 'Fish Fillet', price: 950, description: 'Fresh tilapia fillet', isAvailable: true },
    { tenantId, categoryId: categories[2]._id, name: 'Fresh Juice', price: 250, description: 'Mango, orange, or passion', isAvailable: true },
    { tenantId, categoryId: categories[2]._id, name: 'Soda', price: 100, description: 'Assorted soft drinks', isAvailable: true },
    { tenantId, categoryId: categories[3]._id, name: 'Ice Cream', price: 300, description: 'Vanilla, chocolate, strawberry', isAvailable: true },
  ]);

  // Tables
  await Table.insertMany([
    { tenantId, number: 'T1', section: 'Indoor', capacity: 2, status: 'available' },
    { tenantId, number: 'T2', section: 'Indoor', capacity: 4, status: 'available' },
    { tenantId, number: 'T3', section: 'Indoor', capacity: 4, status: 'available' },
    { tenantId, number: 'T4', section: 'Outdoor', capacity: 6, status: 'available' },
    { tenantId, number: 'T5', section: 'Outdoor', capacity: 2, status: 'available' },
  ]);

  console.log('     - Menu categories, items, and tables seeded');
};

const seedPharmaData = async (tenantId) => {
  const MedicineCategory = require('../models/pharma/MedicineCategory');
  const Medicine = require('../models/pharma/Medicine');

  const categories = await MedicineCategory.insertMany([
    { tenantId, name: 'Pain Relief', description: 'Analgesics & painkillers', isActive: true },
    { tenantId, name: 'Antibiotics', description: 'Antibacterial medications', isActive: true },
    { tenantId, name: 'Vitamins', description: 'Supplements & vitamins', isActive: true },
    { tenantId, name: 'First Aid', description: 'Bandages & first aid items', isActive: true },
  ]);

  await Medicine.insertMany([
    { tenantId, categoryId: categories[0]._id, name: 'Paracetamol', genericName: 'Acetaminophen', dosage: '500mg', buyingPrice: 50, sellingPrice: 100, stock: 200, expiryDate: new Date('2027-12-31'), batchNo: 'BATCH-001' },
    { tenantId, categoryId: categories[0]._id, name: 'Ibuprofen', genericName: 'Ibuprofen', dosage: '400mg', buyingPrice: 80, sellingPrice: 150, stock: 150, expiryDate: new Date('2027-06-30'), batchNo: 'BATCH-002' },
    { tenantId, categoryId: categories[1]._id, name: 'Amoxicillin', genericName: 'Amoxicillin', dosage: '250mg', buyingPrice: 120, sellingPrice: 200, stock: 100, expiryDate: new Date('2026-12-31'), batchNo: 'BATCH-003' },
    { tenantId, categoryId: categories[2]._id, name: 'Vitamin C', genericName: 'Ascorbic Acid', dosage: '1000mg', buyingPrice: 150, sellingPrice: 300, stock: 80, expiryDate: new Date('2028-03-31'), batchNo: 'BATCH-004' },
  ]);

  console.log('     - Medicine categories and medicines seeded');
};

const seedApartmentData = async (tenantId) => {
  const Property = require('../models/apartment/Property');
  const Unit = require('../models/apartment/Unit');

  const property = await Property.create({
    tenantId,
    name: 'Sunset Apartments',
    location: 'Kilimani, Nairobi',
    totalUnits: 5,
    description: 'Modern apartments with amenities',
    isActive: true,
  });

  await Unit.insertMany([
    { tenantId, propertyId: property._id, number: 'A1', type: '1 Bedroom', rent: 15000, deposit: 15000, status: 'vacant' },
    { tenantId, propertyId: property._id, number: 'A2', type: '1 Bedroom', rent: 15000, deposit: 15000, status: 'vacant' },
    { tenantId, propertyId: property._id, number: 'B1', type: '2 Bedroom', rent: 25000, deposit: 25000, status: 'vacant' },
    { tenantId, propertyId: property._id, number: 'B2', type: '2 Bedroom', rent: 25000, deposit: 25000, status: 'occupied' },
    { tenantId, propertyId: property._id, number: 'C1', type: 'Studio', rent: 10000, deposit: 10000, status: 'vacant' },
  ]);

  console.log('     - Property and units seeded');
};

const seedElectroData = async (tenantId) => {
  const ProductCategory = require('../models/electro/ProductCategory');
  const Product = require('../models/electro/Product');

  const categories = await ProductCategory.insertMany([
    { tenantId, name: 'Phones', description: 'Smartphones & accessories', isActive: true },
    { tenantId, name: 'Laptops', description: 'Computers & accessories', isActive: true },
    { tenantId, name: 'Accessories', description: 'Chargers, cables, cases', isActive: true },
  ]);

  await Product.insertMany([
    { tenantId, categoryId: categories[0]._id, name: 'iPhone 15', brand: 'Apple', model: 'A2846', buyingPrice: 120000, sellingPrice: 145000, stock: 5, serialNo: 'SN-IP15-001', warranty: '12 months' },
    { tenantId, categoryId: categories[0]._id, name: 'Samsung S24', brand: 'Samsung', model: 'SM-S921B', buyingPrice: 95000, sellingPrice: 115000, stock: 8, serialNo: 'SN-SS24-001', warranty: '12 months' },
    { tenantId, categoryId: categories[1]._id, name: 'MacBook Air M3', brand: 'Apple', model: 'A3113', buyingPrice: 140000, sellingPrice: 170000, stock: 3, serialNo: 'SN-MBA-001', warranty: '12 months' },
    { tenantId, categoryId: categories[1]._id, name: 'HP Pavilion', brand: 'HP', model: '15-eg2000', buyingPrice: 55000, sellingPrice: 70000, stock: 10, serialNo: 'SN-HP-001', warranty: '12 months' },
  ]);

  console.log('     - Product categories and products seeded');
};

const seedCyberData = async (tenantId) => {
  const Computer = require('../models/cyber/Computer');
  const Service = require('../models/cyber/Service');
  const Package = require('../models/cyber/Package');

  await Computer.insertMany([
    { tenantId, name: 'PC-01', status: 'available', hourlyRate: 60, specs: 'Core i5, 8GB RAM' },
    { tenantId, name: 'PC-02', status: 'available', hourlyRate: 60, specs: 'Core i5, 8GB RAM' },
    { tenantId, name: 'PC-03', status: 'available', hourlyRate: 80, specs: 'Core i7, 16GB RAM' },
    { tenantId, name: 'PC-04', status: 'available', hourlyRate: 60, specs: 'Core i5, 8GB RAM' },
    { tenantId, name: 'PC-05', status: 'maintenance', hourlyRate: 80, specs: 'Core i7, 16GB RAM' },
  ]);

  await Service.insertMany([
    { tenantId, name: 'Printing B/W', ratePerPage: 10, category: 'printing' },
    { tenantId, name: 'Printing Color', ratePerPage: 30, category: 'printing' },
    { tenantId, name: 'Scanning', ratePerPage: 15, category: 'scanning' },
    { tenantId, name: 'Typing', ratePerPage: 50, category: 'typing' },
    { tenantId, name: 'Lamination', ratePerItem: 100, category: 'other' },
    { tenantId, name: 'Binding', ratePerItem: 150, category: 'other' },
  ]);

  await Package.insertMany([
    { tenantId, name: '1 Hour', hours: 1, price: 50, validityDays: 7 },
    { tenantId, name: '5 Hours', hours: 5, price: 200, validityDays: 30 },
    { tenantId, name: '10 Hours', hours: 10, price: 350, validityDays: 30 },
    { tenantId, name: 'Monthly Unlimited', hours: -1, price: 2000, validityDays: 30 },
  ]);

  console.log('     - Computers, services, and packages seeded');
};

// ============================================
// Main CLI Loop
// ============================================

const main = async () => {
  const connected = await connectDB();
  if (!connected) {
    rl.close();
    process.exit(1);
  }

  // Check for --fresh flag
  const args = process.argv.slice(2);
  if (args.includes('--fresh')) {
    console.log('\n⚠️  --fresh flag detected. Dropping existing demo data...\n');
    await Tenant.deleteMany({ slug: /^demo-/ });
    console.log('  Demo data cleared.\n');
  }

  while (true) {
    showMenu();
    const choice = await question('\n  Enter option: ');

    switch (choice) {
      case '1':
        await seedAll();
        break;
      case '2':
        await seedSettings();
        break;
      case '3':
        await seedLegals();
        break;
      case '4':
        await seedPlans();
        break;
      case '5':
        await seedDemoTenant();
        break;
      case '6':
        await seedSpecificModule();
        break;
      case '0':
        console.log('\n👋 Goodbye!\n');
        await mongoose.disconnect();
        rl.close();
        process.exit(0);
      default:
        console.log('\n❌ Invalid option. Try again.\n');
    }
  }
};

main();