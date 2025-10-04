const Admin = require('../models/Admin');

// التحقق من أن المستخدم سوبر أدمن
const isSuperAdmin = async (ctx, next) => {
  const username = ctx.from?.username?.toLowerCase();
  
  if (!username) {
    return ctx.reply('❌ يجب أن يكون لديك اسم مستخدم في تيليجرام للاستخدام');
  }

  if (username === process.env.SUPER_ADMIN_USERNAME.toLowerCase()) {
    ctx.state.adminRole = 'super';
    return next();
  }

  return ctx.reply('⛔ هذه الميزة متاحة للسوبر أدمن فقط');
};

// التحقق من أن المستخدم أدمن (أي نوع)
const isAdmin = async (ctx, next) => {
  const username = ctx.from?.username?.toLowerCase();
  
  if (!username) {
    return ctx.reply('❌ يجب أن يكون لديك اسم مستخدم في تيليجرام للاستخدام');
  }

  // التحقق من السوبر أدمن
  if (username === process.env.SUPER_ADMIN_USERNAME.toLowerCase()) {
    ctx.state.adminRole = 'super';
    return next();
  }

  // التحقق من المشرفين بالـ Username
  try {
    const admin = await Admin.findOne({ username });
    
    if (admin) {
      ctx.state.adminRole = admin.role;
      return next();
    }
  } catch (error) {
    console.error('خطأ في التحقق من الصلاحيات:', error);
  }

  // الرد للمستخدمين غير المصرح لهم
  return ctx.reply(
    '⛔ *عذراً، لا تملك صلاحيات الإدارة*\n\n' +
    'هذه الميزة متاحة للمشرفين فقط.\n' +
    'إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الإدارة.',
    { parse_mode: 'Markdown' }
  );
};

// التحقق من صلاحية إدارة الطلاب
const canManageStudents = async (ctx, next) => {
  const username = ctx.from?.username?.toLowerCase();
  
  if (!username) {
    return ctx.answerCbQuery('❌ يجب أن يكون لديك اسم مستخدم في تيليجرام', { show_alert: true });
  }

  // السوبر أدمن
  if (username === process.env.SUPER_ADMIN_USERNAME.toLowerCase()) {
    ctx.state.adminRole = 'super';
    return next();
  }

  // الأدمن المتوسط
  try {
    const admin = await Admin.findOne({ username });
    if (admin && (admin.role === 'medium' || admin.role === 'super')) {
      ctx.state.adminRole = admin.role;
      return next();
    }
  } catch (error) {
    console.error('خطأ في التحقق من الصلاحيات:', error);
  }

  return ctx.answerCbQuery('⛔ هذه الميزة متاحة للسوبر أدمن والأدمن المتوسط فقط', { show_alert: true });
};

// التحقق من صلاحية إدارة الدرجات
const canManageGrades = async (ctx, next) => {
  const username = ctx.from?.username?.toLowerCase();
  
  if (!username) {
    return ctx.answerCbQuery('❌ يجب أن يكون لديك اسم مستخدم في تيليجرام', { show_alert: true });
  }

  // السوبر أدمن
  if (username === process.env.SUPER_ADMIN_USERNAME.toLowerCase()) {
    ctx.state.adminRole = 'super';
    return next();
  }

  // أي أدمن يمكنه إدارة الدرجات
  try {
    const admin = await Admin.findOne({ username });
    if (admin) {
      ctx.state.adminRole = admin.role;
      return next();
    }
  } catch (error) {
    console.error('خطأ في التحقق من الصلاحيات:', error);
  }

  return ctx.answerCbQuery('⛔ هذه الميزة متاحة للمشرفين فقط', { show_alert: true });
};

module.exports = {
  isSuperAdmin,
  isAdmin,
  canManageStudents,
  canManageGrades
};