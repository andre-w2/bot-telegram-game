require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const { againOptions, gameOptions } = require("./options");
const sequelize = require("./db");
const UserModel = require("./models/user");

const bot = new TelegramBot(process.env.TOKEN, { polling: true });
const db = {};

const startGames = async (chatId) => {
  await bot.sendMessage(chatId, "Начинаем игру! Отгадайте число от 0 до 9");
  const randomNumber = Math.floor(Math.random() * 9);
  db[chatId] = randomNumber;

  await bot.sendMessage(chatId, "Число загадал! Отгадывай!)", gameOptions);
};

const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
  } catch (error) {
    console.log("Подключение к базе данных не удалось", error);
  }

  bot.setMyCommands([
    { command: "/start", description: "Старт бота" },
    { command: "/info", description: "Информации о тебе" },
    { command: "/games", description: "Начать игру с ботом" },
  ]);

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    try {
      if (text === "/start") {
        await UserModel.create({ chatId });
        return bot.sendMessage(
          chatId,
          `Добро пожаловать ${msg.chat.username}!`
        );
      }

      if (text === "/info") {
        const user = await UserModel.findOne({ chatId });
        return bot.sendMessage(
          chatId,
          `Информация! Выиграл: ${user.right}, Проиграл: ${user.wrong}`
        );
      }

      if (text === "/games") {
        return startGames(chatId);
      }

      return bot.sendMessage(chatId, "Я не понимаю тебя!");
    } catch (error) {
      console.log(error);
      return bot.sendMessage(chatId, "Произошла ошибка!");
    }
  });

  bot.on("callback_query", async (msg) => {
    const data = msg.data;
    const chatId = msg.message.chat.id;

    if (data === "/again") {
      return startGames(chatId);
    }

    const user = await UserModel.findOne({ chatId });

    if (parseInt(data) === db[chatId]) {
      user.right += 1;
      await bot.sendMessage(
        chatId,
        `Ура! Вы выиграли ${db[chatId]}`,
        againOptions
      );
    } else {
      user.wrong += 1;

      await bot.sendMessage(
        chatId,
        `К сожалению! Вы проиграли, число: ${db[chatId]}`,
        againOptions
      );
    }

    await user.save();
  });
};

start();
