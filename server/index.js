import 'dotenv/config';
import app from '../api/index.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Attendance server running on http://localhost:${PORT}`);
});