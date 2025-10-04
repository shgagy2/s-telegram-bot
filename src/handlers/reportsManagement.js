const Student = require('../models/Student');
const Admin = require('../models/Admin');
const { errorMessage, getRoleNameArabic } = require('../utils/helpers');
const { Markup } = require('telegraf');

// عرض لوحة التقارير
const showReports = async (ctx) => {
  await ctx.answerCbQuery();
  
  await ctx.editMessageText(
    `📈 *التقارير والإحصائيات*\n\nاختر نوع التقرير:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📊 إحصائيات عامة', 'report_general')],
        [Markup.button.callback('🏫 إحصائيات المراحل', 'report_grades')],
        [Markup.button.callback('❌ تقرير الغياب', 'report_absences')],
        [Markup.button.callback('👨‍💼 المشرفون', 'report_admins')],
        [Markup.button.callback('🔙 رجوع', 'admin_panel')]
      ])
    }
  );
};

// تقرير الإحصائيات العامة
const showGeneralReport = async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    const totalStudents = await Student.countDocuments();
    const totalAdmins = await Admin.countDocuments();
    const totalAbsences = await Student.aggregate([
      { $group: { _id: null, total: { $sum: '$absences' } } }
    ]);

    const grades = [
      'الأول متوسط', 'الثاني متوسط', 'الثالث متوسط',
      'الرابع علمي', 'الخامس علمي', 'السادس علمي'
    ];

    let gradeStats = '';
    for (const grade of grades) {
      const count = await Student.countDocuments({ grade });
      gradeStats += `• ${grade}: ${count} طالب\n`;
    }

    const message = 
      `📊 *الإحصائيات العامة*\n\n` +
      `👥 إجمالي الطلاب: ${totalStudents}\n` +
      `👨‍💼 إجمالي المشرفين: ${totalAdmins + 1}\n` +
      `❌ إجمالي أيام الغياب: ${totalAbsences[0]?.total || 0}\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🏫 *توزيع الطلاب على المراحل:*\n\n${gradeStats}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 رجوع', 'view_reports')]
      ])
    });
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// تقرير المراحل الدراسية
const showGradesReport = async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    const grades = [
      'الأول متوسط', 'الثاني متوسط', 'الثالث متوسط',
      'الرابع علمي', 'الخامس علمي', 'السادس علمي'
    ];

    let message = `🏫 *تقرير المراحل الدراسية*\n\n`;

    for (const grade of grades) {
      const students = await Student.find({ grade });
      const count = students.length;
      const totalAbsences = students.reduce((sum, s) => sum + s.absences, 0);
      const avgAbsences = count > 0 ? (totalAbsences / count).toFixed(1) : 0;

      message += `📚 *${grade}*\n`;
      message += `   👥 عدد الطلاب: ${count}\n`;
      message += `   ❌ إجمالي الغياب: ${totalAbsences} يوم\n`;
      message += `   📊 متوسط الغياب: ${avgAbsences} يوم/طالب\n`;
      message += `━━━━━━━━━━━━━━━━\n\n`;
    }

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 رجوع', 'view_reports')]
      ])
    });
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// تقرير الغياب
const showAbsencesReport = async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    const studentsWithAbsences = await Student.find({ absences: { $gt: 0 } })
      .sort({ absences: -1 })
      .limit(20);

    if (studentsWithAbsences.length === 0) {
      return ctx.editMessageText(
        `❌ *تقرير الغياب*\n\nلا يوجد طلاب لديهم غياب مسجل.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 رجوع', 'view_reports')]
          ])
        }
      );
    }

    let message = `❌ *تقرير الغياب*\n\nالطلاب الأكثر غياباً:\n\n`;

    studentsWithAbsences.forEach((student, index) => {
      message += `${index + 1}. ${student.name}\n`;
      message += `   🏫 ${student.grade}\n`;
      message += `   ❌ ${student.absences} يوم\n`;
      message += `━━━━━━━━━━━━━━━━\n`;
    });

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 رجوع', 'view_reports')]
      ])
    });
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// تقرير المشرفين
// تقرير المشرفين
const showAdminsReport = async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    const admins = await Admin.find().sort({ addedAt: -1 });

    let message = `👨‍💼 *تقرير المشرفين*\n\n`;
    message += `إجمالي المشرفين: ${admins.length + 1}\n\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;

    // السوبر أدمن
    message += `${getRoleNameArabic('super')}\n`;
    message += `👤 @${process.env.SUPER_ADMIN_USERNAME}\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;

    admins.forEach((admin, index) => {
      message += `${index + 1}. ${getRoleNameArabic(admin.role)}\n`;
      message += `   👤 @${admin.username}\n`;
      message += `   ➕ أضيف بواسطة: @${admin.addedBy}\n`;
      message += `━━━━━━━━━━━━━━━━\n`;
    });

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 رجوع', 'view_reports')]
      ])
    });
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

module.exports = {
  showReports,
  showGeneralReport,
  showGradesReport,
  showAbsencesReport,
  showAdminsReport
};