import { createClient } from "redis";
import express from "express";

class RedisClient {
  constructor() {
    this.client = createClient({
      socket: {
        host: "localhost",
        port: 6379,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return null;
          }
          return 1000;
        },
      },
      username: "",
      password: "",
      db: 0,
    });

    this.client.on("error", (error) => {
      console.error("Error connecting to Redis", error);
    });
  }

  async connect() {
    await this.client.connect();
  }

  async set(key, value, options = {}) {
    return await this.client.set(key, value, options);
  }

  async get(key) {
    return await this.client.get(key);
  }

  async delete(key) {
    return await this.client.del(key);
  }

  async quit() {
    await this.client.quit();
  }
}

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.redisClient = new RedisClient();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.app.get("/get-all", this.getAll.bind(this));
    this.app.post("/set", this.set.bind(this));
    this.app.get("/get/:key", this.get.bind(this));
    this.app.delete("/delete", this.delete.bind(this));
  }

  async getAll(req, res) {
    await this.redisClient.connect();
    const keys = await this.redisClient.client.keys("*");
    const values = await Promise.all(
      keys.map((key) => this.redisClient.get(key))
    );
    await this.redisClient.quit();
    const response = keys.reduce((acc, key, index) => {
      acc[key] = values[index];
      return acc;
    }, {});
    res.send(response);
  }

  async set(req, res) {
    const { key, value, options } = req.body;
    await this.redisClient.connect();
    await this.redisClient.set(key, value, options);
    await this.redisClient.quit();
    res.send("Value set successfully");
  }

  async get(req, res) {
    const { key } = req.params;
    await this.redisClient.connect();
    const value = await this.redisClient.get(key);
    await this.redisClient.quit();
    res.send(value);
  }

  async delete(req, res) {
    const { key } = req.query;
    await this.redisClient.connect();
    await this.redisClient.delete(key);
    await this.redisClient.quit();
    res.send("Value deleted successfully");
  }

  listen(port) {
    this.app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
}

const appInstance = new App();
appInstance.listen(3000);
