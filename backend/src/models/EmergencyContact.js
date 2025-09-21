const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmergencyContact = sequelize.define('EmergencyContact', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Patients',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    relationship: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Priority order for notification (1 = highest)'
    },
    notificationPreferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        sms: true,
        email: false,
        phone: true
      }
    },
    lastNotified: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'emergency_contacts',
    timestamps: true,
    indexes: [
      {
        fields: ['patientId']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['priority']
      }
    ]
  });

  // Instance methods
  EmergencyContact.prototype.markNotified = async function() {
    this.lastNotified = new Date();
    return await this.save();
  };

  EmergencyContact.prototype.activate = async function() {
    this.isActive = true;
    return await this.save();
  };

  EmergencyContact.prototype.deactivate = async function() {
    this.isActive = false;
    return await this.save();
  };

  EmergencyContact.prototype.updatePriority = async function(newPriority) {
    this.priority = newPriority;
    return await this.save();
  };

  EmergencyContact.prototype.updateNotificationPreferences = async function(preferences) {
    this.notificationPreferences = { ...this.notificationPreferences, ...preferences };
    return await this.save();
  };

  // Class methods
  EmergencyContact.getActiveContacts = async function(patientId) {
    return await this.findAll({
      where: {
        patientId,
        isActive: true
      },
      order: [['priority', 'ASC'], ['name', 'ASC']]
    });
  };

  EmergencyContact.getContactsByPriority = async function(patientId, limit = 3) {
    return await this.findAll({
      where: {
        patientId,
        isActive: true
      },
      order: [['priority', 'ASC']],
      limit
    });
  };

  EmergencyContact.createContact = async function(contactData) {
    return await this.create(contactData);
  };

  EmergencyContact.updateContact = async function(id, updateData) {
    const contact = await this.findByPk(id);
    if (contact) {
      return await contact.update(updateData);
    }
    throw new Error('Emergency contact not found');
  };

  EmergencyContact.deleteContact = async function(id) {
    const contact = await this.findByPk(id);
    if (contact) {
      return await contact.destroy();
    }
    throw new Error('Emergency contact not found');
  };

  return EmergencyContact;
}; 