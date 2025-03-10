const {PrismaClient} = require("@prisma/client")
const db = new PrismaClient

let quizController = {
  list: async (req, res) => {
    const reminder = await db.reminder.findMany({
      where: {
        userId: req.user.id
      }
    })
    res.render("reminder/index", { reminders: reminder });
  },

  new: (req, res) => {
    res.render("reminder/create");
  },

  listOne: async (req, res) => {
    let reminderToFind = req.params.id
    let searchResult = await db.reminder.findUnique({
      where: {
        id: parseInt(reminderToFind)
      }
    });
    if (searchResult != undefined) {
      res.render("reminder/single-reminder", { reminderItem: searchResult });
    } else {
      res.render("reminder/index", { reminders: req.user.reminders });
    }
  },

  create: async (req, res) => {
    await db.reminder.create({
      data: {
        title: req.body.title,
        description: req.body.description,
        completed: false,
        user: {connect: {id: req.user.id}}
      }
    })
    res.redirect("/reminders");
  },

  edit: async (req, res) => {
    let reminderToFind = req.params.id
    let searchResult = await db.reminder.findUnique({
      where: {
        id: parseInt(reminderToFind)
      }
    });
    res.render("reminder/edit", { reminderItem: searchResult });
  },

  update: async(req, res) => {
    let reminderToFind = req.params.id
    let complete = false;
    if (req.body.completed ===  "true") {
      complete = true
    }
    await db.reminder.update({
      where: {
        id: parseInt(reminderToFind)
      },
      data: {
        title: req.body.title,
        description: req.body.description,
        completed: complete
      }
    })
    res.redirect("/reminders");
  },

  delete: async (req, res) => {
    let reminderToFind = req.params.id;
    await db.reminder.delete({
      where: {
        id: parseInt(reminderToFind)
      }
    })
    res.redirect('/reminders');
  }}

module.exports = quizController;
