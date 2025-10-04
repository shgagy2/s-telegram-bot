const Student = require('../models/Student');
const { 
  studentManagementKeyboard, 
  gradesKeyboard,
  cancelKeyboard 
} = require('../utils/keyboards');
const { formatDate, errorMessage } = require('../utils/helpers');

// عرض لوحة إدارة الطلاب
const showStudentManagement = async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `👥 *إدارة الطلاب*\n\nاختر العملية التي تريد تنفيذها:`,
    {
      parse_mode: 'Markdown',
      ...studentManagementKeyboard()
    }
  );
};

// بدء عملية إضافة طالب - اختيار المرحلة
const startAddStudent = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.addingStudent = true;
  
  await ctx.editMessageText(
    `➕ *إضافة طالب جديد*\n\nالخطوة 1️⃣: اختر المرحلة الدراسية:`,
    {
      parse_mode: 'Markdown',
      ...gradesKeyboard()
    }
  );
};

// معالجة اختيار المرحلة وطلب اسم الطالب
const processGradeSelection = async (ctx) => {
  const grade = ctx.match[1];
  
  await ctx.answerCbQuery();
  
  ctx.session.studentGrade = grade;
  ctx.session.awaitingStudentName = true;
  
  await ctx.reply(
    `✅ المرحلة: ${grade}\n\n` +
    `الخطوة 2️⃣: الآن أرسل اسم الطالب الكامل:`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة اسم الطالب وإضافته
const processStudentName = async (ctx) => {
  const studentName = ctx.message.text.trim();
  
  if (!studentName || studentName.length < 3) {
    return ctx.reply('❌ الاسم قصير جداً. يرجى إدخال اسم صحيح.');
  }

  try {
    const newStudent = new Student({
      name: studentName,
      grade: ctx.session.studentGrade,
      addedBy: ctx.from.username || 'unknown'
    });

    await newStudent.save();
    
    // تنظيف الجلسة
    ctx.session.addingStudent = false;
    ctx.session.awaitingStudentName = false;
    ctx.session.studentGrade = null;

    await ctx.reply(
      `✅ *تم إضافة الطالب بنجاح!*\n\n` +
      `👤 الاسم: ${newStudent.name}\n` +
      `🏫 المرحلة: ${newStudent.grade}\n` +
      `📅 تاريخ الإضافة: ${formatDate(newStudent.addedAt)}\n` +
      `🆔 الرقم التعريفي: ${newStudent._id}`,
      {
        parse_mode: 'Markdown',
        ...studentManagementKeyboard()
      }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// عرض قائمة الطلاب - اختيار المرحلة
const startListStudents = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.listingStudents = true;
  
  await ctx.editMessageText(
    `📋 *عرض الطلاب*\n\nاختر المرحلة الدراسية لعرض طلابها:`,
    {
      parse_mode: 'Markdown',
      ...gradesKeyboard()
    }
  );
};

// عرض طلاب مرحلة معينة
const listStudentsByGrade = async (ctx, grade) => {
  await ctx.answerCbQuery();
  
  try {
    const students = await Student.find({ grade }).sort({ name: 1 });
    
    if (students.length === 0) {
      return ctx.editMessageText(
        `📋 *الطلاب - ${grade}*\n\n` +
        `لا يوجد طلاب في هذه المرحلة حالياً.`,
        {
          parse_mode: 'Markdown',
          ...studentManagementKeyboard()
        }
      );
    }

    let message = `📋 *الطلاب - ${grade}*\n`;
    message += `العدد الإجمالي: ${students.length}\n\n`;
    
    students.forEach((student, index) => {
      message += `${index + 1}. ${student.name}\n`;
      message += `   🆔 ${student._id}\n`;
      message += `   ❌ الغياب: ${student.absences} يوم\n`;
      if (student.notes) {
        message += `   📝 ${student.notes.substring(0, 50)}${student.notes.length > 50 ? '...' : ''}\n`;
      }
      message += `━━━━━━━━━━━━━━━━\n`;
    });

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...studentManagementKeyboard()
    });
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// بدء عملية تعديل طالب
const startEditStudent = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.awaitingStudentId = 'edit';
  
  await ctx.reply(
    `✏️ *تعديل بيانات طالب*\n\n` +
    `يرجى إرسال الرقم التعريفي (ID) للطالب:`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة تعديل الطالب
const processEditStudent = async (ctx) => {
  const studentId = ctx.message.text.trim();
  
  try {
    const student = await Student.findById(studentId);
    
    if (!student) {
      return ctx.reply('❌ لم يتم العثور على طالب بهذا الرقم التعريفي.');
    }

    ctx.session.editingStudentId = studentId;
    ctx.session.awaitingStudentId = null;

    await ctx.reply(
      `✅ *تم العثور على الطالب:*\n\n` +
      `👤 الاسم: ${student.name}\n` +
      `🏫 المرحلة: ${student.grade}\n` +
      `❌ الغياب: ${student.absences} يوم\n` +
      `📝 الملاحظات: ${student.notes || 'لا توجد'}\n\n` +
      `اختر ما تريد تعديله:\n` +
      `1️⃣ لتعديل الاسم، أرسل: اسم [الاسم الجديد]\n` +
      `2️⃣ لتعديل الغياب، أرسل: غياب [العدد]\n` +
      `3️⃣ لتعديل الملاحظات، أرسل: ملاحظة [النص]`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// معالجة التعديلات المختلفة
const processStudentUpdate = async (ctx) => {
  const text = ctx.message.text.trim();
  const studentId = ctx.session.editingStudentId;
  
  if (!studentId) {
    return ctx.reply('❌ حدث خطأ. يرجى إعادة العملية.');
  }

  try {
    const student = await Student.findById(studentId);
    
    if (!student) {
      return ctx.reply('❌ لم يتم العثور على الطالب.');
    }

    // تعديل الاسم
    if (text.startsWith('اسم ')) {
      const newName = text.substring(4).trim();
      if (newName.length < 3) {
        return ctx.reply('❌ الاسم قصير جداً.');
      }
      student.name = newName;
      await student.save();
      ctx.session.editingStudentId = null;
      return ctx.reply(`✅ تم تعديل الاسم إلى: ${newName}`);
    }
    
    // تعديل الغياب
    if (text.startsWith('غياب ')) {
      const absences = parseInt(text.substring(5).trim());
      if (isNaN(absences) || absences < 0) {
        return ctx.reply('❌ يرجى إدخال رقم صحيح للغياب.');
      }
      student.absences = absences;
      await student.save();
      ctx.session.editingStudentId = null;
      return ctx.reply(`✅ تم تعديل الغياب إلى: ${absences} يوم`);
    }
    
    // تعديل الملاحظات
    if (text.startsWith('ملاحظة ')) {
      const notes = text.substring(7).trim();
      student.notes = notes;
      await student.save();
      ctx.session.editingStudentId = null;
      return ctx.reply(`✅ تم تعديل الملاحظات بنجاح.`);
    }

    return ctx.reply('❌ صيغة غير صحيحة. يرجى اتباع التعليمات.');
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// بدء عملية حذف طالب
const startDeleteStudent = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.awaitingStudentId = 'delete';
  
  await ctx.reply(
    `🗑️ *حذف طالب*\n\n` +
    `⚠️ تحذير: هذه العملية لا يمكن التراجع عنها!\n\n` +
    `يرجى إرسال الرقم التعريفي (ID) للطالب المراد حذفه:`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

// معالجة حذف الطالب
const processDeleteStudent = async (ctx) => {
  const studentId = ctx.message.text.trim();
  
  try {
    const student = await Student.findByIdAndDelete(studentId);
    
    if (!student) {
      return ctx.reply('❌ لم يتم العثور على طالب بهذا الرقم التعريفي.');
    }

    ctx.session.awaitingStudentId = null;

    await ctx.reply(
      `✅ *تم حذف الطالب بنجاح!*\n\n` +
      `👤 الاسم: ${student.name}\n` +
      `🏫 المرحلة: ${student.grade}`,
      {
        parse_mode: 'Markdown',
        ...studentManagementKeyboard()
      }
    );
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

// البحث عن طالب
const searchStudent = async (ctx) => {
  await ctx.answerCbQuery();
  
  ctx.session = ctx.session || {};
  ctx.session.searchingStudent = true;
  
  await ctx.reply(
    `🔍 *البحث عن طالب*\n\n` +
    `يرجى إرسال اسم الطالب أو جزء منه:`,
    { parse_mode: 'Markdown' }
  );
};

// معالجة البحث
const processSearch = async (ctx) => {
  const searchTerm = ctx.message.text.trim();
  
  if (searchTerm.length < 2) {
    return ctx.reply('❌ يرجى إدخال على الأقل حرفين للبحث.');
  }

  try {
    const students = await Student.find({
      name: { $regex: searchTerm, $options: 'i' }
    }).limit(10);

    if (students.length === 0) {
      return ctx.reply(`❌ لم يتم العثور على نتائج للبحث عن: "${searchTerm}"`);
    }

    let message = `🔍 *نتائج البحث* (${students.length})\n\n`;
    
    students.forEach((student, index) => {
      message += `${index + 1}. ${student.name}\n`;
      message += `   🏫 ${student.grade}\n`;
      message += `   🆔 ${student._id}\n`;
      message += `   ❌ الغياب: ${student.absences} يوم\n`;
      message += `━━━━━━━━━━━━━━━━\n`;
    });

    ctx.session.searchingStudent = false;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    ctx.reply(errorMessage(error));
  }
};

module.exports = {
  showStudentManagement,
  startAddStudent,
  processGradeSelection,
  processStudentName,
  startListStudents,
  listStudentsByGrade,
  startEditStudent,
  processEditStudent,
  processStudentUpdate,
  startDeleteStudent,
  processDeleteStudent,
  searchStudent,
  processSearch
};