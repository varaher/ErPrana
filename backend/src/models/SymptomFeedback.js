const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SymptomFeedback = sequelize.define('SymptomFeedback', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'SymptomSessions',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    outcome: {
      type: DataTypes.ENUM('improved', 'worsened', 'diagnosed'),
      allowNull: false
    },
    confirmedDiagnosis: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'symptom_feedback',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false
  });

  SymptomFeedback.associate = (models) => {
    SymptomFeedback.belongsTo(models.SymptomSession, {
      foreignKey: 'sessionId',
      as: 'session'
    });
    
    SymptomFeedback.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return SymptomFeedback;
};
