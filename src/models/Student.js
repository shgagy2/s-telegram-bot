const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  grade: {
    type: String,
    required: true,
    enum: [
      'الأول متوسط',
      'الثاني متوسط',
      'الثالث متوسط',
      'الرابع علمي',
      'الخامس علمي',
      'السادس علمي'
    ]
  },
  grades: {
    semester1: {
      month1: {
        type: Map,
        of: Number,
        default: {}
      },
      month2: {
        type: Map,
        of: Number,
        default: {}
      },
      average: {
        type: Map,
        of: Number,
        default: {}
      },
      midYear: {
        type: Map,
        of: Number,
        default: {}
      }
    },
    semester2: {
      month1: {
        type: Map,
        of: Number,
        default: {}
      },
      month2: {
        type: Map,
        of: Number,
        default: {}
      },
      average: {
        type: Map,
        of: Number,
        default: {}
      },
      endYear: {
        type: Map,
        of: Number,
        default: {}
      }
    }
  },
  absences: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  addedBy: {
    type: String,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);