import { createClient, RedisClientType } from "redis";

class RedisClient {
  private client: RedisClientType;
  private readonly maxRetries = 10;
  private readonly retryInterval = 1000;
  private readonly username = "";
  private readonly password = "";
  private readonly host = "localhost";
  private readonly port = 6379;

  constructor() {
    this.client = createClient({
      socket: {
        host: this.host,
        port: this.port,
        reconnectStrategy: (retries: number) => {
          if (retries >= this.maxRetries) {
            console.error("Max reconnection attempts reached");
            this.disconnect();
            console.log("Disconnected from Redis");
            process.exit(1);
          }
          console.log(`Reconnection attempt ${retries}`);
          return this.retryInterval;
        },
      },
      username: this.username,
      password: this.password,
    });

    this.client.on("error", (err) =>
      console.error("Redis Client Error", err.message)
    );
    this.client.on("connect", () => console.log("Connected to Redis"));
    this.client.on("reconnecting", () =>
      console.log("Reconnecting to Redis...")
    );
    this.client.on("ready", () => console.log("Redis Client Ready"));

    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error(`An error occurred while connecting to Redis: ${error}`);
    }
  }

  public async setKey(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
    console.log(`Set key: ${key}`);
  }

  public async hashSetKey(
    key: string,
    field: string,
    value: string
  ): Promise<void> {
    await this.client.hSet(key, field, value);
    console.log(`Set key: ${key}, field: ${field}`);
  }

  public async setKeyWithExpiry(
    key: string,
    value: string,
    expiryInSeconds: number
  ): Promise<void> {
    await this.client.set(key, value, { EX: expiryInSeconds });
    console.log(`Set key: ${key} with expiry: ${expiryInSeconds} seconds`);
  }

  public async getKey(key: string): Promise<void> {
    const value = await this.client.get(key);
    console.log(`Got value for key ${key}: ${value}`);
  }

  public async deleteKey(key: string): Promise<void> {
    await this.client.del(key);
    console.log(`Deleted key: ${key}`);
  }

  public async hashGetKey(key: string, field: string): Promise<void> {
    const value = await this.client.hGet(key, field);
    console.log(`Got value for key ${key}, field ${field}: ${value}`);
  }

  public async hashDeleteKey(key: string, field: string): Promise<void> {
    await this.client.hDel(key, field);
    console.log(`Deleted key: ${key}, field: ${field}`);
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
    console.log("Disconnected from Redis");
  }
}

async function main() {
  const redis = new RedisClient();

  try {
    await redis.setKey("user", "John Doe");
    await redis.hashSetKey("users", "name", "John Doe");
    await redis.setKeyWithExpiry("tempUser", "Jane Doe", 60);
    await redis.getKey("user");
    await redis.hashGetKey("users", "name");
    await redis.getKey("tempUser");
    await redis.deleteKey("user");
    await redis.hashDeleteKey("users", "name");
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await redis.disconnect();
  }
}

main();
