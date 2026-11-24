import 'dotenv/config';
import { app } from './app';

const PORT = Number(process.env.PORT) || 8787;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🤖 Khidmat Agent Server listening on port ${PORT}\n`);
  });
}

export default app;
