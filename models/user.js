"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasMany(models.Course);
    }
  }
  User.init(
    {
      firstName: {
        type: DataTypes.STRING,
        allowNull: false, //required for notNull validation
        validate: {
          notNull: { msg: "Please provide your first name." },
          notEmpty: { msg: "Please provide your first name." },
        },
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: "Please provide your last name." },
          notEmpty: { msg: "Please provide your last name." },
        },
      },
      emailAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "That email address is already registered.  Please provide a new email address.",
        },
        validate: {
          notNull: { msg: "Please provide your email address." },
          notEmpty: { msg: "Please provide your email address." },
          isEmail: { msg: "Please check your email address for errors." },
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: "Please provide a password." },
          notEmpty: { msg: "Please provide a password." },
        },
      },
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
