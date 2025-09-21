const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SymptomSession = sequelize.define('SymptomSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    result: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'symptom_sessions',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  SymptomSession.associate = (models) => {
    SymptomSession.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    SymptomSession.hasMany(models.SymptomFeedback, {
      foreignKey: 'sessionId',
      as: 'feedback'
    });
  };

  return SymptomSession;
};
