const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const {  OpenAI } = require("openai");
const Sessions = require("./Models/Sessions.js");
require("dotenv").config();
const port = 5000;
const app = express();
app.use(express.json());
app.use(cors()); // Cors policy

// Configures bodyParser middleware to handle large JSON and URL-encoded request bodies with increased limits.
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 100000000,
  })
);

//Mongoose connection
mongoose.connect(
  process.env.URL,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  },
  (err) => {
    if (err) {
      throw err;
    }
    console.log("Mongoose ile bağlantı kuruldu.");
  }
);

//OpenAI API connection
const openai = new OpenAI({
  apiKey: process.env.DB_HOST,
});

// Defines a simple GET route that returns a JSON response to confirm the API is working.
app.get("/", async (req, res) => {
  res.json("API working");
});

// Handles the first message in a session by creating a thread, sending the user's message to OpenAI, waiting for the assistant's response, and returning the assistant's reply along with the thread ID.
app.post("/firstMessage", async (req, res) => {
  const { message } = req.body;
  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: message,
  });
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: "asst_c9wz76pXcbArXq63sym6Rni7",
  });

  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  while (runStatus.status !== "completed") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }
  const messages = await openai.beta.threads.messages.list(thread.id);

  while (runStatus.status !== "completed") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }
  const lastMessageForRun = messages.data
    .filter(
      (message) => message.run_id === run.id && message.role === "assistant"
    )
    .pop();
  addMessageToSessionUser(thread.id, message);
  await new Promise((resolve) => setTimeout(resolve, 3000));
  addMessageToSessionGPT(thread.id, lastMessageForRun.content[0].text.value);

  res.json({
    message: lastMessageForRun.content[0].text.value,
    thread_id: thread.id,
  });
});

// Processes subsequent messages in a session, sends them to OpenAI, waits for the assistant's response, and returns the reply.
app.post("/otherMessages", async (req, res) => {
  const { tThread, message } = req.body;
  await openai.beta.threads.messages.create(tThread, {
    role: "user",
    content: message,
  });
  const run = await openai.beta.threads.runs.create(tThread, {
    assistant_id: "asst_c9wz76pXcbArXq63sym6Rni7",
  });

  let runStatus = await openai.beta.threads.runs.retrieve(tThread, run.id);
  while (runStatus.status !== "completed") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    runStatus = await openai.beta.threads.runs.retrieve(tThread, run.id);
  }
  const messages = await openai.beta.threads.messages.list(tThread);

  const lastMessageForRun = messages.data
    .filter(
      (message) => message.run_id === run.id && message.role === "assistant"
    )
    .pop();
  // If an assistant message is found, console.log() it
  addMessageToSessionUser(tThread, message);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  addMessageToSessionGPT(tThread, lastMessageForRun.content[0].text.value);
  res.json({ message: lastMessageForRun.content[0].text.value });
});

// Closes the session by updating the session's end time in the database if the session exists.
app.post("/sessionClosed", async (req, res) => {
  const { tThread } = req.body;
  console.log("close")
  let session = await Sessions.findOne({
    sessionID: tThread,
  });
  if (session) {
    await Sessions.findOneAndUpdate(
      { sessionID: tThread },
      {
        sessionEnd: Date.now(),
      }
    );
    res.json("ok");
  }
});
// Adds a GPT message to the session, creating a new session if it doesn't exist.
const addMessageToSessionGPT = async (sessionId, newMessage) => {
  try {
    // İlk önce oturumun var olup olmadığını kontrol et
    let session = await Sessions.findOne({ sessionID: sessionId });

    if (session) {
      // Oturum varsa, sadece mesajı ekle
      session.messages.push({
        message: newMessage,
        role: "gpt",
      });
      await session.save();
      console.log("Mesaj mevcut oturuma eklendi:", session);
    } else {
      // Oturum yoksa, create() ile yeni bir oturum oluştur
      session = await Sessions.create({
        sessionID: sessionId,
        sessionStart: Date.now(),
        messages: [{ message: newMessage, role: "gpt" }],
      });
      console.log("Yeni oturum oluşturuldu ve mesaj eklendi:", session);
    }
  } catch (error) {
    console.error("Mesaj eklenirken hata oluştu:", error);
  }
};


// Adds a user message to the session, creating a new session if it doesn't exist.
const addMessageToSessionUser = async (sessionId, newMessage) => {
  try {
    let session = await Sessions.findOne({ sessionID: sessionId });
    if (session) {
      session.messages.push({
        message: newMessage,
        role: "user",
      });
      await session.save();
      console.log("Mesaj mevcut oturuma eklendi:", session);
    } else {
      session = await Sessions.create({
        sessionID: sessionId,
        sessionStart: Date.now(),
        messages: [{ message: newMessage, role: "user" }],
      });
      console.log("Yeni oturum oluşturuldu ve mesaj eklendi:", session);
    }
  } catch (error) {
    console.error("Mesaj eklenirken hata oluştu:", error);
  }
};

// Starts the server on defined port and logs a message indicating that the server is running.
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});