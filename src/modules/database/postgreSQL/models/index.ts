import sequelize from '../config/db.config.js';
import ProjectAdmin from './ProjectAdmin.model.js';
import Token from './Token.model.js';
import User from './User.model.js';
import Subscription from './Subscription.model.js';
import Car from './Car.model.js';

// ===================== تعريف العلاقات بين الـ Models =====================

// ربط Subscription بـ User
// عند حذف المستخدم، يتم تعيين user_id إلى NULL
Subscription.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
User.hasMany(Subscription, { 
  foreignKey: 'user_id', 
  as: 'subscriptions' 
});

// ربط ProjectAdmin بـ User
// عند حذف المستخدم، يتم تعيين user_id إلى NULL
ProjectAdmin.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
User.hasOne(ProjectAdmin, { 
  foreignKey: 'user_id', 
  as: 'adminProfile' 
});

// ربط Token بـ User (اختياري - يمكن تفعيله عند إضافة user_id للتوكن)
// Token.belongsTo(User, { 
//   foreignKey: 'user_id', 
//   as: 'user',
//   onDelete: 'SET NULL',
//   onUpdate: 'CASCADE'
// });
// User.hasMany(Token, { 
//   foreignKey: 'user_id', 
//   as: 'tokens' 
// });

// ===================== مزامنة قاعدة البيانات =====================

sequelize.sync().then(() => {
  console.log('All models and relationships were synchronized successfully.');
}).catch((error) => {
  console.error('Error synchronizing models:', error);
});

export { 
  ProjectAdmin,
  Token,
  User,
  Subscription,
  Car,
  sequelize
};
