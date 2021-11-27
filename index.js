//Importing requirements
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const ObjectId = require("mongodb").ObjectId;
const app = express();
const port = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

// Firebase admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Function for verifying JWT
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodedUser.email;
    } catch {}
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
      const category = req.query.category;
      if (req.decodedUserEmail === email) {
        let query = {};
        if (category) {
          query = { email: email, category: category };
        } else {
          query = { email: email };
        }
        const cursor = noteCollection.find(query);
        const notes = await cursor.toArray();
        res.json(notes);
      } else {
        res.status(401).send("User unauthorized");
      }
    });

    //POST API
    app.post("/notes", async (req, res) => {
      const newNote = req.body;
      const result = await noteCollection.insertOne(newNote);
      res.json(result);
    });

    //FIND API
    app.get("/notes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const note = await noteCollection.findOne(query);
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
          modifiedAt: updateNote.modifiedAt,
        },
      };
      const result = await noteCollection.updateOne(filter, updateDoc, option);
      res.json(result);
    });

    //DELETE API
    app.delete("/notes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await noteCollection.deleteOne(query);
      res.json(result);
    });

    //Find All Favourites
    app.get("/favourites", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = favouriteCollection.find(query);
      const favourites = await cursor.toArray();
      res.json(favourites);
    });

    // Find Favourite Notes
    app.get("/favourites/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await favouriteCollection.findOne(query);
      res.json(result);
    });

    //Storing Favourite Notes
    app.post("/favourites", async (req, res) => {
      const favourite = req.body;
      const result = await favouriteCollection.insertOne(favourite);
      res.json(result);
    });

    //Deleting from favourites
    app.delete("/favourites/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await favouriteCollection.deleteOne(query);
      res.json(result);
    });
  } finally {
  }
}

run().catch(console.dir);

//Primary endpoint
app.get("/", (req, res) => {
  res.send("Nanote Server is working!");
});

//Listening to the port
app.listen(port, () => {
  console.log("Listening at the port", port);
});
