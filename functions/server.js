// server.js
const app = require('./app'); // Import your Express app
const PORT = process.env.PORT || 3000; // Use environment variable for port or default to 3000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
