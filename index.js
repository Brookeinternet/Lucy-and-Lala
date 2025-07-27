// Converted from Firebase Functions to Express for Render

import express from "express";

const app = express();

// Equivalent to exports.myApiEndpoint = onRequest(...)
app.get("/myApiEndpoint", (req, res) => {
  res.send("Hello from your API!");
});

// Equivalent to exports.anotherFunction = onRequest(...)
app.get("/anotherFunction", (req, res) => {
  console.info("Function 'anotherFunction' was called!"); // Use console for logging
  console.warn("This is a warning message."); // Another example
  res.send("Function executed!");
});

// You may want to set max instances via Render's settings or environment, not in code

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
