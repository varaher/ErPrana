const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('patient', 'doctor'),
      allowNull: false,
      defaultValue: 'patient'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  // Hash password before creating user
  User.beforeCreate(async (user) => {
    if (user.password) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(user.password, saltRounds);
    }
  });

  // Hash password before updating user
  User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(user.password, saltRounds);
    }
  });

  // Instance method to compare passwords
  User.prototype.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  return User;
}; 