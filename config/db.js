const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop the problematic 'id_1' index if it exists
    try {
      const Event = mongoose.connection.collection("events");
      const indexes = await Event.indexes();
      const hasIdIndex = indexes.some((idx) => idx.name === "id_1");
      console.log("hasIdIndex:", hasIdIndex);
    } catch (indexError) {
      // Index might not exist or already dropped, that's okay
      if (indexError.code !== 27) {
        // 27 = IndexNotFound
        console.warn("Could not drop id_1 index:", indexError.message);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
