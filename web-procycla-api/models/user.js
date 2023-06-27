const moment = require('moment'); 
require("dotenv").config();
const bcrypt = require("bcrypt");
const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: integer
 *           example: null
 *           description: auto generated
 *         email:
 *           type: string
 *           example: 'email@email.com'
 *           description: unique value
 *         password:
 *           type: string
 *           example: 'password'
 *         role:
 *           type: string
 *           example: 'user'
 *           description: cannot be set by user
 *         firstname:
 *           type: string
 *           example: null
 *         lastname:
 *           type: string
 *           example: null
 *         phone:
 *           type: string
 *           example: null
 *         username:
 *           type: string
 *           example: null
 *           description: unique value
 *         about_me:
 *           type: string
 *           example: null
 *         location:
 *           type: string
 *           example: null
 *         twitter:
 *           type: string
 *           example: null
 *         youtube:
 *           type: string
 *           example: null
 *         facebook:
 *           type: string
 *           example: null
 *         instagram:
 *           type: string
 *           example: null
 *         website:
 *           type: string
 *           example: null
 *         signature:
 *           type: string
 *           example: null
 *         secure_login_email:
 *           type: boolean
 *           example: null
 *         language:
 *           type: string
 *           example: null
 *         status:
 *           type: string
 *           example: null
 *           description: cannot be set by user
 *         notification_monthly_digest:
 *           type: boolean
 *           example: null
 *         notification_product_updates:
 *           type: boolean
 *           example: null
 *         notification_discount_and_promotions:
 *           type: boolean
 *           example: null
 *         plan_expire_date:
 *           type: string
 *           example: null
 *           description: cannot be set by user
 *         stripe_customer_id:
 *           type: string
 *           example: null
 *           description: cannot be set by user
 *         id_plan:
 *           type: integer
 *           example: null
 *           description: cannot be set by user
 *         createdAt:
 *           type: string
 *           description: auto generated
 *           example: null
 *         updatedAt:
 *           type: string
 *           description: auto generated
 *           example: null
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define("user",
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            email: {
                type: DataTypes.STRING(128),
                allowNull: false
            },
            password: {
                type: DataTypes.STRING(128),
                allowNull: false
            },
            role: { type: DataTypes.STRING(64), defaultValue: 'user' },
            firstname: { type: DataTypes.STRING(128) },
            lastname: { type: DataTypes.STRING(256) },
            phone: { type: DataTypes.STRING(128) },
            username: {
                type: DataTypes.STRING(64),
                allowNull: true
            },
            about_me: { type: DataTypes.TEXT },
            location: { type: DataTypes.STRING(256) },
            twitter: { type: DataTypes.STRING(256) },
            youtube: { type: DataTypes.STRING(256) },
            facebook: { type: DataTypes.STRING(256) },
            instagram: { type: DataTypes.STRING(256) },
            website: { type: DataTypes.STRING(256) },
            signature: { type: DataTypes.TEXT },
            secure_login_email: { type: DataTypes.BOOLEAN },
            secure_login_code: { type: DataTypes.STRING(128) },
            language: { type: DataTypes.STRING(24) },
            status: { type: DataTypes.STRING(64) },
            notification_monthly_digest: { type: DataTypes.BOOLEAN, defaultValue: true },
            notification_product_updates: { type: DataTypes.BOOLEAN, defaultValue: true },
            notification_discount_and_promotions: { type: DataTypes.BOOLEAN, defaultValue: true },
            plan_expire_date: {
                type: DataTypes.DATE, 
                allowNull: true,               
                get() {
                    return moment(this.getDataValue('plan_expire_date')).format(process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss');
                }
            },
            stripe_customer_id: {
                type: DataTypes.STRING(128),
                allowNull: true
            },
            createdAt: {
                type: DataTypes.DATE,                
                get() {
                    return moment(this.getDataValue('createdAt')).format(process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss');
                }
            },
            updatedAt: {
                type: DataTypes.DATE,
                get() {
                    return moment(this.getDataValue('updatedAt')).format(process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss');
                }
            }
        },
        {
            freezeTableName: true,
            timestamps: true,
            hooks: {
                beforeCreate: async (user , options) => {
                    {
                        user.password = await bcrypt.hash(user.password, saltRounds);
                    }
                },
                beforeUpdate: async (user , options) => {
                    {
                        if(user.changed('password'))
                        user.password = await bcrypt.hash(user.password, saltRounds);
                    }
                }
            },
            indexes: [
                { unique: true, fields: ["email"] },
                { unique: true, fields: ["username"] }
            ]
        }
    );
};