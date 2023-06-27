const moment = require('moment'); 
require("dotenv").config();
const Sequelize = require("sequelize");
const CronJob = require("cron").CronJob;
const readline = require("readline");
let creatingAccount = false;

const
  userModel = require("../models/user"),
  sessionModel = require("../models/session"),
  ticketModel = require("../models/ticket"),
  ticketMessageModel = require("../models/ticketMessage"),
  planModel = require("../models/plan"),
  projectModel = require("../models/project"),
  simulationModel = require("../models/simulation")
;

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: "mysql",
  logging: false
});

const
  user = userModel(sequelize, Sequelize),
  session = sessionModel(sequelize, Sequelize),
  ticket = ticketModel(sequelize, Sequelize),
  ticketMessage = ticketMessageModel(sequelize, Sequelize),
  plan = planModel(sequelize, Sequelize),
  project = projectModel(sequelize, Sequelize),
  simulation = simulationModel(sequelize, Sequelize)
;

//Associations
session.belongsTo(user, {
  foreignKey: {
      name: "id_user",
      allowNull: false
  },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

ticket.belongsTo(user, {
  foreignKey: {
      name: "id_user",
      allowNull: false
  },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

ticketMessage.belongsTo(ticket, {
  foreignKey: {
      name: "id_ticket",
      allowNull: false
  },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

ticketMessage.belongsTo(user, {
  foreignKey: {
      name: "id_user",
      allowNull: false
  },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

user.belongsTo(plan, {
  foreignKey: {
      name: "id_plan",
      allowNull: true
  },
  onDelete: "SET NULL",
  onUpdate: "CASCADE"
});

project.belongsTo(user, {
  foreignKey: {
      name: "id_user",
      allowNull: false
  },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

simulation.belongsTo(project, {
  foreignKey: {
      name: "id_project",
      allowNull: false
  },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

project.hasMany(simulation, {
  foreignKey: {
      name: "id_project",
      allowNull: true
  },
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

sequelize.authenticate()
  .then(() => {
    console.log("DB Connected");
    sequelize.sync({
      force: process.env.DB_FORCE_SYNC === "true" ? true : false,
      alter: process.env.DB_FORCE_ALTER === "true" ? true : false
    }).then(async () => {
      if(process.env.STRIPE_SECRET_KEY) {
        const { stripeProducts } = require("./stripeStore");
        await stripeProducts();
        console.log("Stripe Products Synced");
      }
      console.log("DB Synced");

	    //Create Admin User
      if(process.env.DEV === "true") {
        const KEY = "a";
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        });
        
        process.stdin.on("keypress", character => {
            if(!creatingAccount && character == KEY) {
                console.clear();
                creatingAccount = true;
                
                rl.line = "";
                rl.question("Email address: ", email => {
                    rl.question("Password: ", async password => {
                        if(email.length > 0 && password.length > 0) {
                            const account = await user.create({ email: email, password: password, role: 'admin' });
                            if(account) console.log("OK! Account created, ID: " + account.id + "\n\n");
                            else console.log("ERROR! Account not created\n\n");
                        }
                        else console.log("CANCELED\n\n");
                        creatingAccount = false;
                    });
                });
            }
        });

        console.log("\n\n\nDev mode enabled, press '" + KEY.toUpperCase() + "' to create an admin user.\n\n");
      }
	  
    });
  })
  .catch(error => console.log("DB Connection Error: ", error));

//Jobs
new CronJob("0 0 1 * *", async () => {
  const sessions = await session.findAll();
  const currentDate = new Date();
  sessions.forEach(session => {
    let expiresDate = moment(session.createdAt, process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss').toDate();
    expiresDate.setDate(expiresDate.getDate() + parseInt(session.expires_in.replace('d', '')));
    
    const diff = expiresDate - currentDate;
    if(diff <= 0) session.update({ valid: false });
  });
}).start();

module.exports = {
  user,
  session,
  ticket,
  ticketMessage,
  plan,
  project,
  simulation
};