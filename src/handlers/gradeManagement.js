const Student = require('../models/Student');
const { 
  gradeManagementKeyboard, 
  monthKeyboard,
  gradesKeyboard,
  cancelKeyboard 
} = require('../utils/keyboards');
const { formatGradesDisplay, errorMessage } = require('../utils/helpers');
const { Markup } = require('telegraf');

// عرض لوحة إدارة الدرجات
const showGradeManagement = async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📊 *إدارة الدرجات*\n\nاختر العملية التي تريد تنفيذها:`,
    {
      parse_mode: 'Markdown',
      ...gradeManagementKeyboard()
    }
  );
};

// بدء إدخال درجات الفصل الأول
const startSemester1Grades = async (ctx) => {
  await ctx.answerCbQuery();
  
  await ctx.editMessageText(
    `📝 *إدخال درجات الفصل الأول*\n\nاختر الفترة:`,
    {
      parse_mode: 'Markdown',
      ...monthKeyboard('sem1')
    }
  );
};

// بدء إدخال درجات الفصل الثاني
const startSemester2Grades = async (ctx) => {
  await ctx.answerCbQuery();
  
  await ctx.editMessageText(
    `📝 *إدخال درجات الفصل الثاني*\n\nاختر الفترة:`,
    {
      parse_mode: 'Markdown',
      ...monthKeyboard('sem2')
    }
  );
};

// معالجة اختيار الشهر
const processMonthSelection = async (ctx) => {
  const [, semester, month] = ctx.match;
  
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.gradeSemester = semester;
  ctx.session.gradeMonth = month;
  ctx.session.awaitingStudentNameForGrades = true;
  
  const periodName = month === '1' ? 'الشهر الأول' : 'الشهر الثاني';
  const semesterName = semester === 'sem1' ? 'الفصل الأول' : 'الفصل الثاني';
  
  await ctx.reply(
    `📝 *إدخال درجات ${semesterName} - ${periodName}*\n\n` +
    `يرجى إرسال اسم الطالب (الاسم الثلاثي أو الرباعي):`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة اختيار معدل الفصل
const processAverageSelection = async (ctx) => {
  const [, semester] = ctx.match;
  
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.gradeSemester = semester;
  ctx.session.gradeMonth = 'average';
  ctx.session.awaitingStudentNameForGrades = true;
  
  const semesterName = semester === 'sem1' ? 'الفصل الأول' : 'الفصل الثاني';
  
  await ctx.reply(
    `📊 *إدخال معدل ${semesterName}*\n\n` +
    `يرجى إرسال اسم الطالب (الاسم الثلاثي أو الرباعي):`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة اختيار نصف السنة
const processMidYearSelection = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.gradeSemester = 'sem1';
  ctx.session.gradeMonth = 'midyear';
  ctx.session.awaitingStudentNameForGrades = true;
  
  await ctx.reply(
    `📈 *إدخال درجات نصف السنة*\n\n` +
    `يرجى إرسال اسم الطالب (الاسم الثلاثي أو الرباعي):`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة اختيار آخر السنة
const processEndYearSelection = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.gradeSemester = 'sem2';
  ctx.session.gradeMonth = 'endyear';
  ctx.session.awaitingStudentNameForGrades = true;
  
  await ctx.reply(
    `🎓 *إدخال درجات آخر السنة*\n\n` +
    `يرجى إرسال اسم الطالب (الاسم الثلاثي أو الرباعي):`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة اسم الطالب لإدخال الدرجات
const processStudentNameForGrades = async (ctx) => {
  const studentName = ctx.message.text.trim();
  
  try {
    // البحث عن الطالب بالاسم
    const students = await Student.find({
      name: { $regex: studentName, $options: 'i' }
    }).limit(5);

    if (students.length === 0) {
      return ctx.reply(
        `❌ لم يتم العثور على طالب باسم: "${studentName}"\n\n` +
        `يرجى التأكد من الاسم والمحاولة مرة أخرى.`
      );
    }

    if (students.length === 1) {
      // طالب واحد فقط
      return await selectStudentForGrades(ctx, students[0]);
    }

    // عدة طلاب بنفس الاسم
    const buttons = students.map(student => 
      [Markup.button.callback(
        `${student.name} - ${student.grade}`,
        `select_student_grade_${student._id}`
      )]
    );
    buttons.push([Markup.button.callback('❌ إلغاء', 'manage_grades')]);

    ctx.session.awaitingStudentNameForGrades = false;

    return ctx.reply(
      `🔍 *تم العثور على ${students.length} طلاب بهذا الاسم*\n\n` +
      `اختر الطالب المطلوب:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// اختيار طالب محدد للدرجات
const selectStudentFromButton = async (ctx) => {
  const studentId = ctx.match[1];
  
  await ctx.answerCbQuery();
  
  try {
    const student = await Student.findById(studentId);
    
    if (!student) {
      return ctx.reply('❌ حدث خطأ في العثور على الطالب.');
    }

    await selectStudentForGrades(ctx, student);
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// دالة مشتركة لاختيار الطالب
const selectStudentForGrades = async (ctx, student) => {
  ctx.session.currentStudentId = student._id.toString();
  ctx.session.awaitingStudentNameForGrades = false;
  ctx.session.awaitingGradeData = true;

  const semesterName = ctx.session.gradeSemester === 'sem1' ? 'الفصل الأول' : 'الفصل الثاني';
  let periodName = '';
  
  if (ctx.session.gradeMonth === '1') {
    periodName = 'الشهر الأول';
  } else if (ctx.session.gradeMonth === '2') {
    periodName = 'الشهر الثاني';
  } else if (ctx.session.gradeMonth === 'average') {
    periodName = 'معدل الفصل';
  } else if (ctx.session.gradeMonth === 'midyear') {
    periodName = 'نصف السنة';
  } else if (ctx.session.gradeMonth === 'endyear') {
    periodName = 'آخر السنة';
  }

  await ctx.reply(
    `✅ *الطالب:* ${student.name}\n` +
    `🏫 *المرحلة:* ${student.grade}\n` +
    `📊 *الفترة:* ${semesterName} - ${periodName}\n\n` +
    `الآن أرسل الدرجات بالصيغة التالية:\n` +
    `المادة: الدرجة\n\n` +
    `مثال:\n` +
    `الرياضيات: 95\n` +
    `الفيزياء: 88\n` +
    `الكيمياء: 92\n\n` +
    `📌 يمكنك إرسال عدة مواد في رسالة واحدة`,
    { parse_mode: 'Markdown' }
  );
};

// معالجة إدخال الدرجات
const processGradeInput = async (ctx) => {
  const text = ctx.message.text.trim();
  const studentId = ctx.session.currentStudentId;
  const semester = ctx.session.gradeSemester;
  const month = ctx.session.gradeMonth;

  if (!studentId || !semester || !month) {
    return ctx.reply('❌ حدث خطأ. يرجى إعادة العملية من البداية.');
  }

  try {
    // تحليل النص لاستخراج المواد والدرجات
    const lines = text.split('\n');
    const grades = {};
    let hasError = false;

    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length !== 2) continue;

      const subject = parts[0].trim();
      const grade = parseFloat(parts[1].trim());

      if (isNaN(grade) || grade < 0 || grade > 100) {
        hasError = true;
        await ctx.reply(`❌ درجة غير صحيحة للمادة: ${subject}`);
        continue;
      }

      grades[subject] = grade;
    }

    if (Object.keys(grades).length === 0) {
      return ctx.reply(
        '❌ لم يتم التعرف على أي درجات صحيحة.\n\n' +
        'يرجى استخدام الصيغة:\nالمادة: الدرجة'
      );
    }

    // حفظ الدرجات في قاعدة البيانات
    const student = await Student.findById(studentId);
    
    if (!student) {
      return ctx.reply('❌ حدث خطأ في العثور على الطالب.');
    }

    // تحديث الدرجات حسب الفصل والشهر
    if (semester === 'sem1') {
      if (month === '1') {
        student.grades.semester1.month1 = new Map(Object.entries(grades));
      } else if (month === '2') {
        student.grades.semester1.month2 = new Map(Object.entries(grades));
      } else if (month === 'average') {
        student.grades.semester1.average = new Map(Object.entries(grades));
      } else if (month === 'midyear') {
        student.grades.semester1.midYear = new Map(Object.entries(grades));
      }
    } else if (semester === 'sem2') {
      if (month === '1') {
        student.grades.semester2.month1 = new Map(Object.entries(grades));
      } else if (month === '2') {
        student.grades.semester2.month2 = new Map(Object.entries(grades));
      } else if (month === 'average') {
        student.grades.semester2.average = new Map(Object.entries(grades));
      } else if (month === 'endyear') {
        student.grades.semester2.endYear = new Map(Object.entries(grades));
      }
    }

    await student.save();

    // تنظيف الجلسة
    ctx.session.currentStudentId = null;
    ctx.session.gradeSemester = null;
    ctx.session.gradeMonth = null;
    ctx.session.awaitingGradeData = false;

    let message = `✅ *تم حفظ الدرجات بنجاح!*\n\n`;
    message += `👤 الطالب: ${student.name}\n\n`;
    message += `📊 الدرجات المضافة:\n`;
    
    for (const [subject, grade] of Object.entries(grades)) {
      message += `📚 ${subject}: ${grade}\n`;
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...gradeManagementKeyboard()
    });
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// عرض درجات طالب
const startViewStudentGrades = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.viewingGrades = true;
  
  await ctx.reply(
    `📊 *عرض درجات طالب*\n\n` +
    `يرجى إرسال اسم الطالب (الاسم الثلاثي أو الرباعي):`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة عرض الدرجات
const processViewGrades = async (ctx) => {
  const studentName = ctx.message.text.trim();
  
  try {
    const students = await Student.find({
      name: { $regex: studentName, $options: 'i' }
    }).limit(5);
    
    if (students.length === 0) {
      return ctx.reply(`❌ لم يتم العثور على طالب باسم: "${studentName}"`);
    }

    if (students.length === 1) {
      return await displayStudentGrades(ctx, students[0]);
    }

    // عدة طلاب
    const buttons = students.map(student => 
      [Markup.button.callback(
        `${student.name} - ${student.grade}`,
        `view_student_full_${student._id}`
      )]
    );
    buttons.push([Markup.button.callback('❌ إلغاء', 'manage_grades')]);

    ctx.session.viewingGrades = false;

    return ctx.reply(
      `🔍 *تم العثور على ${students.length} طلاب*\n\nاختر الطالب:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// عرض جميع معلومات الطالب (للبحث من الصفحة الرئيسية)
const displayStudentGrades = async (ctx, student) => {
  ctx.session.viewingGrades = false;

  let message = `📊 *معلومات الطالب الكاملة*\n\n`;
  message += `👤 الاسم: ${student.name}\n`;
  message += `🏫 المرحلة: ${student.grade}\n`;
  message += `❌ الغياب: ${student.absences} يوم\n\n`;
  
  // الفصل الأول
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `📘 *الفصل الأول*\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;
  
  if (student.grades.semester1.month1 && student.grades.semester1.month1.size > 0) {
    message += `📅 الشهر الأول:\n`;
    message += formatGradesDisplay(student.grades.semester1.month1);
    message += `\n`;
  }
  
  if (student.grades.semester1.month2 && student.grades.semester1.month2.size > 0) {
    message += `📅 الشهر الثاني:\n`;
    message += formatGradesDisplay(student.grades.semester1.month2);
    message += `\n`;
  }
  
  if (student.grades.semester1.average && student.grades.semester1.average.size > 0) {
    message += `📊 معدل الفصل الأول:\n`;
    message += formatGradesDisplay(student.grades.semester1.average);
    message += `\n`;
  }
  
  if (student.grades.semester1.midYear && student.grades.semester1.midYear.size > 0) {
    message += `📈 نصف السنة:\n`;
    message += formatGradesDisplay(student.grades.semester1.midYear);
    message += `\n`;
  }
  
  // الفصل الثاني
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `📗 *الفصل الثاني*\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;
  
  if (student.grades.semester2.month1 && student.grades.semester2.month1.size > 0) {
    message += `📅 الشهر الأول:\n`;
    message += formatGradesDisplay(student.grades.semester2.month1);
    message += `\n`;
  }
  
  if (student.grades.semester2.month2 && student.grades.semester2.month2.size > 0) {
    message += `📅 الشهر الثاني:\n`;
    message += formatGradesDisplay(student.grades.semester2.month2);
    message += `\n`;
  }
  
  if (student.grades.semester2.average && student.grades.semester2.average.size > 0) {
    message += `📊 معدل الفصل الثاني:\n`;
    message += formatGradesDisplay(student.grades.semester2.average);
    message += `\n`;
  }
  
  if (student.grades.semester2.endYear && student.grades.semester2.endYear.size > 0) {
    message += `🎓 آخر السنة:\n`;
    message += formatGradesDisplay(student.grades.semester2.endYear);
    message += `\n`;
  }

  if (student.notes) {
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `📝 *الملاحظات:*\n${student.notes}\n`;
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
};

module.exports = {
  showGradeManagement,
  startSemester1Grades,
  startSemester2Grades,
  processMonthSelection,
  processAverageSelection,
  processMidYearSelection,
  processEndYearSelection,
  processStudentNameForGrades,
  selectStudentFromButton,
  processGradeInput,
  startViewStudentGrades,
  processViewGrades,
  displayStudentGrades
};