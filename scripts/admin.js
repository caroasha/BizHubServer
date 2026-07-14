require('./dnsSet');
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Admin = require('../models/admin/Admin');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizhub';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

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

const showMenu = () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║        BIZHUB ADMIN CLI              ║');
  console.log('╠══════════════════════════════════════╣');
  console.log('║  SUPER ADMINS                        ║');
  console.log('║  1. List all super admins            ║');
  console.log('║  2. Create super admin               ║');
  console.log('║  3. Update super admin password      ║');
  console.log('║  4. Delete super admin               ║');
  console.log('║                                      ║');
  console.log('║  DATABASE                            ║');
  console.log('║  5. List all collections             ║');
  console.log('║  6. Drop a collection                ║');
  console.log('║  7. Drop entire database             ║');
  console.log('║                                      ║');
  console.log('║  0. Exit                             ║');
  console.log('╚══════════════════════════════════════╝');
};

const listAdmins = async () => {
  console.log('\n📋 SUPER ADMINS:\n');
  const admins = await Admin.find({ role: 'super_admin' }).select('-password');

  if (admins.length === 0) {
    console.log('  No super admins found.\n');
    return;
  }

  admins.forEach((admin, index) => {
    console.log(`  ${index + 1}. ${admin.name}`);
    console.log(`     Email: ${admin.email}`);
    console.log(`     Phone: ${admin.phone}`);
    console.log(`     Active: ${admin.isActive ? 'Yes' : 'No'}`);
    console.log(`     Last Login: ${admin.lastLogin || 'Never'}`);
    console.log(`     Created: ${admin.createdAt}\n`);
  });
};

const createAdmin = async () => {
  console.log('\n➕ CREATE SUPER ADMIN\n');

  const name = await question('  Name: ');
  const email = await question('  Email: ');
  const phone = await question('  Phone (2547XXXXXXXX): ');
  const password = await question('  Password: ');

  if (!name || !email || !phone || !password) {
    console.log('\n❌ All fields are required.\n');
    return;
  }

  const exists = await Admin.findOne({ email });
  if (exists) {
    console.log('\n❌ Admin with this email already exists.\n');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await Admin.create({
    name,
    email,
    phone,
    password: hashedPassword,
    role: 'super_admin',
    permissions: ['all'],
    isActive: true,
  });

  console.log(`\n✅ Super admin created: ${name} (${email})\n`);
  console.log('   You can now login at: http://localhost:5000/api/v1/admin/auth/login\n');
};

const updateAdmin = async () => {
  console.log('\n🔒 UPDATE SUPER ADMIN PASSWORD\n');

  const email = await question('  Admin email: ');
  const password = await question('  New password: ');

  if (!email || !password) {
    console.log('\n❌ Email and password are required.\n');
    return;
  }

  const admin = await Admin.findOne({ email, role: 'super_admin' });
  if (!admin) {
    console.log('\n❌ Super admin not found.\n');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  admin.password = hashedPassword;
  await admin.save();

  console.log(`\n✅ Password updated for: ${admin.name}\n`);
};

const deleteAdmin = async () => {
  console.log('\n🗑️  DELETE SUPER ADMIN\n');

  const admins = await Admin.find({ role: 'super_admin' }).select('-password');

  if (admins.length === 0) {
    console.log('  No super admins found.\n');
    return;
  }

  admins.forEach((admin, index) => {
    console.log(`  ${index + 1}. ${admin.name} (${admin.email})`);
  });

  const choice = await question('\n  Select number to delete (0 to cancel): ');
  const index = parseInt(choice) - 1;

  if (choice === '0' || isNaN(index) || index < 0 || index >= admins.length) {
    console.log('\n  Cancelled.\n');
    return;
  }

  if (admins.length === 1) {
    console.log('\n❌ Cannot delete the last super admin.\n');
    return;
  }

  const admin = admins[index];
  const confirm = await question(`\n  ⚠️  Delete ${admin.name}? Type "DELETE" to confirm: `);

  if (confirm !== 'DELETE') {
    console.log('\n  Cancelled.\n');
    return;
  }

  await Admin.findByIdAndDelete(admin._id);
  console.log(`\n✅ Deleted: ${admin.name}\n`);
};

const listCollections = async () => {
  console.log('\n📦 DATABASE COLLECTIONS:\n');

  const collections = await mongoose.connection.db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('  No collections found.\n');
    return;
  }

  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`  📁 ${col.name} (${count} documents)`);
  }
  console.log('');
};

const dropCollection = async () => {
  console.log('\n🗑️  DROP COLLECTION\n');

  const collections = await mongoose.connection.db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('  No collections found.\n');
    return;
  }

  collections.forEach((col, index) => {
    console.log(`  ${index + 1}. ${col.name}`);
  });

  const choice = await question('\n  Select number to drop (0 to cancel): ');
  const index = parseInt(choice) - 1;

  if (choice === '0' || isNaN(index) || index < 0 || index >= collections.length) {
    console.log('\n  Cancelled.\n');
    return;
  }

  const colName = collections[index].name;
  const confirm = await question(`\n  ⚠️  Drop "${colName}"? Type "DROP" to confirm: `);

  if (confirm !== 'DROP') {
    console.log('\n  Cancelled.\n');
    return;
  }

  await mongoose.connection.db.dropCollection(colName);
  console.log(`\n✅ Dropped collection: ${colName}\n`);
};

const dropDatabase = async () => {
  console.log('\n⚠️  DROP ENTIRE DATABASE\n');
  console.log('  This will delete ALL data permanently.\n');

  const confirm = await question('  Type "DROP DATABASE" to confirm: ');

  if (confirm !== 'DROP DATABASE') {
    console.log('\n  Cancelled.\n');
    return;
  }

  const finalConfirm = await question('  Are you sure? Type "YES I AM SURE" to proceed: ');

  if (finalConfirm !== 'YES I AM SURE') {
    console.log('\n  Cancelled.\n');
    return;
  }

  await mongoose.connection.db.dropDatabase();
  console.log('\n✅ Database dropped successfully.\n');
};

const main = async () => {
  const connected = await connectDB();
  if (!connected) {
    rl.close();
    process.exit(1);
  }

  while (true) {
    showMenu();
    const choice = await question('\n  Enter option: ');

    switch (choice) {
      case '1':
        await listAdmins();
        break;
      case '2':
        await createAdmin();
        break;
      case '3':
        await updateAdmin();
        break;
      case '4':
        await deleteAdmin();
        break;
      case '5':
        await listCollections();
        break;
      case '6':
        await dropCollection();
        break;
      case '7':
        await dropDatabase();
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