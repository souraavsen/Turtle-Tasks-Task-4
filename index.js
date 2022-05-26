const express = require("express");
const app = express();
const { MongoClient } = require("mongodb");
const port = process.env.PORT || 5000;
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
// const swaggerJsDoc = require("swagger-jsdoc");
const swaggerDocs = require("./Swagger.json");
const swaggerUi = require("swagger-ui-express");
const { auth, requiresAuth } = require("express-openid-connect");

// Middlewares
const cors = require("cors");
app.use(cors());
app.use(express.json());

// const swaggerOptions = {
//   swaggerDefinition: {
//     info: {
//       version: "1.0.0",
//       title: "Turtle-Venture-Task API",
//       description: "Radio Station API Information",
//       contact: {
//         name: "Sourav Sen Gupts",
//       },
//       servers: ["http://localhost:5000"],
//     },
//   },
//   apis: ["index.js"],
// };

// const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(
  auth({
    authRequired: false,
    auth0Logout: true,
    issuerBaseURL: process.env.ISSUER_BASE_URL,
    baseURL: process.env.BASE_URL,
    clientID: process.env.CLIENT_ID,
    secret: process.env.SECRET,
  })
);

app.get("/", (req, res) => {
  res.send(
    req.oidc.isAuthenticated()
      ? `
      <div>
      <h4>Successfully LoggedIn in stations api</h4>
      <br />
      <a href="http://localhost:5000/profile">Profile</a>
      </div>
      `
      : "Logged Out"
  );
});

app.get("/profile", requiresAuth(), (req, res) => {
  const user = req.oidc.user;
  res.send(
    `<div>
      <h4>
        Hello, ${user.name} 
      </h4>
      <h5>Email: ${user.email}</h5>
      <img src=${user.picture} alt="Profile picture" />
    </div>`
  );
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wfxhs.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();

    const database = client.db("Turtle-Venture-Task");
    const useStationCollections = database.collection("Radio-Station");

    // Get All Station info
    app.get("/stations", async (req, res) => {
      const stations = await useStationCollections.find({}).toArray();
      res.send(stations);
    });

    // Station DETAILS
    app.get("/station/:id", async (req, res) => {
      const ID = req.params.id;
      const station = { _id: ObjectId(ID) };
      const stationDetails = await useStationCollections.findOne(station);
      res.send(stationDetails);
    });

    //POST Station info
    app.post("/add-station", async (req, res) => {
      console.log(req);
      const addStation = await useStationCollections.insertOne(req.body);
      console.log(addStation);
      res.json(addStation);
    });

    // Update Station info
    app.put("/update-station/:id", async (req, res) => {
      const filter = { _id: ObjectId(req.params.id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          station_name: req.body.station_name,
          freq: req.body.freq,
          img: req.body.img,
        },
      };
      const result = await useStationCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      console.log(result);
      res.send(result);
    });

    // // DELETE a Station info
    app.delete("/remove-station/:id", async (req, res) => {
      const stationId = req.params.id;
      const station = { _id: ObjectId(stationId) };
      const result = await useStationCollections.deleteOne(station);
      console.log("Delete station", result);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log("Server is running on port", port);
});
