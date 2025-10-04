require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const connectDB = require('./config/database');
const Admin = require('./models/Admin');
const Student = require('./models/Student');

// استيراد المعالجات
const { startHandler, backToMainHandler } = require('./handlers/start');
const { 
  isSuperAdmin, 
  isAdmin, 
  canManageStudents, 
  canManageGrades 
} = require('./middleware/auth');
const { adminKeyboard } = require('./utils/keyboards');

// معالجات الإدارة
const adminManagement = require('./handlers/adminManagement');
const studentManagement = require('./handlers/studentManagement');
const gradeManagement = require('./handlers/gradeManagement');
const absenceManagement = require('./handlers/absenceManagement');
const reportsManagement = require('./handlers/reportsManagement');

// الاتصال بقاعدة البيانات
connectDB();

// إنشاء البوت
const bot = new Telegraf(process.env.BOT_TOKEN);

// استخدام الجلسات
bot.use(session());

// معالج الأخطاء العام
bot.catch((err, ctx) => {
  console.error('خطأ في البوت:', err);
  ctx.reply('❌ حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.');
});

// ═══════════════════════════════════════
// الأوامر الأساسية
// ═══════════════════════════════════════

bot.start(startHandler);

// أمر الوصول المباشر للوحة الإدارة
// أمر الوصول المباشر للوحة الإدارة
bot.command('admin', async (ctx) => {
  const username = ctx.from?.username?.toLowerCase();
  
  if (!username) {
    return ctx.reply('❌ يجب أن يكون لديك اسم مستخدم في تيليجرام للاستخدام');
  }

  // التحقق من السوبر أدمن
  if (username === process.env.SUPER_ADMIN_USERNAME.toLowerCase()) {
    const { getRoleNameArabic } = require('./utils/helpers');
    return ctx.reply(
      `⚙️ *لوحة الإدارة*\n\n` +
      `مرحباً @${ctx.from.username} 👋\n` +
      `صلاحيتك: ${getRoleNameArabic('super')}`,
      {
        parse_mode: 'Markdown',
        ...adminKeyboard('super')
      }
    );
  }

  // التحقق من المشرفين بالـ Username
  try {
    const admin = await Admin.findOne({ username });
    
    if (admin) {
      const { getRoleNameArabic } = require('./utils/helpers');
      return ctx.reply(
        `⚙️ *لوحة الإدارة*\n\n` +
        `مرحباً @${ctx.from.username} 👋\n` +
        `صلاحيتك: ${getRoleNameArabic(admin.role)}`,
        {
          parse_mode: 'Markdown',
          ...adminKeyboard(admin.role)
        }
      );
    }
  } catch (error) {
    console.error('خطأ في التحقق من المشرف:', error);
  }

  // المستخدمون العاديون
  return ctx.reply(
    '⛔ *عذراً، لا تملك صلاحيات الإدارة*\n\n' +
    'هذه الميزة متاحة للمشرفين فقط.\n' +
    'إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الإدارة.\n\n' +
    'يمكنك استخدام /start للعودة للقائمة الرئيسية.',
    { parse_mode: 'Markdown' }
  );
});
bot.command('cancel', (ctx) => {
  ctx.session = {};
  ctx.reply('✅ تم إلغاء العملية الحالية.', {
    reply_markup: { remove_keyboard: true }
  });
});

// ═══════════════════════════════════════
// لوحة الإدارة الرئيسية
// ═══════════════════════════════════════

bot.action('admin_panel', isAdmin, async (ctx) => {
  await ctx.answerCbQuery();
  
  const role = ctx.state.adminRole;
  
  await ctx.editMessageText(
    `⚙️ *لوحة الإدارة*\n\nمرحباً بك في لوحة التحكم`,
    {
      parse_mode: 'Markdown',
      ...adminKeyboard(role)
    }
  );
});

bot.action('back_to_main', backToMainHandler);

// ═══════════════════════════════════════
// إدارة المشرفين (Super Admin فقط)
// ═══════════════════════════════════════

bot.action('manage_admins', isSuperAdmin, adminManagement.showAdminManagement);
bot.action('add_admin', isSuperAdmin, adminManagement.startAddAdmin);
bot.action('list_admins', isSuperAdmin, adminManagement.listAdmins);
bot.action('remove_admin', isSuperAdmin, adminManagement.startRemoveAdmin);

// معالجات إضافة الأدمن
bot.action('role_medium', isSuperAdmin, (ctx) => 
  adminManagement.addAdminWithRole(ctx, 'medium')
);
bot.action('role_normal', isSuperAdmin, (ctx) => 
  adminManagement.addAdminWithRole(ctx, 'normal')
);

// ═══════════════════════════════════════
// إدارة الطلاب (Super & Medium Admin)
// ═══════════════════════════════════════

bot.action('manage_students', canManageStudents, studentManagement.showStudentManagement);
bot.action('add_student', canManageStudents, studentManagement.startAddStudent);
bot.action('list_students', canManageStudents, studentManagement.startListStudents);
bot.action('edit_student', canManageStudents, studentManagement.startEditStudent);
bot.action('delete_student', canManageStudents, studentManagement.startDeleteStudent);

// ═══════════════════════════════════════
// إدارة الغياب والملاحظات (Super & Medium Admin)
// ═══════════════════════════════════════

bot.action('manage_absences', canManageStudents, absenceManagement.showAbsenceManagement);
bot.action('record_absence', canManageStudents, absenceManagement.startRecordAbsence);
bot.action('add_note', canManageStudents, absenceManagement.startAddNote);
bot.action('view_absence_notes', canManageStudents, absenceManagement.startViewAbsenceNotes);

// معالجات اختيار الطالب للغياب والملاحظات
bot.action(/^select_student_absence_(.+)$/, canManageStudents, absenceManagement.selectStudentForAbsence);
bot.action(/^select_student_note_(.+)$/, canManageStudents, absenceManagement.selectStudentForNote);

// ═══════════════════════════════════════
// إدارة الدرجات (جميع المشرفين)
// ═══════════════════════════════════════

bot.action('manage_grades', canManageGrades, gradeManagement.showGradeManagement);
bot.action('enter_sem1_grades', canManageGrades, gradeManagement.startSemester1Grades);
bot.action('enter_sem2_grades', canManageGrades, gradeManagement.startSemester2Grades);
bot.action('view_student_grades', canManageGrades, gradeManagement.startViewStudentGrades);

// معالجات اختيار الشهر والفترة
bot.action(/^month_(sem\d)_(\d)$/, canManageGrades, gradeManagement.processMonthSelection);
bot.action(/^avg_(sem\d)$/, canManageGrades, gradeManagement.processAverageSelection);
bot.action(/^midyear_(sem\d)$/, canManageGrades, gradeManagement.processMidYearSelection);
bot.action(/^endyear_(sem\d)$/, canManageGrades, gradeManagement.processEndYearSelection);

// معالج اختيار طالب للدرجات
bot.action(/^select_student_grade_(.+)$/, canManageGrades, gradeManagement.selectStudentFromButton);

// معالج عرض معلومات طالب كاملة
bot.action(/^view_student_full_(.+)$/, async (ctx) => {
  const studentId = ctx.match[1];
  await ctx.answerCbQuery();
  
  try {
    const student = await Student.findById(studentId);
    if (student) {
      await gradeManagement.displayStudentGrades(ctx, student);
    }
  } catch (error) {
    ctx.reply('❌ حدث خطأ في عرض بيانات الطالب');
  }
});

// ═══════════════════════════════════════
// التقارير والإحصائيات (جميع المشرفين)
// ═══════════════════════════════════════

bot.action('view_reports', isAdmin, reportsManagement.showReports);
bot.action('report_general', isAdmin, reportsManagement.showGeneralReport);
bot.action('report_grades', isAdmin, reportsManagement.showGradesReport);
bot.action('report_absences', isAdmin, reportsManagement.showAbsencesReport);
bot.action('report_admins', isSuperAdmin, reportsManagement.showAdminsReport);

// ═══════════════════════════════════════
// معالجات المراحل الدراسية
// ═══════════════════════════════════════

const { gradesKeyboard } = require('./utils/keyboards');

bot.action('view_grades', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🏫 *المراحل الدراسية*\n\nاختر المرحلة لعرض طلابها:`,
    {
      parse_mode: 'Markdown',
      ...gradesKeyboard()
    }
  );
});

// معالج اختيار المرحلة
bot.action(/^grade_(.+)$/, async (ctx) => {
  const grade = ctx.match[1];
  
  // إذا كان المستخدم يضيف طالب
  if (ctx.session?.addingStudent) {
    return studentManagement.processGradeSelection(ctx);
  }
  
  // إذا كان يعرض قائمة الطلاب
  if (ctx.session?.listingStudents) {
    return studentManagement.listStudentsByGrade(ctx, grade);
  }
  
  // عرض عادي للمرحلة
  const students = await Student.find({ grade }).sort({ name: 1 });
  
  await ctx.answerCbQuery();
  
  if (students.length === 0) {
    return ctx.editMessageText(
      `🏫 *${grade}*\n\nلا يوجد طلاب في هذه المرحلة حالياً.`,
      {
        parse_mode: 'Markdown',
        ...gradesKeyboard()
      }
    );
  }

  let message = `🏫 *${grade}*\n`;
  message += `عدد الطلاب: ${students.length}\n\n`;
  
  students.forEach((student, index) => {
    message += `${index + 1}. ${student.name}\n`;
  });

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...gradesKeyboard()
  });
});

// ═══════════════════════════════════════
// البحث عن طالب (متاح للجميع)
// ═══════════════════════════════════════

bot.action('search_student', async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.searchingStudentPublic = true;
  
  await ctx.reply(
    `🔍 *البحث عن طالب*\n\n` +
    `يرجى إرسال اسم الطالب (الاسم الثلاثي أو الرباعي):`,
    { parse_mode: 'Markdown' }
  );
});

// معالج البحث العام عن الطالب
const processPublicSearch = async (ctx) => {
  const searchTerm = ctx.message.text.trim();
  
  if (searchTerm.length < 2) {
    return ctx.reply('❌ يرجى إدخال على الأقل حرفين للبحث.');
  }

  try {
    const students = await Student.find({
      name: { $regex: searchTerm, $options: 'i' }
    }).limit(10);

    if (students.length === 0) {
      ctx.session.searchingStudentPublic = false;
      return ctx.reply(`❌ لم يتم العثور على نتائج للبحث عن: "${searchTerm}"`);
    }

    if (students.length === 1) {
      // عرض معلومات الطالب الكاملة مباشرة
      ctx.session.searchingStudentPublic = false;
      return await gradeManagement.displayStudentGrades(ctx, students[0]);
    }

    // عدة طلاب - عرضهم مع أزرار للاختيار
    const { Markup } = require('telegraf');
    const buttons = students.map(student => 
      [Markup.button.callback(
        `${student.name} - ${student.grade}`,
        `view_student_full_${student._id}`
      )]
    );
    buttons.push([Markup.button.callback('❌ إلغاء', 'back_to_main')]);

    ctx.session.searchingStudentPublic = false;

    return ctx.reply(
      `🔍 *نتائج البحث* (${students.length})\n\nاختر الطالب لعرض معلوماته الكاملة:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  } catch (error) {
    console.error('خطأ في البحث:', error);
    ctx.reply('❌ حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
  }
};

// ═══════════════════════════════════════
// معالجات الرسائل النصية
// ═══════════════════════════════════════

bot.on('text', async (ctx) => {
  const session = ctx.session || {};
  
  // البحث العام عن طالب (متاح للجميع)
  if (session.searchingStudentPublic) {
    return processPublicSearch(ctx);
  }
  
  // إدارة المشرفين
  if (session.awaitingAdminUsername) {
    return adminManagement.processAdminUsername(ctx);
  }
  
  if (session.awaitingRemoveAdmin) {
    return adminManagement.processRemoveAdmin(ctx);
  }
  
  // إدارة الطلاب
  if (session.awaitingStudentName) {
    return studentManagement.processStudentName(ctx);
  }
  
  if (session.awaitingStudentId === 'edit') {
    return studentManagement.processEditStudent(ctx);
  }
  
  if (session.editingStudentId) {
    return studentManagement.processStudentUpdate(ctx);
  }
  
  if (session.awaitingStudentId === 'delete') {
    return studentManagement.processDeleteStudent(ctx);
  }
  
  if (session.searchingStudent) {
    return studentManagement.processSearch(ctx);
  }
  
  // إدارة الغياب والملاحظات
  if (session.recordingAbsence) {
    return absenceManagement.processRecordAbsence(ctx);
  }
  
  if (session.awaitingAbsenceDays) {
    return absenceManagement.processAbsenceDays(ctx);
  }
  
  if (session.addingNote) {
    return absenceManagement.processNoteStudentName(ctx);
  }
  
  if (session.awaitingNoteText) {
    return absenceManagement.processNoteText(ctx);
  }
  
  if (session.viewingAbsenceNotes) {
    return absenceManagement.processViewAbsenceNotes(ctx);
  }
  
  // إدارة الدرجات
  if (session.awaitingStudentNameForGrades) {
    return gradeManagement.processStudentNameForGrades(ctx);
  }
  
  if (session.awaitingGradeData) {
    return gradeManagement.processGradeInput(ctx);
  }
  
  if (session.viewingGrades) {
    return gradeManagement.processViewGrades(ctx);
  }
  
  // رسالة افتراضية
  ctx.reply('استخدم /start للعودة إلى القائمة الرئيسية');
});

// ═══════════════════════════════════════
// زر الإلغاء
// ═══════════════════════════════════════

bot.action('cancel_operation', (ctx) => {
  ctx.session = {};
  ctx.answerCbQuery('✅ تم إلغاء العملية');
  ctx.reply('تم إلغاء العملية الحالية. استخدم /start للعودة للقائمة الرئيسية.');
});

// ═══════════════════════════════════════
// تشغيل البوت
// ═══════════════════════════════════════

bot.launch()
  .then(() => {
    console.log('🤖 البوت يعمل الآن...');
    console.log(`👑 السوبر أدمن ID: ${process.env.SUPER_ADMIN_ID}`);
  })
  .catch((error) => {
    console.error('❌ خطأ في تشغيل البوت:', error);
  });

// التعامل مع إيقاف البوت بشكل سليم
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));