import "dotenv/config";
import { initFirebaseAdmin } from "./src/config/firebaseAdmin.js";
import app from "./src/app.js";

initFirebaseAdmin();

const port = Number(process.env.PORT) || 5000;

const server = app.listen(port, () => {
  console.log(`GreenTrip API listening on port ${port}`);
});

export default server;
