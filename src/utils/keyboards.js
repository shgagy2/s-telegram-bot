const { Markup } = require('telegraf');

// لوحة المفاتيح الرئيسية
const mainKeyboard = (isAdmin = false) => {
  const buttons = [
    [Markup.button.callback('👥 البحث عن طالب', 'search_student')]
  ];

  if (isAdmin) {
    buttons.push([Markup.button.callback('⚙️ لوحة الإدارة', 'admin_panel')]);
  }

  return Markup.inlineKeyboard(buttons);
};

// لوحة الإدارة - حسب الصلاحية
const adminKeyboard = (role) => {
  const buttons = [];

  if (role === 'super') {
    buttons.push([Markup.button.callback('👨‍💼 إدارة المشرفين', 'manage_admins')]);
  }

  if (role === 'super' || role === 'medium') {
    buttons.push([Markup.button.callback('👥 إدارة الطلاب', 'manage_students')]);
    buttons.push([Markup.button.callback('📝 إدارة الغياب والملاحظات', 'manage_absences')]);
  }

  buttons.push([Markup.button.callback('📊 إدارة الدرجات', 'manage_grades')]);
  buttons.push([Markup.button.callback('📈 التقارير والإحصائيات', 'view_reports')]);
  buttons.push([Markup.button.callback('🔙 العودة للقائمة الرئيسية', 'back_to_main')]);

  return Markup.inlineKeyboard(buttons);
};

// لوحة إدارة المشرفين
const adminManagementKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('➕ إضافة مشرف جديد', 'add_admin')],
    [Markup.button.callback('📋 عرض جميع المشرفين', 'list_admins')],
    [Markup.button.callback('🗑️ حذف مشرف', 'remove_admin')],
    [Markup.button.callback('🔙 رجوع', 'admin_panel')]
  ]);
};

// لوحة إدارة الطلاب
const studentManagementKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('➕ إضافة طالب جديد', 'add_student')],
    [Markup.button.callback('📋 عرض جميع الطلاب', 'list_students')],
    [Markup.button.callback('✏️ تعديل بيانات طالب', 'edit_student')],
    [Markup.button.callback('🗑️ حذف طالب', 'delete_student')],
    [Markup.button.callback('🔙 رجوع', 'admin_panel')]
  ]);
};

// لوحة اختيار المرحلة الدراسية
const gradesKeyboard = () => {
  const grades = [
    'الأول متوسط',
    'الثاني متوسط',
    'الثالث متوسط',
    'الرابع علمي',
    'الخامس علمي',
    'السادس علمي'
  ];

  const buttons = grades.map(grade => 
    [Markup.button.callback(grade, `grade_${grade}`)]
  );
  
  buttons.push([Markup.button.callback('🔙 رجوع', 'back_to_main')]);

  return Markup.inlineKeyboard(buttons);
};

// لوحة اختيار نوع الأدمن
const adminRoleKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('👔 أدمن متوسط', 'role_medium')],
    [Markup.button.callback('👤 أدمن عادي', 'role_normal')],
    [Markup.button.callback('❌ إلغاء', 'manage_admins')]
  ]);
};

// لوحة إدارة الدرجات
const gradeManagementKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📝 إدخال درجات الفصل الأول', 'enter_sem1_grades')],
    [Markup.button.callback('📝 إدخال درجات الفصل الثاني', 'enter_sem2_grades')],
    [Markup.button.callback('📊 عرض درجات طالب', 'view_student_grades')],
    [Markup.button.callback('🔙 رجوع', 'admin_panel')]
  ]);
};

// لوحة اختيار الشهر
// لوحة اختيار الشهر
const monthKeyboard = (semester) => {
  const buttons = [
    [Markup.button.callback('📅 الشهر الأول', `month_${semester}_1`)],
    [Markup.button.callback('📅 الشهر الثاني', `month_${semester}_2`)],
    [Markup.button.callback('📊 معدل الفصل', `avg_${semester}`)]
  ];
  
  if (semester === 'sem1') {
    buttons.push([Markup.button.callback('📈 نصف السنة', `midyear_${semester}`)]);
  } if (semester === 'sem2') {
    buttons.push([Markup.button.callback('🎓 السعي السنوي', `endyear_${semester}`)]);
  }
  
  buttons.push([Markup.button.callback('🔙 رجوع', 'manage_grades')]);
  
  return Markup.inlineKeyboard(buttons);
};

// زر الإلغاء
const cancelKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('❌ إلغاء العملية', 'cancel_operation')]
  ]);
};

module.exports = {
  mainKeyboard,
  adminKeyboard,
  adminManagementKeyboard,
  studentManagementKeyboard,
  gradesKeyboard,
  adminRoleKeyboard,
  gradeManagementKeyboard,
  monthKeyboard,
  cancelKeyboard
};