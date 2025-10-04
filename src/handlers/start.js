const { mainKeyboard } = require('../utils/keyboards');
const Admin = require('../models/Admin');

const startHandler = async (ctx) => {
  const username = ctx.from?.username?.toLowerCase();
  
  // التحقق من وجود اسم مستخدم
  if (!username) {
    return ctx.reply(
      '❌ عذراً، يجب أن يكون لديك اسم مستخدم (@username) في تيليجرام لاستخدام هذا البوت.\n\n' +
      'يرجى إضافة اسم مستخدم من إعدادات تيليجرام ثم إعادة المحاولة.'
    );
  }

  // التحقق من صلاحية المستخدم
  let isAdmin = false;
  if (username === process.env.SUPER_ADMIN_USERNAME.toLowerCase()) {
    isAdmin = true;
  } else {
    const admin = await Admin.findOne({ username });
    if (admin) {
      isAdmin = true;
    }
  }

  const firstName = ctx.from.first_name || 'المستخدم';
  
  const welcomeMessage = 
    `مرحباً بك ${firstName} 👋\n\n` +
    `🏫 *بوت إدارة المدرسة*\n\n` +
    `من خلال هذا البوت يمكنك:\n` +
    `• عرض المراحل الدراسية\n` +
    `• البحث عن معلومات الطلاب\n` +
    `• عرض الدرجات والنتائج\n\n` +
    (isAdmin ? `✅ لديك صلاحيات إدارية\n` : '') +
    `اختر من القائمة أدناه:`;

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    ...mainKeyboard(isAdmin)
  });
};

const backToMainHandler = async (ctx) => {
  await ctx.answerCbQuery();
  
  const username = ctx.from?.username?.toLowerCase();
  let isAdmin = false;
  
  if (username === process.env.SUPER_ADMIN_USERNAME.toLowerCase()) {
    isAdmin = true;
  } else {
    const admin = await Admin.findOne({ username });
    if (admin) {
      isAdmin = true;
    }
  }

  await ctx.editMessageText(
    `🏠 *القائمة الرئيسية*\n\nاختر من القائمة أدناه:`,
    {
      parse_mode: 'Markdown',
      ...mainKeyboard(isAdmin)
    }
  );
};

module.exports = {
  startHandler,
  backToMainHandler
};