var mongoose = require("mongoose");
const Schema = mongoose.Schema;
const sessionSchema = new Schema({
  sessionID: {
    type: String,
  },
  sessionStart: {
    type: Date,
    default: Date.now(),
  },

  sessionEnd: {
    type: Date,
  },
  messages: [
    {
      message: { type: String},
      timestamp: { type: Date, default: Date.now },
      role:{type:String}
    },
  ],
});
const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
