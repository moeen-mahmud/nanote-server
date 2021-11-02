//Importing requirements
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const ObjectId = require("mongodb").ObjectId;
const app = express();
const port = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin
var serviceAccount = require("./nanote-moeen-firebase-adminsdk-nzw53-5acb1929f8.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Verifying user
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodedUser.email;
    } catch (error) {
      console.log(error);
    }
  }
  next();
}

//Mongo Client
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@nanotecluster.xaaaj.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    client.connect();
    const database = client.db("noteData");
    const noteCollection = database.collection("notes");
    const favouriteCollection = database.collection("favourites");

    //GET API
    app.get("/notes", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.decodedUserEmail === email) {
        const query = { email: email };
        const cursor = noteCollection.find(query);
        const notes = await cursor.toArray();
        res.json(notes);
      } else {
        res.status(401).send("User is not authorized");
      }
    });

    //POST API
    app.post("/notes", async (req, res) => {
      const newNote = req.body;
      const result = await noteCollection.insertOne(newNote);
      console.log("New note inserted with id", result.insertedId);
      res.json(result);
    });

    //FIND API
    app.get("/notes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const note = await noteCollection.findOne(query);
      console.log("Finding note", note);
      res.json(note);
    });

    //PUT API
    app.put("/notes/:id", async (req, res) => {
      const id = req.params.id;
      const updateNote = req.body;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          title: updateNote.title,
          details: updateNote.details,
          category: updateNote.category,
        },
      };
      const result = await noteCollection.updateOne(filter, updateDoc, option);
      console.log("Updated note", result);
      res.json(result);
    });

    //DELETE API
    app.delete("/notes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await noteCollection.deleteOne(query);
      console.log("Deleting the note", result);
      res.json(result);
    });

    //Find All Favourites
    app.get("/favourites", async (req, res) => {
      const cursor = favouriteCollection.find({});
      const favourites = await cursor.toArray();
      res.json(favourites);
    });

    // Find Favourite Notes
    app.get("/favourites/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await favouriteCollection.findOne(query);
      console.log("Finding notes from favs", result);
      res.json(result);
    });

    //Storing Favourite Notes
    app.post("/favourites", async (req, res) => {
      const favourite = req.body;
      const result = await favouriteCollection.insertOne(favourite);
      console.log("Favourite Note Inserted", result);
      res.json(result);
    });

    //Deleting from favourites
    app.delete("/favourites/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await favouriteCollection.deleteOne(query);
      console.log("Removed item from favourite", result);
      res.json(result);
    });
  } finally {
  }
}

run().catch(console.dir);

//Heroku endpoint testing
app.get("/test", (req, res) => {
  res.send("Hello from Heroku");
});

//Primary endpoint
app.get("/", (req, res) => {
  res.send("Nanote Server is working!");
});

//Listening to the port
app.listen(port, () => {
  console.log("Listening at the port", port);
});
