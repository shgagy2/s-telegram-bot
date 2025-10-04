// تنسيق التاريخ بالعربية
const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// الحصول على اسم الصلاحية بالعربية
const getRoleNameArabic = (role) => {
  const roles = {
    super: '👑 سوبر أدمن',
    medium: '👔 أدمن متوسط',
    normal: '👤 أدمن عادي'
  };
  return roles[role] || 'غير معروف';
};

// حساب المعدل
const calculateAverage = (grades) => {
  if (!grades || Object.keys(grades).length === 0) return 0;
  
  const values = Object.values(grades);
  const sum = values.reduce((acc, val) => acc + val, 0);
  return (sum / values.length).toFixed(2);
};

// التحقق من اسم المستخدم
const validateUsername = (username) => {
  return username && /^[a-zA-Z0-9_]{5,32}$/.test(username);
};

// تنسيق الدرجات للعرض
const formatGradesDisplay = (grades) => {
  if (!grades || typeof grades !== 'object') return 'لا توجد درجات';
  
  let display = '';
  const gradesObj = grades instanceof Map ? Object.fromEntries(grades) : grades;
  
  for (const [subject, grade] of Object.entries(gradesObj)) {
    display += `📚 ${subject}: ${grade}\n`;
  }
  
  return display || 'لا توجد درجات';
};

// تنظيف اسم المستخدم (إزالة @)
const cleanUsername = (username) => {
  if (!username) return '';
  return username.replace('@', '').toLowerCase().trim();
};

// رسالة خطأ موحدة
const errorMessage = (error) => {
  console.error('خطأ:', error);
  return '❌ حدث خطأ أثناء تنفيذ العملية. يرجى المحاولة مرة أخرى.';
};

module.exports = {
  formatDate,
  getRoleNameArabic,
  calculateAverage,
  validateUsername,
  formatGradesDisplay,
  cleanUsername,
  errorMessage
};