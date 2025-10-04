const Admin = require('../models/Admin');
const { 
  adminManagementKeyboard, 
  adminRoleKeyboard,
  adminKeyboard 
} = require('../utils/keyboards');
const { 
  getRoleNameArabic, 
  formatDate, 
  cleanUsername,
  errorMessage 
} = require('../utils/helpers');

// عرض لوحة إدارة المشرفين
const showAdminManagement = async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `👨‍💼 *إدارة المشرفين*\n\nاختر العملية التي تريد تنفيذها:`,
    {
      parse_mode: 'Markdown',
      ...adminManagementKeyboard()
    }
  );
};

// بدء عملية إضافة مشرف
const startAddAdmin = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.awaitingAdminUsername = true;
  
  await ctx.reply(
    `➕ *إضافة مشرف جديد*\n\n` +
    `يرجى إرسال اسم المستخدم (Username) للمشرف الجديد:\n` +
    `مثال: username أو @username\n\n` +
    `📌 ملاحظة: يجب أن يكون لدى المستخدم حساب تيليجرام باسم مستخدم فعال`,
    { parse_mode: 'Markdown' }
  );
};

// معالجة اسم المستخدم واختيار الصلاحية
const processAdminUsername = async (ctx) => {
  const username = cleanUsername(ctx.message.text);
  
  if (!username || username.length < 5) {
    return ctx.reply('❌ اسم المستخدم غير صحيح. يرجى إرسال اسم مستخدم صحيح.');
  }

  // التحقق من أن المستخدم ليس سوبر أدمن
  if (username === process.env.SUPER_ADMIN_USERNAME.toLowerCase()) {
    return ctx.reply('❌ لا يمكن إضافة السوبر أدمن كمشرف عادي!');
  }

  // التحقق من وجود المشرف مسبقاً
  const existingAdmin = await Admin.findOne({ username });
  if (existingAdmin) {
    return ctx.reply(
      `⚠️ هذا المستخدم مشرف بالفعل!\n\n` +
      `الصلاحية الحالية: ${getRoleNameArabic(existingAdmin.role)}`
    );
  }

  ctx.session.newAdminUsername = username;
  ctx.session.awaitingAdminUsername = false;

  await ctx.reply(
    `✅ اسم المستخدم: @${username}\n\n` +
    `الآن اختر نوع الصلاحية للمشرف الجديد:`,
    adminRoleKeyboard()
  );
};

// إضافة المشرف بالصلاحية المحددة
const addAdminWithRole = async (ctx, role) => {
  await ctx.answerCbQuery();
  
  if (!ctx.session?.newAdminUsername) {
    return ctx.reply('❌ حدث خطأ. يرجى إعادة العملية من البداية.');
  }

  try {
    const newAdmin = new Admin({
      username: ctx.session.newAdminUsername,
      role: role,
      addedBy: ctx.from.username
    });

    await newAdmin.save();
    
    ctx.session.newAdminUsername = null;

    await ctx.editMessageText(
      `✅ *تم إضافة المشرف بنجاح!*\n\n` +
      `👤 اسم المستخدم: @${newAdmin.username}\n` +
      `🎖️ الصلاحية: ${getRoleNameArabic(role)}\n` +
      `📅 تاريخ الإضافة: ${formatDate(newAdmin.addedAt)}`,
      {
        parse_mode: 'Markdown',
        ...adminManagementKeyboard()
      }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// عرض قائمة المشرفين
const listAdmins = async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    const admins = await Admin.find().sort({ addedAt: -1 });
    
    if (admins.length === 0) {
      return ctx.editMessageText(
        `📋 *قائمة المشرفين*\n\n` +
        `لا يوجد مشرفين حالياً.`,
        {
          parse_mode: 'Markdown',
          ...adminManagementKeyboard()
        }
      );
    }

    let message = `📋 *قائمة المشرفين* (${admins.length})\n\n`;
    
    // إضافة السوبر أدمن
    message += `${getRoleNameArabic('super')}\n`;
    message += `👤 @${process.env.SUPER_ADMIN_USERNAME}\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;

    admins.forEach((admin, index) => {
      message += `${index + 1}. ${getRoleNameArabic(admin.role)}\n`;
      message += `👤 @${admin.username}\n`;
      message += `📅 تاريخ الإضافة: ${formatDate(admin.addedAt)}\n`;
      message += `━━━━━━━━━━━━━━━━\n\n`;
    });

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...adminManagementKeyboard()
    });
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// بدء عملية حذف مشرف
const startRemoveAdmin = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.awaitingRemoveAdmin = true;
  
  await ctx.reply(
    `🗑️ *حذف مشرف*\n\n` +
    `يرجى إرسال اسم المستخدم للمشرف المراد حذفه:\n` +
    `مثال: username أو @username`,
    { parse_mode: 'Markdown' }
  );
};

// معالجة حذف المشرف
const processRemoveAdmin = async (ctx) => {
  const username = cleanUsername(ctx.message.text);
  
  if (!username) {
    return ctx.reply('❌ اسم المستخدم غير صحيح.');
  }

  // التحقق من عدم حذف السوبر أدمن
  if (username === process.env.SUPER_ADMIN_USERNAME.toLowerCase()) {
    return ctx.reply('❌ لا يمكن حذف السوبر أدمن!');
  }

  try {
    const admin = await Admin.findOneAndDelete({ username });
    
    if (!admin) {
      return ctx.reply(`❌ لم يتم العثور على مشرف بهذا الاسم: @${username}`);
    }

    ctx.session.awaitingRemoveAdmin = false;

    await ctx.reply(
      `✅ *تم حذف المشرف بنجاح!*\n\n` +
      `👤 اسم المستخدم: @${admin.username}\n` +
      `🎖️ الصلاحية السابقة: ${getRoleNameArabic(admin.role)}`,
      {
        parse_mode: 'Markdown',
        ...adminManagementKeyboard()
      }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

module.exports = {
  showAdminManagement,
  startAddAdmin,
  processAdminUsername,
  addAdminWithRole,
  listAdmins,
  startRemoveAdmin,
  processRemoveAdmin
};