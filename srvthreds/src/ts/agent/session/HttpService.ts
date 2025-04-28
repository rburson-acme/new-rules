import http from 'http';
import express from 'express';
import { Request, Response, Express } from 'express';
import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import cors from 'cors';

const DEFAULT_PORT = 3000;

// @TODO - implement a real user store in MongoDB
export const handleLogin = async (req: Request<{}, any>, res: Response<any, any>) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }
  const user = { username: 'temp', password: 'temp' }; // find user
  if (!user) {
    return res.status(401).send('Invalid username or password.');
  }
  try {
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      res.send('temp_token'); // In a real app, you'd set a session or return a token
    } else {
      res.status(401).send('Invalid username or password.');
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Error logging in.');
  }
};

export class HttpService {
  httpServer: http.Server;

  constructor(private port?: number) {
    const app: Express = express();
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    // cors needs to be confgured more granularly here
    app.use(cors());

    app.post('/login', handleLogin);
    this.httpServer = http.createServer(app);
  }

  start() {
    /*const httpServer = https.createServer({
    key: fs.readFileSync(__dirname + '/config/privkey.pem'),
    cert: fs.readFileSync(__dirname + '/config/fullchain.pem'),
    ca: fs.readFileSync(__dirname + '/config/fullchain.pem')
  }, app);*/
    this.httpServer.listen(this.port || DEFAULT_PORT, () => {
      console.log(`LoginService is running on port ${this.port || DEFAULT_PORT}`);
    });
  }

  async shutdown(): Promise<void> {
    if (this.httpServer.listening) {
      return new Promise<void>((resolve, reject) => {
        this.httpServer.close((err) => {
          if (err) {
            console.error('Error shutting LoginService:', err);
            reject(err);
          } else {
            console.log('LoginService shutdown successful.');
            resolve();
          }
        });
      });
    }
  }
}
