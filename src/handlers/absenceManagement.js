const Student = require('../models/Student');
const { 
  studentManagementKeyboard,
  cancelKeyboard 
} = require('../utils/keyboards');
const { errorMessage } = require('../utils/helpers');

// عرض لوحة إدارة الغياب والملاحظات
const showAbsenceManagement = async (ctx) => {
  await ctx.answerCbQuery();
  
  const { Markup } = require('telegraf');
  
  await ctx.editMessageText(
    `📝 *إدارة الغياب والملاحظات*\n\nاختر العملية:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ تسجيل غياب', 'record_absence')],
        [Markup.button.callback('📝 إضافة ملاحظة', 'add_note')],
        [Markup.button.callback('👀 عرض غياب وملاحظات طالب', 'view_absence_notes')],
        [Markup.button.callback('🔙 رجوع', 'admin_panel')]
      ])
    }
  );
};

// بدء تسجيل غياب
const startRecordAbsence = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.recordingAbsence = true;
  
  await ctx.reply(
    `❌ *تسجيل غياب طالب*\n\n` +
    `يرجى إرسال اسم الطالب (الاسم الثلاثي أو الرباعي):`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة تسجيل الغياب
const processRecordAbsence = async (ctx) => {
  const studentName = ctx.message.text.trim();
  
  try {
    // البحث عن الطالب بالاسم
    const students = await Student.find({
      name: { $regex: studentName, $options: 'i' }
    }).limit(5);

    if (students.length === 0) {
      return ctx.reply(`❌ لم يتم العثور على طالب باسم: "${studentName}"\n\nيرجى التأكد من الاسم والمحاولة مرة أخرى.`);
    }

    if (students.length === 1) {
      // طالب واحد فقط
      ctx.session.selectedStudentForAbsence = students[0]._id.toString();
      ctx.session.recordingAbsence = false;
      ctx.session.awaitingAbsenceDays = true;
      
      return ctx.reply(
        `✅ *تم العثور على الطالب:*\n\n` +
        `👤 الاسم: ${students[0].name}\n` +
        `🏫 المرحلة: ${students[0].grade}\n` +
        `❌ الغياب الحالي: ${students[0].absences} يوم\n\n` +
        `الآن أرسل عدد أيام الغياب المراد إضافتها:`,
        { parse_mode: 'Markdown' }
      );
    }

    // عدة طلاب بنفس الاسم
    const { Markup } = require('telegraf');
    const buttons = students.map(student => 
      [Markup.button.callback(
        `${student.name} - ${student.grade}`,
        `select_student_absence_${student._id}`
      )]
    );
    buttons.push([Markup.button.callback('❌ إلغاء', 'manage_absences')]);

    ctx.session.recordingAbsence = false;

    return ctx.reply(
      `🔍 *تم العثور على ${students.length} طلاب بهذا الاسم*\n\nاختر الطالب المطلوب:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// اختيار طالب محدد للغياب
const selectStudentForAbsence = async (ctx) => {
  const studentId = ctx.match[1];
  
  await ctx.answerCbQuery();
  
  try {
    const student = await Student.findById(studentId);
    
    if (!student) {
      return ctx.reply('❌ حدث خطأ في العثور على الطالب.');
    }

    ctx.session.selectedStudentForAbsence = studentId;
    ctx.session.awaitingAbsenceDays = true;

    await ctx.editMessageText(
      `✅ *تم اختيار الطالب:*\n\n` +
      `👤 الاسم: ${student.name}\n` +
      `🏫 المرحلة: ${student.grade}\n` +
      `❌ الغياب الحالي: ${student.absences} يوم\n\n` +
      `الآن أرسل عدد أيام الغياب المراد إضافتها:`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// معالجة عدد أيام الغياب
const processAbsenceDays = async (ctx) => {
  const days = parseInt(ctx.message.text.trim());
  
  if (isNaN(days) || days < 0) {
    return ctx.reply('❌ يرجى إدخال رقم صحيح لعدد الأيام.');
  }

  const studentId = ctx.session.selectedStudentForAbsence;
  
  try {
    const student = await Student.findById(studentId);
    
    if (!student) {
      return ctx.reply('❌ حدث خطأ في العثور على الطالب.');
    }

    student.absences += days;
    await student.save();

    ctx.session.selectedStudentForAbsence = null;
    ctx.session.awaitingAbsenceDays = false;

    await ctx.reply(
      `✅ *تم تسجيل الغياب بنجاح!*\n\n` +
      `👤 الطالب: ${student.name}\n` +
      `➕ أيام مضافة: ${days}\n` +
      `❌ إجمالي الغياب: ${student.absences} يوم`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// بدء إضافة ملاحظة
const startAddNote = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.addingNote = true;
  
  await ctx.reply(
    `📝 *إضافة ملاحظة لطالب*\n\n` +
    `يرجى إرسال اسم الطالب (الاسم الثلاثي أو الرباعي):`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة اسم الطالب للملاحظة
const processNoteStudentName = async (ctx) => {
  const studentName = ctx.message.text.trim();
  
  try {
    const students = await Student.find({
      name: { $regex: studentName, $options: 'i' }
    }).limit(5);

    if (students.length === 0) {
      return ctx.reply(`❌ لم يتم العثور على طالب باسم: "${studentName}"`);
    }

    if (students.length === 1) {
      ctx.session.selectedStudentForNote = students[0]._id.toString();
      ctx.session.addingNote = false;
      ctx.session.awaitingNoteText = true;
      
      return ctx.reply(
        `✅ *تم العثور على الطالب:*\n\n` +
        `👤 الاسم: ${students[0].name}\n` +
        `🏫 المرحلة: ${students[0].grade}\n` +
        `📝 الملاحظات الحالية: ${students[0].notes || 'لا توجد'}\n\n` +
        `الآن أرسل نص الملاحظة الجديدة:`,
        { parse_mode: 'Markdown' }
      );
    }

    // عدة طلاب
    const { Markup } = require('telegraf');
    const buttons = students.map(student => 
      [Markup.button.callback(
        `${student.name} - ${student.grade}`,
        `select_student_note_${student._id}`
      )]
    );
    buttons.push([Markup.button.callback('❌ إلغاء', 'manage_absences')]);

    ctx.session.addingNote = false;

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

// اختيار طالب للملاحظة
const selectStudentForNote = async (ctx) => {
  const studentId = ctx.match[1];
  
  await ctx.answerCbQuery();
  
  try {
    const student = await Student.findById(studentId);
    
    if (!student) {
      return ctx.reply('❌ حدث خطأ في العثور على الطالب.');
    }

    ctx.session.selectedStudentForNote = studentId;
    ctx.session.awaitingNoteText = true;

    await ctx.editMessageText(
      `✅ *تم اختيار الطالب:*\n\n` +
      `👤 الاسم: ${student.name}\n` +
      `🏫 المرحلة: ${student.grade}\n` +
      `📝 الملاحظات الحالية: ${student.notes || 'لا توجد'}\n\n` +
      `الآن أرسل نص الملاحظة الجديدة:`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// معالجة نص الملاحظة
const processNoteText = async (ctx) => {
  const noteText = ctx.message.text.trim();
  const studentId = ctx.session.selectedStudentForNote;
  
  try {
    const student = await Student.findById(studentId);
    
    if (!student) {
      return ctx.reply('❌ حدث خطأ في العثور على الطالب.');
    }

    student.notes = noteText;
    await student.save();

    ctx.session.selectedStudentForNote = null;
    ctx.session.awaitingNoteText = false;

    await ctx.reply(
      `✅ *تم إضافة الملاحظة بنجاح!*\n\n` +
      `👤 الطالب: ${student.name}\n` +
      `📝 الملاحظة: ${noteText}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// عرض الغياب والملاحظات
const startViewAbsenceNotes = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.viewingAbsenceNotes = true;
  
  await ctx.reply(
    `👀 *عرض غياب وملاحظات طالب*\n\n` +
    `يرجى إرسال اسم الطالب:`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة عرض الغياب والملاحظات
const processViewAbsenceNotes = async (ctx) => {
  const studentName = ctx.message.text.trim();
  
  try {
    const students = await Student.find({
      name: { $regex: studentName, $options: 'i' }
    }).limit(5);

    if (students.length === 0) {
      return ctx.reply(`❌ لم يتم العثور على طالب باسم: "${studentName}"`);
    }

    if (students.length === 1) {
      const student = students[0];
      ctx.session.viewingAbsenceNotes = false;
      
      return ctx.reply(
        `📊 *معلومات الطالب*\n\n` +
        `👤 الاسم: ${student.name}\n` +
        `🏫 المرحلة: ${student.grade}\n` +
        `❌ الغياب: ${student.absences} يوم\n\n` +
        `📝 *الملاحظات:*\n${student.notes || 'لا توجد ملاحظات'}`,
        { parse_mode: 'Markdown' }
      );
    }

    // عدة طلاب
    let message = `🔍 *تم العثور على ${students.length} طلاب:*\n\n`;
    
    students.forEach((student, index) => {
      message += `${index + 1}. ${student.name} - ${student.grade}\n`;
      message += `   ❌ الغياب: ${student.absences} يوم\n`;
      message += `   📝 ${student.notes ? student.notes.substring(0, 30) + '...' : 'لا توجد ملاحظات'}\n`;
      message += `━━━━━━━━━━━━━━━━\n`;
    });

    ctx.session.viewingAbsenceNotes = false;
    return ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

module.exports = {
  showAbsenceManagement,
  startRecordAbsence,
  processRecordAbsence,
  selectStudentForAbsence,
  processAbsenceDays,
  startAddNote,
  processNoteStudentName,
  selectStudentForNote,
  processNoteText,
  startViewAbsenceNotes,
  processViewAbsenceNotes
};